import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

// 型とユーティリティのインポート
import { styles } from "../../components/utils/styles";
import { Post, Reply } from "../../components/utils/types";
import { saveLocationToFirestore } from "../../services/locationService";
import {
  getNearbyPosts,
  savePostToFirestore,
  updatePostReaction,
} from "../../services/postService";
import { getPersistentUserId } from "../../services/userService";

// 使うリアクションの種類をここで定義します
const reactionImages: { [key: string]: any } = {
  "1": require("../../assets/images/face1.png"),
  "2": require("../../assets/images/face2.png"),
  "3": require("../../assets/images/face3.png"),
  "4": require("../../assets/images/face4.png"),
  "5": require("../../assets/images/face5.png"),
  "6": require("../../assets/images/face6.png"),
};

// リアクション画像の安全な取得関数
const getReactionImage = (emoji: string) => {
  if (reactionImages[emoji]) {
    return reactionImages[emoji];
  }
  // フォールバック画像（最初の画像を使用）
  return reactionImages["1"];
};

const { height } = Dimensions.get("window");

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [messageListVisible, setMessageListVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState({
    content: "",
  });
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set()
  );
  const [replyMode, setReplyMode] = useState<string | null>(null);
  const [newReply, setNewReply] = useState({
    content: "",
  });
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [reactionPickerTarget, setReactionPickerTarget] = useState<{
    postId: string;
    isReply: boolean;
    replyId?: string;
  } | null>(null);
  // const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [isLocationTracking, setIsLocationTracking] = useState(false);

  // アニメーション用の値（初期値は画面外の下に設定）
  const slideAnim = useRef(new Animated.Value(height * 0.5)).current;
  // MapViewのref
  const mapRef = useRef<MapView>(null); // 位置情報取得のインターバル参照
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  useEffect(() => {
    // 永続的なユーザーIDを取得
    const initializeUserId = async () => {
      const userId = await getPersistentUserId();
      setCurrentUserId(userId);
      console.log("現在のユーザーID:", userId);

      // デフォルトの投稿内容を空に設定
      setNewPost({ content: "" });
      setNewReply({ content: "" });
    };

    initializeUserId();

    // 位置情報取得と保存の処理
    const initializeLocationTracking = async () => {
      // 1分おきに位置情報を取得してFirestoreに保存する関数
      const startLocationTracking = () => {
        setIsLocationTracking(true);
        console.log("位置情報の定期取得を開始しました（1分間隔）");

        locationIntervalRef.current = setInterval(async () => {
          try {
            console.log("定期取得：位置情報を取得中...");
            const savedLocation = await saveLocationToFirestore(currentUserId);

            if (savedLocation) {
              // 現在地を更新
              console.log("定期取得：現在地を再取得中...");
              const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
              });
              setLocation(currentLocation);

              // 周辺の投稿を取得して表示
              console.log("周辺投稿を取得中...");
              const nearbyPosts = await getNearbyPosts(
                currentLocation.coords.latitude,
                currentLocation.coords.longitude,
                1.0 // 1km圏内
              );

              if (nearbyPosts.length > 0) {
                console.log(`周辺投稿を${nearbyPosts.length}件取得しました`);
                // Firestoreから取得した投稿をローカルの投稿リストと統合
                const convertedPosts = nearbyPosts.map((firestorePost) => {
                  // Firestoreのリアクション情報を変換
                  const reactions: { [userID: string]: string } = {};
                  const reactionCounts: { [emoji: string]: number } = {};

                  if (
                    firestorePost.reactions &&
                    typeof firestorePost.reactions === "object"
                  ) {
                    Object.entries(firestorePost.reactions).forEach(
                      ([emoji, data]: [string, any]) => {
                        if (
                          data &&
                          data.userIds &&
                          Array.isArray(data.userIds)
                        ) {
                          reactionCounts[emoji] =
                            data.count || data.userIds.length;
                          // 各ユーザーの反応を記録
                          data.userIds.forEach((userId: string) => {
                            reactions[userId] = emoji;
                          });
                        }
                      }
                    );
                  }

                  return {
                    id: firestorePost.id,
                    content: firestorePost.text,
                    author: `User-${firestorePost.userID.slice(-6)}`, // ユーザーIDベースの表示名
                    location: {
                      latitude: firestorePost.coordinates.latitude,
                      longitude: firestorePost.coordinates.longitude,
                    },
                    timestamp: firestorePost.timestamp,
                    parentPostID: firestorePost.parentPostID, // 親投稿IDを含める
                    reactions: reactions,
                    reactionCounts: reactionCounts,
                    replies: [], // 返信は別途取得する場合
                  };
                });

                // 既存の投稿を更新または新しい投稿を追加
                setPosts((prevPosts) => {
                  const updatedPosts = [...prevPosts];
                  let hasNewPosts = false;

                  convertedPosts.forEach((newPost) => {
                    const existingPostIndex = updatedPosts.findIndex(
                      (p) => p.id === newPost.id
                    );
                    if (existingPostIndex >= 0) {
                      // 既存の投稿を更新（リアクション情報など）
                      updatedPosts[existingPostIndex] = {
                        ...updatedPosts[existingPostIndex],
                        reactions: newPost.reactions,
                        reactionCounts: newPost.reactionCounts,
                      };
                    } else {
                      // 新しい投稿を追加
                      updatedPosts.unshift(newPost);
                      hasNewPosts = true;
                    }
                  });

                  if (hasNewPosts) {
                    console.log(`新しい投稿が追加されました`);
                  }

                  return updatedPosts;
                });
              } else {
                console.log("周辺に新しい投稿はありません");
              }

              console.log("定期取得：位置情報を保存しました");
            } else {
              console.error("定期取得：位置情報の保存に失敗しました");
            }
          } catch (error) {
            console.error("位置情報の定期取得でエラーが発生しました:", error);
          }
        }, 5000); // 60秒（1分）間隔
      };

      try {
        console.log("位置情報の許可を要求中...");
        let { status } = await Location.requestForegroundPermissionsAsync();
        console.log("位置情報の許可ステータス:", status);

        if (status !== "granted") {
          Alert.alert("エラー", "位置情報の許可が必要です");
          return;
        }

        console.log("現在地を取得中...");
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        console.log("位置情報取得成功:", currentLocation.coords);
        setLocation(currentLocation);

        // 初回の位置情報をFirestoreに保存
        console.log("Firestoreに位置情報を保存中...");
        const savedLocation = await saveLocationToFirestore(currentUserId);
        if (savedLocation) {
          console.log("初回位置情報を保存しました");
        } else {
          console.error("初回位置情報の保存に失敗しました");
        }

        // 初回の周辺投稿取得
        console.log("初回：周辺投稿を取得中...");
        const initialNearbyPosts = await getNearbyPosts(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          1.0 // 1km圏内
        );

        if (initialNearbyPosts.length > 0) {
          console.log(
            `初回：周辺投稿を${initialNearbyPosts.length}件取得しました`
          );
          // Firestoreから取得した投稿をローカルの投稿リストに設定
          const convertedPosts = initialNearbyPosts.map((firestorePost) => {
            // Firestoreのリアクション情報を変換
            const reactions: { [userID: string]: string } = {};
            const reactionCounts: { [emoji: string]: number } = {};

            if (
              firestorePost.reactions &&
              typeof firestorePost.reactions === "object"
            ) {
              Object.entries(firestorePost.reactions).forEach(
                ([emoji, data]: [string, any]) => {
                  if (data && data.userIds && Array.isArray(data.userIds)) {
                    reactionCounts[emoji] = data.count || data.userIds.length;
                    // 各ユーザーの反応を記録
                    data.userIds.forEach((userId: string) => {
                      reactions[userId] = emoji;
                    });
                  }
                }
              );
            }

            return {
              id: firestorePost.id,
              content: firestorePost.text,
              author: `User-${firestorePost.userID.slice(-6)}`, // ユーザーIDベースの表示名
              location: {
                latitude: firestorePost.coordinates.latitude,
                longitude: firestorePost.coordinates.longitude,
              },
              timestamp: firestorePost.timestamp,
              parentPostID: firestorePost.parentPostID, // 親投稿IDを含める
              reactions: reactions,
              reactionCounts: reactionCounts,
              replies: [], // 返信は別途取得する場合
            };
          });
          setPosts(convertedPosts);
        } else {
          console.log("初回：周辺に投稿はありません");
        }

        // 1分おきの位置情報取得を開始
        startLocationTracking();
      } catch (error) {
        console.error("位置情報取得処理でエラーが発生しました:", error);
        Alert.alert(
          "エラー",
          "位置情報の取得に失敗しました: " +
            (error instanceof Error ? error.message : String(error))
        );
      }
    };

    // ユーザーIDが設定された後に位置情報処理を開始
    if (currentUserId) {
      initializeLocationTracking();
    }

    // コンポーネントがアンマウントされるときにインターバルをクリア
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, [currentUserId]); // currentUserIdが設定されたときに実行
  // テスト用の投稿を追加（最初の位置情報取得時のみ）
  useEffect(() => {
    if (location && posts.length === 0) {
      // postsが空の場合のみ実行
      const testPost: Post = {
        id: "test-1",
        content: "これはテスト投稿です。",
        author: "テストユーザー",
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        timestamp: new Date(),
        replies: [],
        reactions: {},
        reactionCounts: {},
      };
      setPosts([testPost]);
    }
  }, [location, posts.length]);

  // キーボードイベントリスナー
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);
  const handleCreatePost = async () => {
    if (!newPost.content.trim()) {
      Alert.alert("エラー", "投稿内容を入力してください");
      return;
    }

    if (!location) {
      Alert.alert("エラー", "位置情報が取得できません");
      return;
    }

    try {
      console.log("投稿作成開始 - UserID:", currentUserId);

      // Firestoreに投稿を保存（ID, coordinates, geohash, text, photoURL, timestamp, userID, parentPostID, reactions を含む）
      const postId = await savePostToFirestore({
        text: newPost.content,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        photoURL: undefined, // 後で画像アップロード機能を追加
      });

      if (postId) {
        console.log("投稿保存成功 - PostID:", postId);

        // ローカルの投稿リストにも追加（UIの即座更新のため）
        const post: Post = {
          id: postId,
          content: newPost.content,
          author: `User-${currentUserId.slice(-6)}`, // ユーザーIDベースの作成者名
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          timestamp: new Date(),
          parentPostID: undefined, // 新規投稿は親投稿なのでundefined
          reactions: {},
          reactionCounts: {},
        };

        setPosts([post, ...posts]); // 新しい投稿を先頭に追加
        setNewPost({ content: "" }); // 内容をクリア
        setModalVisible(false);
        Alert.alert("成功", "投稿が作成されました！");
      } else {
        Alert.alert("エラー", "投稿の保存に失敗しました");
      }
    } catch (error) {
      console.error("投稿作成エラー:", error);
      Alert.alert("エラー", "投稿の作成に失敗しました");
    }
  };
  const handleCancelPost = () => {
    setNewPost({ content: "" });
    setModalVisible(false);
  };
  const handleMarkerPress = (post: Post) => {
    setSelectedLocation(post.location);
    setMessageListVisible(true);

    // マップの位置を調整：マップ全体を下に移動して投稿位置を画面上部に表示
    // メッセージリストが画面の下半分を占めるので、マップの中心を北（上）に移動
    const offsetLatitude = -0.001; // 緯度のオフセット（北に移動してマップ全体を下げる）
    mapRef.current?.animateToRegion(
      {
        latitude: post.location.latitude + offsetLatitude,
        longitude: post.location.longitude,
        latitudeDelta: 0.002, // 約200m範囲（高倍率）
        longitudeDelta: 0.002, // 約200m範囲（高倍率）
      },
      1000
    );

    // 下から上にスライドインアニメーション
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };
  const handleCloseMessageList = () => {
    // マップを現在地中心に戻す
    if (location) {
      mapRef.current?.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01, // 通常表示（約1km範囲）
          longitudeDelta: 0.01, // 通常表示（約1km範囲）
        },
        1000
      );
    }

    // 上から下にスライドアウトアニメーション
    Animated.timing(slideAnim, {
      toValue: height * 0.5,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setMessageListVisible(false);
      setSelectedLocation(null);
    });
  };

  const getPostsForLocation = () => {
    if (!selectedLocation) return [];
    // 選択された場所の近くの投稿を取得（半径1km以内など）
    const nearbyPosts = posts.filter((post) => {
      const distance = Math.sqrt(
        Math.pow(post.location.latitude - selectedLocation.latitude, 2) +
          Math.pow(post.location.longitude - selectedLocation.longitude, 2)
      );
      return distance < 0.01; // 約1km
    });

    // 親投稿のみを返す（parentPostIDがないもの）
    return nearbyPosts.filter((post) => !post.parentPostID);
  };

  /**
   * 指定された親投稿IDのリプライを取得
   */
  const getRepliesForPost = (parentPostId: string) => {
    if (!selectedLocation) return [];

    // 選択された場所の近くの投稿から、指定された親投稿のリプライのみを取得
    const nearbyPosts = posts.filter((post) => {
      const distance = Math.sqrt(
        Math.pow(post.location.latitude - selectedLocation.latitude, 2) +
          Math.pow(post.location.longitude - selectedLocation.longitude, 2)
      );
      return distance < 0.01; // 約1km
    });

    // parentPostIDが一致するリプライのみを返す
    return nearbyPosts.filter((post) => post.parentPostID === parentPostId);
  };

  const toggleReplies = (postId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedReplies(newExpanded);
  };
  const handleReplySubmit = async (postId: string) => {
    if (!newReply.content.trim()) {
      Alert.alert("エラー", "返信内容を入力してください");
      return;
    }

    if (!location) {
      Alert.alert("エラー", "位置情報が取得できません");
      return;
    }

    try {
      console.log(
        "返信作成開始 - UserID:",
        currentUserId,
        "ParentPostID:",
        postId
      );

      // Firestoreに返信を保存（ID, coordinates, geohash, text, photoURL, timestamp, userID, parentPostID, reactions を含む）
      const replyId = await savePostToFirestore({
        text: newReply.content,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        parentPostID: postId, // 親投稿IDを指定
        photoURL: undefined,
      });

      if (replyId) {
        console.log("返信保存成功 - ReplyID:", replyId);

        // ローカルの投稿リストにも反映（UIの即座更新のため）
        const reply: Reply = {
          id: replyId,
          content: newReply.content,
          author: `User-${currentUserId.slice(-6)}`, // ユーザーIDベースの作成者名
          timestamp: new Date(),
          reactions: {},
          reactionCounts: {},
        };

        setPosts(
          posts.map((post) => {
            if (post.id === postId) {
              return {
                ...post,
                replies: [...(post.replies || []), reply],
              };
            }
            return post;
          })
        );

        // 入力フィールドをクリアしてキーボードを閉じる
        setNewReply({ content: "" }); // 内容をクリア
        setReplyMode(null);
        Keyboard.dismiss();
        Alert.alert("成功", "返信が投稿されました！");
      } else {
        Alert.alert("エラー", "返信の保存に失敗しました");
      }
    } catch (error) {
      console.error("返信作成エラー:", error);
      Alert.alert("エラー", "返信の作成に失敗しました");
    }
  };

  const handleReaction = async (
    postId: string,
    pickerLabel: string,
    isReply: boolean = false,
    replyId?: string
  ) => {
    try {
      console.log(
        `リアクション処理開始: PostID=${postId}, Emoji=${pickerLabel}`
      );

      // Firestoreに保存
      const success = await updatePostReaction(postId, pickerLabel);

      if (!success) {
        Alert.alert("エラー", "リアクションの更新に失敗しました");
        return;
      }

      // ローカルの投稿リストも更新（UIの即座更新のため）
      setPosts(
        posts.map((post) => {
          if (post.id === postId) {
            const reactions = { ...(post.reactions || {}) };
            const reactionCounts = { ...(post.reactionCounts || {}) };

            // 既存のリアクションを確認
            const currentReaction = reactions[currentUserId];

            if (currentReaction === pickerLabel) {
              // 同じ絵文字の場合は削除
              delete reactions[currentUserId];
              reactionCounts[pickerLabel] = Math.max(
                0,
                (reactionCounts[pickerLabel] || 0) - 1
              );
              if (reactionCounts[pickerLabel] === 0) {
                delete reactionCounts[pickerLabel];
              }
            } else {
              // 異なる絵文字または新規の場合
              if (currentReaction) {
                // 既存のリアクションを減らす
                reactionCounts[currentReaction] = Math.max(
                  0,
                  (reactionCounts[currentReaction] || 0) - 1
                );
                if (reactionCounts[currentReaction] === 0) {
                  delete reactionCounts[currentReaction];
                }
              }
              // 新しいリアクションを追加
              reactions[currentUserId] = pickerLabel;
              reactionCounts[pickerLabel] =
                (reactionCounts[pickerLabel] || 0) + 1;
            }

            return {
              ...post,
              reactions,
              reactionCounts,
            };
          }
          return post;
        })
      );

      // リアクション更新後、最新の投稿データを取得して同期
      if (location) {
        try {
          console.log("リアクション後の投稿データ同期中...");
          const updatedNearbyPosts = await getNearbyPosts(
            location.coords.latitude,
            location.coords.longitude,
            1.0
          );

          // Firestoreから取得した最新データでローカル状態を更新
          if (updatedNearbyPosts.length > 0) {
            const convertedPosts = updatedNearbyPosts.map((firestorePost) => {
              // Firestoreのリアクション情報を変換
              const reactions: { [userID: string]: string } = {};
              const reactionCounts: { [emoji: string]: number } = {};

              if (
                firestorePost.reactions &&
                typeof firestorePost.reactions === "object"
              ) {
                Object.entries(firestorePost.reactions).forEach(
                  ([emoji, data]: [string, any]) => {
                    if (data && data.userIds && Array.isArray(data.userIds)) {
                      reactionCounts[emoji] = data.count || data.userIds.length;
                      // 各ユーザーの反応を記録
                      data.userIds.forEach((userId: string) => {
                        reactions[userId] = emoji;
                      });
                    }
                  }
                );
              }

              return {
                id: firestorePost.id,
                content: firestorePost.text,
                author: `User-${firestorePost.userID.slice(-6)}`,
                location: {
                  latitude: firestorePost.coordinates.latitude,
                  longitude: firestorePost.coordinates.longitude,
                },
                timestamp: firestorePost.timestamp,
                parentPostID: firestorePost.parentPostID,
                reactions: reactions,
                reactionCounts: reactionCounts,
                replies: [],
              };
            });

            // 既存の投稿を更新（リアクション情報のみ）
            setPosts((prevPosts) => {
              const updatedPosts = [...prevPosts];

              convertedPosts.forEach((newPost) => {
                const existingPostIndex = updatedPosts.findIndex(
                  (p) => p.id === newPost.id
                );
                if (existingPostIndex >= 0) {
                  updatedPosts[existingPostIndex] = {
                    ...updatedPosts[existingPostIndex],
                    reactions: newPost.reactions,
                    reactionCounts: newPost.reactionCounts,
                  };
                }
              });

              return updatedPosts;
            });
            console.log("リアクション後の同期完了");
          }
        } catch (syncError) {
          console.error("リアクション後の同期エラー:", syncError);
          // 同期に失敗してもローカル更新は継続
        }
      }

      console.log("リアクション処理完了");
    } catch (error) {
      console.error("リアクション処理エラー:", error);
      Alert.alert("エラー", "リアクションの処理に失敗しました");
    }
  };

  const showReactionPicker = (
    postId: string,
    isReply: boolean = false,
    replyId?: string
  ) => {
    setReactionPickerTarget({ postId, isReply, replyId });
    setReactionPickerVisible(true);
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>地域共生アプリ</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: isLocationTracking ? "#4CAF50" : "#FFC107",
              marginRight: 8,
            }}
          />
          <Text style={{ fontSize: 12, color: "#666" }}>
            {isLocationTracking ? "位置追跡中" : "待機中"}
          </Text>
        </View>
      </View>
      {location ? (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.01, // 初期表示は少し広めに設定（約1km範囲）
              longitudeDelta: 0.01, // 初期表示は少し広めに設定（約1km範囲）
            }}
            // コメントリスト表示時はマップ操作を無効化
            scrollEnabled={!messageListVisible}
            zoomEnabled={!messageListVisible}
            rotateEnabled={!messageListVisible}
            pitchEnabled={!messageListVisible}
            moveOnMarkerPress={!messageListVisible}
            onTouchStart={() => {
              // コメントリスト表示時はマップタッチを無効化
              if (messageListVisible) {
                return false;
              }
            }}
          >
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="現在地"
              description="あなたの現在位置"
              pinColor="blue"
            />
            {posts.map((post) => (
              <Marker
                key={post.id}
                coordinate={post.location}
                title={
                  post.content.length > 20
                    ? post.content.substring(0, 20) + "..."
                    : post.content
                }
                description={`${post.content.substring(0, 50)}...`}
                onPress={() => handleMarkerPress(post)}
              />
            ))}
          </MapView>
          {/* コメントリスト表示時のマップ操作防止オーバーレイ */}
          {messageListVisible && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "transparent",
                zIndex: 999,
              }}
              pointerEvents="none" // マップのタッチを無効化
            />
          )}
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>位置情報を取得中...</Text>
        </View>
      )}
      {/* メッセージリストエリア */}
      {messageListVisible && (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          <Animated.View
            style={[
              styles.messageListContainer,
              {
                transform: [{ translateY: slideAnim }],
                marginBottom: keyboardHeight > 0 ? keyboardHeight - 100 : 0,
              },
            ]}
          >
            {/* ハンドルバー */}
            <TouchableOpacity onPress={handleCloseMessageList}>
              <View style={styles.handleBar} />
            </TouchableOpacity>

            {/* ヘッダー */}
            <View style={styles.messageListHeader}>
              <Text style={styles.messageListTitle}>この場所のコメント</Text>
              <TouchableOpacity onPress={handleCloseMessageList}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* コメントリスト */}
            <ScrollView
              style={styles.messageList}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              bounces={true}
              scrollEventThrottle={16}
              removeClippedSubviews={false}
            >
              {getPostsForLocation().map((post) => (
                <View key={post.id} style={styles.messageItemContainer}>
                  {/* 親投稿 */}
                  <View style={styles.messageItem}>
                    {/* ユーザーアイコン */}
                    <View style={styles.userIcon}>
                      <Ionicons name="person" size={20} color="#666" />
                    </View>
                    {/* メッセージ内容 */}
                    <View style={styles.messageContent}>
                      <Text style={styles.userName}>{post.author}</Text>
                      <Text style={styles.messageText}>{post.content}</Text>
                      <Text style={styles.messageTime}>
                        {" "}
                        {post.timestamp.toLocaleString("ja-JP")}
                      </Text>
                    </View>
                    {/* アイコン群 */}
                    <View style={styles.messageIcons}>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() =>
                          setReplyMode(replyMode === post.id ? null : post.id)
                        }
                      >
                        <Ionicons
                          name="chatbubble-outline"
                          size={16}
                          color="#666"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => showReactionPicker(post.id)}
                      >
                        {" "}
                        <Ionicons name="heart-outline" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {/* リアクション表示 */}
                  {post.reactionCounts &&
                    Object.keys(post.reactionCounts).length > 0 && (
                      <View style={styles.reactionsDisplay}>
                        {Object.entries(post.reactionCounts).map(
                          ([pickerLabel, count]) => (
                            <TouchableOpacity
                              key={pickerLabel}
                              style={[
                                styles.reactionItem,
                                post.reactions?.[currentUserId] ===
                                  pickerLabel && styles.reactionItemActive,
                              ]}
                              onPress={() =>
                                handleReaction(post.id, pickerLabel)
                              }
                            >
                              <Image
                                source={getReactionImage(pickerLabel)}
                                style={{
                                  width: 20,
                                  height: 20,
                                  marginRight: 4,
                                }}
                                resizeMode="contain"
                              />
                              <Text style={styles.reactionCount}>{count}</Text>
                            </TouchableOpacity>
                          )
                        )}
                      </View>
                    )}
                  {/* リプライ数表示 */}
                  {getRepliesForPost(post.id).length > 0 && (
                    <TouchableOpacity
                      style={styles.replyToggle}
                      onPress={() => toggleReplies(post.id)}
                    >
                      <Text style={styles.replyToggleText}>
                        {expandedReplies.has(post.id)
                          ? "返信を隠す"
                          : `返信を表示 (${getRepliesForPost(post.id).length}件)`}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {/* 実際のリプライ投稿リスト */}
                  {expandedReplies.has(post.id) && (
                    <View style={styles.repliesContainer}>
                      {getRepliesForPost(post.id).map((replyPost) => (
                        <View key={replyPost.id}>
                          <View style={styles.replyItem}>
                            <View style={styles.replyIcon}>
                              <Ionicons
                                name="return-down-forward"
                                size={16}
                                color="#888"
                              />
                            </View>
                            <View style={styles.replyContent}>
                              <Text style={styles.replyUserName}>
                                {replyPost.author}
                              </Text>
                              <Text style={styles.replyText}>
                                {replyPost.content}
                              </Text>
                              <Text style={styles.replyTime}>
                                {replyPost.timestamp.toLocaleString("ja-JP")}
                              </Text>
                            </View>
                            <View style={styles.replyActions}>
                              <TouchableOpacity
                                style={styles.replyActionButton}
                                onPress={() =>
                                  showReactionPicker(replyPost.id, false)
                                }
                              >
                                <Ionicons
                                  name="heart-outline"
                                  size={14}
                                  color="#666"
                                />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* リプライ投稿のリアクション表示 */}
                          {replyPost.reactionCounts &&
                            Object.keys(replyPost.reactionCounts).length >
                              0 && (
                              <View style={styles.replyReactionsDisplay}>
                                {Object.entries(replyPost.reactionCounts).map(
                                  ([pickerLabel, count]) => (
                                    <TouchableOpacity
                                      key={pickerLabel}
                                      style={[
                                        styles.replyReactionItem,
                                        replyPost.reactions?.[currentUserId] ===
                                          pickerLabel &&
                                          styles.reactionItemActive,
                                      ]}
                                      onPress={() =>
                                        handleReaction(
                                          replyPost.id,
                                          pickerLabel
                                        )
                                      }
                                    >
                                      <Image
                                        source={getReactionImage(pickerLabel)}
                                        style={{
                                          width: 14,
                                          height: 14,
                                          marginRight: 2,
                                        }}
                                        resizeMode="contain"
                                      />
                                      <Text style={styles.reactionCount}>
                                        {String(count)}
                                      </Text>
                                    </TouchableOpacity>
                                  )
                                )}
                              </View>
                            )}
                        </View>
                      ))}
                    </View>
                  )}
                  {/* リプライ入力フォーム */}
                  {replyMode === post.id && (
                    <View style={styles.replyForm}>
                      <TextInput
                        style={styles.replyInput}
                        placeholder="返信を入力..."
                        value={newReply.content}
                        onChangeText={(text) =>
                          setNewReply({ ...newReply, content: text })
                        }
                        multiline={true}
                        maxLength={200}
                      />
                      <View style={styles.replyFormButtons}>
                        <TouchableOpacity
                          style={styles.replyCancel}
                          onPress={() => {
                            setReplyMode(null);
                            setNewReply({ content: "" });
                          }}
                        >
                          <Text style={styles.replyCancelText}>キャンセル</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.replySubmit}
                          onPress={() => handleReplySubmit(post.id)}
                        >
                          <Text style={styles.replySubmitText}>返信</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}

              {getPostsForLocation().length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    この場所にはまだコメントがありません
                  </Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      )}
      {/* フローティング投稿ボタン */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="white" />{" "}
      </TouchableOpacity>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCancelPost}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>新しい投稿</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCancelPost}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>{" "}
            </View>
            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>内容</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="投稿の内容を入力"
                  value={newPost.content}
                  onChangeText={(text) =>
                    setNewPost({ ...newPost, content: text })
                  }
                  multiline={true}
                  numberOfLines={5}
                  maxLength={300}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelPost}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreatePost}
              >
                <Text style={styles.submitButtonText}>投稿する</Text>{" "}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* リアクション選択モーダル */}
      <Modal
        visible={reactionPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReactionPickerVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setReactionPickerVisible(false)}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 15,
              padding: 20,
              margin: 20,
              maxWidth: 300,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: 15,
              }}
            >
              リアクションを選択
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {["1", "2", "3", "4", "5", "6"].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: "#f0f0f0",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 60,
                    height: 60,
                  }}
                  onPress={async () => {
                    if (reactionPickerTarget) {
                      await handleReaction(
                        reactionPickerTarget.postId,
                        emoji,
                        reactionPickerTarget.isReply,
                        reactionPickerTarget.replyId
                      );
                    }
                    setReactionPickerVisible(false);
                  }}
                >
                  <Image
                    source={getReactionImage(emoji)}
                    style={{ width: 40, height: 40 }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
