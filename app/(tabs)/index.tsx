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

// 型とユーチE��リチE��のインポ�EチE
import { styles } from "../../components/utils/styles";
import { Post, Reply } from "../../components/utils/types";
import {
  getEncounterHistory,
  saveLocationToFirestore,
} from "../../services/locationService";
import {
  getNearbyPosts,
  savePostToFirestore,
  updatePostReaction,
} from "../../services/postService";
import { getPersistentUserId } from "../../services/userService";

// 使ぁE��アクションの種類をここで定義しまぁE
const reactionImages: { [key: string]: any } = {
  "1": require("../../assets/images/face1.png"),
  "2": require("../../assets/images/face2.png"),
  "3": require("../../assets/images/face3.png"),
  "4": require("../../assets/images/face4.png"),
  "5": require("../../assets/images/face5.png"),
  "6": require("../../assets/images/face6.png"),
};

// リアクション画像�E安�Eな取得関数
const getReactionImage = (emoji: string) => {
  if (reactionImages[emoji]) {
    return reactionImages[emoji];
  }
  // フォールバック画像（最初�E画像を使用�E�E
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
  // すれ違い履歴モーダル用のstate
  const [encounterHistoryVisible, setEncounterHistoryVisible] = useState(false);
  const [encounterHistory, setEncounterHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [isLocationTracking, setIsLocationTracking] = useState(false);

  // アニメーション用の値�E��E期値は画面外�E下に設定！E
  const slideAnim = useRef(new Animated.Value(height * 0.5)).current;
  // MapViewのref
  const mapRef = useRef<MapView>(null); // 位置惁E��取得�Eインターバル参�E
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  useEffect(() => {
    // 永続的なユーザーIDを取征E
    const initializeUserId = async () => {
      const userId = await getPersistentUserId();
      setCurrentUserId(userId);
      console.log("現在のユーザーID:", userId);

      // チE��ォルト�E投稿冁E��を空に設宁E
      setNewPost({ content: "" });
      setNewReply({ content: "" });
    };

    initializeUserId();

    // 位置惁E��取得と保存�E処琁E
    const initializeLocationTracking = async () => {
      // 1刁E��きに位置惁E��を取得してFirestoreに保存する関数
      const startLocationTracking = () => {
        setIsLocationTracking(true);
        console.log("位置情報の定期取得を開始しました（5秒間隔）");

        locationIntervalRef.current = setInterval(async () => {
          try {
            console.log("定期取得：位置惁E��を取得中...");
            const savedLocation = await saveLocationToFirestore(currentUserId);

            if (savedLocation) {
              // 現在地を更新
              console.log("定期取得：現在地を�E取得中...");
              const currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
              });
              setLocation(currentLocation);

              // 周辺の投稿を取得して表示
              console.log("周辺投稿を取得中...");
              const nearbyPosts = await getNearbyPosts(
                currentLocation.coords.latitude,
                currentLocation.coords.longitude,
                1.0 // 1km圏�E
              );

              if (nearbyPosts.length > 0) {
                console.log(`周辺投稿めE{nearbyPosts.length}件取得しました`);
                // Firestoreから取得した投稿をローカルの投稿リストと統吁E
                const convertedPosts = nearbyPosts.map((firestorePost) => {
                  // Firestoreのリアクション惁E��を変換
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
                          // 吁E��ーザーの反応を記録
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
                    author: `User-${firestorePost.userID.slice(-6)}`, // ユーザーIDベ�Eスの表示吁E
                    location: {
                      latitude: firestorePost.coordinates.latitude,
                      longitude: firestorePost.coordinates.longitude,
                    },
                    timestamp: firestorePost.timestamp,
                    parentPostID: firestorePost.parentPostID, // 親投稿IDを含める
                    reactions: reactions,
                    reactionCounts: reactionCounts,
                    replies: [], // 返信は別途取得する場吁E
                  };
                });

                // 既存�E投稿を更新また�E新しい投稿を追加
                setPosts((prevPosts) => {
                  const updatedPosts = [...prevPosts];
                  let hasNewPosts = false;

                  convertedPosts.forEach((newPost) => {
                    const existingPostIndex = updatedPosts.findIndex(
                      (p) => p.id === newPost.id
                    );
                    if (existingPostIndex >= 0) {
                      // 既存�E投稿を更新�E�リアクション惁E��など�E�E
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

              console.log("定期取得：位置惁E��を保存しました");
            } else {
              console.error("定期取得：位置惁E��の保存に失敗しました");
            }
          } catch (error) {
            console.error("位置惁E��の定期取得でエラーが発生しました:", error);
          }
        }, 5000); // 60秒！E刁E��間隁E
      };

      try {
        console.log("位置惁E��の許可を要求中...");
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
        console.log("位置惁E��取得�E劁E", currentLocation.coords);
        setLocation(currentLocation);

        // 初回の位置惁E��をFirestoreに保孁E
        console.log("Firestoreに位置惁E��を保存中...");
        const savedLocation = await saveLocationToFirestore(currentUserId);
        if (savedLocation) {
          console.log("初回位置惁E��を保存しました");
        } else {
          console.error("初回位置惁E��の保存に失敗しました");
        }

        // 初回の周辺投稿取征E
        console.log("初回�E�周辺投稿を取得中...");
        const initialNearbyPosts = await getNearbyPosts(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          1.0 // 1km圏�E
        );

        if (initialNearbyPosts.length > 0) {
          console.log(
            `初回�E�周辺投稿めE{initialNearbyPosts.length}件取得しました`
          );
          // Firestoreから取得した投稿をローカルの投稿リストに設宁E
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
                    // 吁E��ーザーの反応を記録
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
              author: `User-${firestorePost.userID.slice(-6)}`, // ユーザーIDベ�Eスの表示吁E
              location: {
                latitude: firestorePost.coordinates.latitude,
                longitude: firestorePost.coordinates.longitude,
              },
              timestamp: firestorePost.timestamp,
              parentPostID: firestorePost.parentPostID, // 親投稿IDを含める
              reactions: reactions,
              reactionCounts: reactionCounts,
              replies: [], // 返信は別途取得する場吁E
            };
          });
          setPosts(convertedPosts);
        } else {
          console.log("初回�E�周辺に投稿はありません");
        }

        // 1刁E��き�E位置惁E��取得を開姁E
        startLocationTracking();
      } catch (error) {
        console.error("位置惁E��取得�E琁E��エラーが発生しました:", error);
        Alert.alert(
          "エラー",
          "位置惁E��の取得に失敗しました: " +
            (error instanceof Error ? error.message : String(error))
        );
      }
    };

    // ユーザーIDが設定された後に位置惁E��処琁E��開姁E
    if (currentUserId) {
      initializeLocationTracking();
    }

    // コンポ�Eネントがアンマウントされるときにインターバルをクリア
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, [currentUserId]); // currentUserIdが設定されたときに実衁E
  // チE��ト用の投稿を追加�E�最初�E位置惁E��取得時のみ�E�E
  useEffect(() => {
    if (location && posts.length === 0) {
      // postsが空の場合のみ実行
      const testPost: Post = {
        id: "test-1",
        content: "これはテスト投稿です",
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

  // キーボ�Eドイベントリスナ�E
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
      Alert.alert("エラー", "投稿冁E��を�E力してください");
      return;
    }

    if (!location) {
      Alert.alert("エラー", "位置惁E��が取得できません");
      return;
    }

    try {
      console.log("投稿作�E開姁E- UserID:", currentUserId);

      // Firestoreに投稿を保存！ED, coordinates, geohash, text, photoURL, timestamp, userID, parentPostID, reactions を含む�E�E
      const postId = await savePostToFirestore({
        text: newPost.content,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        photoURL: undefined, // 後で画像アチE�Eロード機�Eを追加
      });

      if (postId) {
        console.log("投稿保存�E劁E- PostID:", postId);

        // ローカルの投稿リストにも追加�E�EIの即座更新のため�E�E
        const post: Post = {
          id: postId,
          content: newPost.content,
          author: `User-${currentUserId.slice(-6)}`, // ユーザーIDベ�Eスの作�E老E��
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          timestamp: new Date(),
          parentPostID: undefined, // 新規投稿は親投稿なのでundefined
          reactions: {},
          reactionCounts: {},
        };

        setPosts([post, ...posts]); // 新しい投稿を�E頭に追加
        setNewPost({ content: "" }); // 内容をクリア
        setModalVisible(false);
        Alert.alert("成功", "投稿が作成されました");
      } else {
        Alert.alert("エラー", "投稿の保存に失敗しました");
      }
    } catch (error) {
      console.error("投稿作�Eエラー:", error);
      Alert.alert("エラー", "投稿の作�Eに失敗しました");
    }
  };
  const handleCancelPost = () => {
    setNewPost({ content: "" });
    setModalVisible(false);
  };
  const handleMarkerPress = (post: Post) => {
    setSelectedLocation(post.location);
    setMessageListVisible(true);

    // マップ�E位置を調整�E��EチE�E全体を下に移動して投稿位置を画面上部に表示
    // メチE��ージリストが画面の下半刁E��占めるので、�EチE�Eの中忁E��北（上）に移勁E
    const offsetLatitude = -0.001; // 緯度のオフセチE���E�北に移動してマップ�E体を下げる！E
    mapRef.current?.animateToRegion(
      {
        latitude: post.location.latitude + offsetLatitude,
        longitude: post.location.longitude,
        latitudeDelta: 0.002, // 紁E00m篁E���E�高倍率�E�E
        longitudeDelta: 0.002, // 紁E00m篁E���E�高倍率�E�E
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
    // マップを現在地中忁E��戻ぁE
    if (location) {
      mapRef.current?.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01, // 通常表示�E�紁Ekm篁E���E�E
          longitudeDelta: 0.01, // 通常表示�E�紁Ekm篁E���E�E
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
    // 選択された場所の近くの投稿を取得（半征Ekm以冁E��ど�E�E
    const nearbyPosts = posts.filter((post) => {
      const distance = Math.sqrt(
        Math.pow(post.location.latitude - selectedLocation.latitude, 2) +
          Math.pow(post.location.longitude - selectedLocation.longitude, 2)
      );
      return distance < 0.01; // 紁Ekm
    });

    // 親投稿のみを返す�E�EarentPostIDがなぁE��の�E�E
    return nearbyPosts.filter((post) => !post.parentPostID);
  };

  /**
   * 持E��された親投稿IDのリプライを取征E
   */
  const getRepliesForPost = (parentPostId: string) => {
    if (!selectedLocation) return [];

    // 選択された場所の近くの投稿から、指定された親投稿のリプライのみを取征E
    const nearbyPosts = posts.filter((post) => {
      const distance = Math.sqrt(
        Math.pow(post.location.latitude - selectedLocation.latitude, 2) +
          Math.pow(post.location.longitude - selectedLocation.longitude, 2)
      );
      return distance < 0.01; // 紁Ekm
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
      Alert.alert("エラー", "返信冁E��を�E力してください");
      return;
    }

    if (!location) {
      Alert.alert("エラー", "位置惁E��が取得できません");
      return;
    }

    try {
      console.log(
        "返信作�E開姁E- UserID:",
        currentUserId,
        "ParentPostID:",
        postId
      );

      // Firestoreに返信を保存！ED, coordinates, geohash, text, photoURL, timestamp, userID, parentPostID, reactions を含む�E�E
      const replyId = await savePostToFirestore({
        text: newReply.content,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        parentPostID: postId, // 親投稿IDを指宁E
        photoURL: undefined,
      });

      if (replyId) {
        console.log("返信保存�E劁E- ReplyID:", replyId);

        // ローカルの投稿リストにも反映�E�EIの即座更新のため�E�E
        const reply: Reply = {
          id: replyId,
          content: newReply.content,
          author: `User-${currentUserId.slice(-6)}`, // ユーザーIDベ�Eスの作�E老E��
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

        // 入力フィールドをクリアしてキーボ�Eドを閉じめE
        setNewReply({ content: "" }); // 冁E��をクリア
        setReplyMode(null);
        Keyboard.dismiss();
        Alert.alert("成功", "返信が投稿されました");
      } else {
        Alert.alert("エラー", "返信の保存に失敗しました");
      }
    } catch (error) {
      console.error("返信作�Eエラー:", error);
      Alert.alert("エラー", "返信の作�Eに失敗しました");
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
        `リアクション処琁E��姁E PostID=${postId}, Emoji=${pickerLabel}`
      );

      // Firestoreに保孁E
      const success = await updatePostReaction(postId, pickerLabel);

      if (!success) {
        Alert.alert("エラー", "リアクションの更新に失敗しました");
        return;
      }

      // ローカルの投稿リストも更新�E�EIの即座更新のため�E�E
      setPosts(
        posts.map((post) => {
          if (post.id === postId) {
            const reactions = { ...(post.reactions || {}) };
            const reactionCounts = { ...(post.reactionCounts || {}) };

            // 既存�Eリアクションを確誁E
            const currentReaction = reactions[currentUserId];

            if (currentReaction === pickerLabel) {
              // 同じ絵斁E���E場合�E削除
              delete reactions[currentUserId];
              reactionCounts[pickerLabel] = Math.max(
                0,
                (reactionCounts[pickerLabel] || 0) - 1
              );
              if (reactionCounts[pickerLabel] === 0) {
                delete reactionCounts[pickerLabel];
              }
            } else {
              // 異なる絵斁E��また�E新規�E場吁E
              if (currentReaction) {
                // 既存�Eリアクションを減らぁE
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

      // リアクション更新後、最新の投稿チE�Eタを取得して同期
      if (location) {
        try {
          console.log("リアクション後�E投稿チE�Eタ同期中...");
          const updatedNearbyPosts = await getNearbyPosts(
            location.coords.latitude,
            location.coords.longitude,
            1.0
          );

          // Firestoreから取得した最新チE�Eタでローカル状態を更新
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

            // 既存�E投稿を更新�E�リアクション惁E��のみ�E�E
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
          // 同期に失敗してもローカル更新は継綁E
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

  // すれ違い履歴を取得する関数
  const fetchEncounterHistory = async () => {
    if (!currentUserId) return;

    setLoadingHistory(true);
    try {
      console.log("すれ違い履歴を取得中...");
      const history = await getEncounterHistory(currentUserId);
      setEncounterHistory(history);
      console.log(`すれ違い履歴めE{history.length}件取得しました`);
    } catch (error) {
      console.error("すれ違い履歴取得エラー:", error);
      Alert.alert("エラー", "すれ違い履歴の取得に失敗しました");
    } finally {
      setLoadingHistory(false);
    }
  };

  // すれ違い履歴モーダルを開く関数
  const handleOpenEncounterHistory = () => {
    setEncounterHistoryVisible(true);
    fetchEncounterHistory();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>地域�E生アプリ</Text>
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
            {isLocationTracking ? "位置追跡中" : "征E��中"}
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
              latitudeDelta: 0.01, // 初期表示は少し庁E��に設定（紁Ekm篁E���E�E
              longitudeDelta: 0.01, // 初期表示は少し庁E��に設定（紁Ekm篁E���E�E
            }}
            // コメントリスト表示時�Eマップ操作を無効匁E
            scrollEnabled={!messageListVisible}
            zoomEnabled={!messageListVisible}
            rotateEnabled={!messageListVisible}
            pitchEnabled={!messageListVisible}
            moveOnMarkerPress={!messageListVisible}
            onTouchStart={() => {
              // コメントリスト表示時�EマップタチE��を無効匁E
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
              description="あなた�E現在位置"
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
          {/* コメントリスト表示時�Eマップ操作防止オーバ�Eレイ */}
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
              pointerEvents="none" // マップ�EタチE��を無効匁E
            />
          )}
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>位置惁E��を取得中...</Text>
        </View>
      )}
      {/* メチE��ージリストエリア */}
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
            {/* ハンドルバ�E */}
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

            {/* コメントリスチE*/}
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
                    {/* メチE��ージ冁E�� */}
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
                        placeholder="返信を�E劁E.."
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
                    こ�E場所にはまだコメントがありません
                  </Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      )}
      {/* フローチE��ングボタン群 */}
      {/* すれ違い履歴ボタン */}
      <TouchableOpacity
        style={styles.floatingButtonSecondary}
        onPress={handleOpenEncounterHistory}
      >
        <Ionicons name="people" size={28} color="white" />
      </TouchableOpacity>
      {/* フローチE��ング投稿ボタン */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="white" />
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
                  placeholder="投稿の内容を入力してください"
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
              リアクションを選抁E
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

      {/* すれ違い履歴モーダル */}
      <Modal
        visible={encounterHistoryVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEncounterHistoryVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>すれ違い履歴</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setEncounterHistoryVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {loadingHistory ? (
                <View style={{ alignItems: "center", padding: 20 }}>
                  <Text>履歴を読み込み中...</Text>
                </View>
              ) : encounterHistory.length === 0 ? (
                <View style={{ alignItems: "center", padding: 20 }}>
                  <Text style={{ fontSize: 16, color: "#666" }}>
                    まだすれ違いの履歴がありません
                  </Text>
                </View>
              ) : (
                encounterHistory.map((encounter, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: "#f8f9fa",
                      padding: 15,
                      marginBottom: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "#e9ecef",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <Ionicons
                        name="person-circle"
                        size={40}
                        color="#007AFF"
                      />
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                          {encounter.otherUsername ||
                            `User-${encounter.otherUserId?.slice(-6)}`}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#666" }}>
                          {encounter.timestamp?.toLocaleString("ja-JP")}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 12, color: "#007AFF" }}>
                          距離:{" "}
                          {encounter.distance
                            ? `${encounter.distance.toFixed(0)}m`
                            : "不�E"}
                        </Text>
                      </View>
                    </View>
                    {encounter.otherOneMessage && (
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#333",
                          fontStyle: "italic",
                        }}
                      >
                        {encounter.otherOneMessage}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
