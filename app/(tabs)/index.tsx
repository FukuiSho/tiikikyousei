import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// 型とコンポーネントのインポート
import { MapComponentWrapper } from "../../components/MapComponentWrapper";
import { MessageListComponent } from "../../components/MessageListComponent";
import { PostModalComponent } from "../../components/PostModalComponent";
import { styles } from "../../components/utils/styles";
import { NewPost, NewReply, Post, Reply } from "../../components/utils/types";
// import { getOffsetCoordinates } from '../../components/utils/locationUtils'; // 現在未使用
import {
  selectImageFromCamera,
  selectImageFromLibrary,
  showImagePickerOptions,
} from "../../components/utils/imageUtils";
import { showReactionPicker } from "../../components/utils/reactionUtils";

const { height } = Dimensions.get("window");

export default function HomeScreen() {
  // ========== 状態変数 ==========
  // 位置情報関連
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  // UI状態
  const [modalVisible, setModalVisible] = useState(false);
  const [messageListVisible, setMessageListVisible] = useState(false);

  // 投稿関連
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState<NewPost>({
    content: "",
    author: "",
    image: "",
  });

  // 画像選択関連
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePosition, setImagePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // リプライ・リアクション関連
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set()
  );
  const [replyMode, setReplyMode] = useState<string | null>(null);
  const [newReply, setNewReply] = useState<NewReply>({
    content: "",
    author: "",
  });
  const [currentUserId] = useState("user-" + Date.now());
  // アニメーション用の値
  const slideAnim = useRef(new Animated.Value(height * 0.5)).current;
  const mapRef = useRef<any>(null);

  // ========== 初期化とライフサイクル ==========
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("エラー", "位置情報のアクセス許可が拒否されました");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);
  // ========== 投稿関連の関数 ==========
  const handleCreatePost = () => {
    if ((!newPost.content.trim() && !selectedImage) || !newPost.author.trim()) {
      Alert.alert(
        "エラー",
        "テキストまたは画像、および投稿者名を入力してください"
      );
      return;
    }

    if (!location) {
      Alert.alert("エラー", "位置情報が取得できません");
      return;
    }

    const post: Post = {
      id: Date.now().toString(),
      content: newPost.content,
      author: newPost.author,
      image: selectedImage || undefined,
      imagePosition: imagePosition || undefined,
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      timestamp: new Date(),
      reactions: {},
      reactionCounts: {},
    };

    // 即時反映：まず投稿を追加
    setPosts([...posts, post]);

    // UI状態をリセット
    setNewPost({ content: "", author: "", image: "" });
    setSelectedImage(null);
    setImagePosition(null);
    setModalVisible(false);

    // 成功メッセージは非同期で表示（UIをブロックしない）
    setTimeout(() => {
      Alert.alert("成功", "投稿が作成されました！");
    }, 100);
  };

  const handleCancelPost = () => {
    setNewPost({ content: "", author: "", image: "" });
    setSelectedImage(null);
    setImagePosition(null);
    setModalVisible(false);
  }; // ========== 地図関連の関数 ==========
  const handleMarkerPress = (post: Post) => {
    setSelectedPost(post);
    setMessageListVisible(true);

    if (mapRef.current && location && Platform.OS !== "web") {
      // アイコンが地図の上部中央に来るように調整（緯度を上にオフセット）
      const offsetLatitude = post.location.latitude + 0.002; // より大きなオフセットで上部に配置
      mapRef.current.animateToRegion(
        {
          latitude: offsetLatitude,
          longitude: post.location.longitude,
          latitudeDelta: 0.008, // ズームレベルも少し広く
          longitudeDelta: 0.008,
        },
        1000
      );
    }

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleCloseMessageList = () => {
    if (mapRef.current && location && Platform.OS !== "web") {
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        1000
      );
    }

    Animated.timing(slideAnim, {
      toValue: height * 0.5,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setMessageListVisible(false);
      setSelectedPost(null);
    });
  };

  // ========== リプライ関連の関数 ==========
  const toggleReplies = (postId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedReplies(newExpanded);
  };
  const handleReplySubmit = (postId: string) => {
    if (!newReply.content.trim() || !newReply.author.trim()) {
      Alert.alert("エラー", "内容と投稿者名を入力してください");
      return;
    }

    const reply: Reply = {
      id: Date.now().toString(),
      content: newReply.content,
      author: newReply.author,
      timestamp: new Date(),
      reactions: {},
      reactionCounts: {},
    };

    // 即時反映：まずリプライを追加
    const updatedPosts = posts.map((post) => {
      if (post.id === postId) {
        return {
          ...post,
          replies: [...(post.replies || []), reply],
        };
      }
      return post;
    });

    setPosts(updatedPosts);

    // selectedPostも更新（即時反映のため）
    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost({
        ...selectedPost,
        replies: [...(selectedPost.replies || []), reply],
      });
    }

    // UI状態をリセット
    setNewReply({ content: "", author: "" });
    setReplyMode(null);

    // 成功メッセージは非同期で表示（UIをブロックしない）
    setTimeout(() => {
      Alert.alert("成功", "返信が投稿されました！");
    }, 100);
  };
  // ========== 画像選択関連の関数 ==========
  const handleSelectImageFromLibrary = async () => {
    const imageUri = await selectImageFromLibrary();
    if (imageUri) {
      // 即時反映：UI状態を即座に更新
      setSelectedImage(imageUri);
      setNewPost((prev) => ({ ...prev, image: imageUri }));
    }
  };

  const handleSelectImageFromCamera = async () => {
    const imageUri = await selectImageFromCamera();
    if (imageUri) {
      // 即時反映：UI状態を即座に更新
      setSelectedImage(imageUri);
      setNewPost((prev) => ({ ...prev, image: imageUri }));
    }
  };

  const handleShowImagePickerOptions = () => {
    showImagePickerOptions(
      handleSelectImageFromLibrary,
      handleSelectImageFromCamera
    );
  };

  const removeSelectedImage = () => {
    // 即時反映：画像を即座に削除
    setSelectedImage(null);
    setNewPost((prev) => ({ ...prev, image: "" }));
  }; // ========== リアクション関連の関数 ==========
  const handlePostReaction = (
    postId: string,
    emoji: string,
    isReply: boolean = false,
    replyId?: string
  ) => {
    try {
      // 即時反映：まずpostsを更新
      const updatedPosts = posts.map((post) => {
        if (post.id === postId) {
          if (isReply && replyId) {
            // リプライのリアクション処理
            const updatedReplies = (post.replies || []).map((reply) => {
              if (reply.id === replyId) {
                const reactions = { ...(reply.reactions || {}) };
                const reactionCounts = { ...(reply.reactionCounts || {}) };
                const currentReaction = reactions[currentUserId];

                if (currentReaction === emoji) {
                  // 同じリアクションを削除
                  delete reactions[currentUserId];
                  reactionCounts[emoji] = Math.max(
                    0,
                    (reactionCounts[emoji] || 0) - 1
                  );
                  if (reactionCounts[emoji] === 0) {
                    delete reactionCounts[emoji];
                  }
                } else {
                  // 既存のリアクションを削除（あれば）
                  if (currentReaction) {
                    reactionCounts[currentReaction] = Math.max(
                      0,
                      (reactionCounts[currentReaction] || 0) - 1
                    );
                    if (reactionCounts[currentReaction] === 0) {
                      delete reactionCounts[currentReaction];
                    }
                  }
                  // 新しいリアクションを追加
                  reactions[currentUserId] = emoji;
                  reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
                }

                return {
                  ...reply,
                  reactions,
                  reactionCounts,
                };
              }
              return reply;
            });

            return {
              ...post,
              replies: updatedReplies,
            };
          } else {
            // 投稿のリアクション処理
            const reactions = { ...(post.reactions || {}) };
            const reactionCounts = { ...(post.reactionCounts || {}) };
            const currentReaction = reactions[currentUserId];

            if (currentReaction === emoji) {
              // 同じリアクションを削除
              delete reactions[currentUserId];
              reactionCounts[emoji] = Math.max(
                0,
                (reactionCounts[emoji] || 0) - 1
              );
              if (reactionCounts[emoji] === 0) {
                delete reactionCounts[emoji];
              }
            } else {
              // 既存のリアクションを削除（あれば）
              if (currentReaction) {
                reactionCounts[currentReaction] = Math.max(
                  0,
                  (reactionCounts[currentReaction] || 0) - 1
                );
                if (reactionCounts[currentReaction] === 0) {
                  delete reactionCounts[currentReaction];
                }
              }
              // 新しいリアクションを追加
              reactions[currentUserId] = emoji;
              reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
            }

            return {
              ...post,
              reactions,
              reactionCounts,
            };
          }
        }
        return post;
      });

      // 即時反映：postsを更新
      setPosts(updatedPosts);

      // selectedPostも更新（即時反映のため）
      if (selectedPost && selectedPost.id === postId) {
        const targetPost = updatedPosts.find((post) => post.id === postId);
        if (targetPost) {
          setSelectedPost(targetPost);
        }
      }
    } catch (error) {
      console.error("リアクション処理でエラーが発生しました:", error);
      Alert.alert("エラー", "リアクションの処理中にエラーが発生しました");
    }
  };
  const handleShowReactionPicker = (
    postId: string,
    isReply: boolean = false,
    replyId?: string
  ) => {
    try {
      showReactionPicker(postId, handlePostReaction, isReply, replyId);
    } catch (error) {
      console.error("リアクションピッカー表示でエラーが発生しました:", error);
      Alert.alert(
        "エラー",
        "リアクション選択画面の表示中にエラーが発生しました"
      );
    }
  };

  // ========== メッセージリストスライド関数 ==========
  const handleSlideUp = () => {
    // メッセージリストエリアを上にスライドして地図エリアを拡大
    Animated.timing(slideAnim, {
      toValue: -height * 0.3, // 画面の30%上にスライド
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleSlideToNormal = () => {
    // メッセージリストエリアを通常位置に戻す
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>地域共生アプリ</Text>
      </View>{" "}
      {/* 地図エリア */}
      <Animated.View
        style={[
          styles.mapContainer,
          {
            height: Animated.add(
              height * 0.5, // 基本の地図エリア高さ（画面の50%）
              Animated.multiply(slideAnim, -1) // slideAnimがマイナスなので逆転
            ),
          },
        ]}
      >
        <MapComponentWrapper
          location={location}
          posts={posts}
          onMarkerPress={handleMarkerPress}
          mapRef={mapRef}
        />{" "}
      </Animated.View>
      {/* メッセージリストエリア */}
      <MessageListComponent
        visible={messageListVisible}
        slideAnim={slideAnim}
        selectedPost={selectedPost}
        expandedReplies={expandedReplies}
        replyMode={replyMode}
        newReply={newReply}
        currentUserId={currentUserId}
        onClose={handleCloseMessageList}
        onToggleReplies={toggleReplies}
        onReplyModeChange={setReplyMode}
        onNewReplyChange={setNewReply}
        onReplySubmit={handleReplySubmit}
        onReactionPress={(postId) => handleShowReactionPicker(postId)}
        onReplyReactionPress={(postId, replyId) =>
          handleShowReactionPicker(postId, true, replyId)
        }
        onSlideUp={handleSlideUp}
        onSlideToNormal={handleSlideToNormal}
      />
      {/* 右下に固定された履歴ボタン */}
      <TouchableOpacity
        style={style.historyButton}
        onPress={() => router.push("/history" as const)}
      >
        <Text style={style.historyButtonText}>履歴を見る</Text>
      </TouchableOpacity>
      {/* フローティング投稿ボタン */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
      {/* 投稿モーダル */}
      <PostModalComponent
        visible={modalVisible}
        newPost={newPost}
        selectedImage={selectedImage}
        onClose={handleCancelPost}
        onNewPostChange={setNewPost}
        onCreatePost={handleCreatePost}
        onImagePicker={handleShowImagePickerOptions}
        onRemoveImage={removeSelectedImage}
      />
    </SafeAreaView>
  );
}

const style = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 80,
  },
  historyButton: {
    position: "absolute",
    bottom: 30, // 下からの位置
    right: 20, // 右からの位置
    backgroundColor: "#4682B4",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
  },
  historyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
