import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
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
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

// 型とユーティリティのインポート
import { PostDisplayComponent } from "../../components/PostDisplayComponent";
import { PostModalComponent } from "../../components/PostModalComponent";
import { getPostsForCoordinates } from "../../components/utils/locationUtils";
import { getReactionImage } from "../../components/utils/reactionUtils";
import { styles } from "../../components/utils/styles";
import { Post } from "../../components/utils/types";
import { testFirebaseStorageAccess } from "../../debug/storageTest";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { usePostManagement } from "../../hooks/usePostManagement";
import {
  uploadImageToStorage,
  validateImageSize,
} from "../../services/imageService";
import { createPost } from "../../services/postService";
import { getPersistentUserId } from "../../services/userService";

const { height } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [messageListVisible, setMessageListVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // 画像投稿用の状態管理
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 位置情報追跡フック
  const {
    location,
    isLocationTracking,
    initializeLocationTracking,
    cleanupLocationTracking,
    updateSetPosts,
  } = useLocationTracking({
    currentUserId,
    setPosts: undefined, // 初期値はundefined、後でupdateSetPostsで設定
  });

  // 投稿管理フック（位置情報をuseLocationTrackingから取得）
  const postManagement = usePostManagement({
    currentUserId,
    location,
  });

  // 投稿管理の機能を分離
  const {
    posts,
    newPost,
    newReply,
    expandedReplies,
    replyMode,
    reactionPickerVisible,
    reactionPickerTarget,
    setPosts,
    setNewPost,
    setNewReply,
    setReplyMode,
    handleReplySubmit,
    handleReaction,
    showReactionPicker,
    hideReactionPicker,
    toggleReplies,
    handleCancelPost,
  } = postManagement;

  // アニメーション用の値（初期値は画面外の下に設定）
  const slideAnim = useRef(new Animated.Value(height * 0.5)).current;
  // MapViewのref
  const mapRef = useRef<MapView>(null);
  useEffect(() => {
    // 永続的なユーザーIDを取得
    const initializeUserId = async () => {
      const userId = await getPersistentUserId();
      setCurrentUserId(userId);
      console.log("現在のユーザーID:", userId);

      // Firebase Storageアクセステストを実行
      console.log("Firebase Storageアクセステストを開始...");
      const testResult = await testFirebaseStorageAccess();
      console.log("Firebase Storageアクセステスト結果:", testResult);
    };

    initializeUserId();
  }, []);

  // useLocationTrackingフックにpostManagement.setPostsを接続
  useEffect(() => {
    if (postManagement.setPosts) {
      updateSetPosts(postManagement.setPosts);
    }
  }, [postManagement.setPosts, updateSetPosts]);

  // currentUserIdが設定されたら位置情報追跡を開始
  useEffect(() => {
    if (currentUserId) {
      console.log("ユーザーID設定完了、位置情報追跡を開始:", currentUserId);
      initializeLocationTracking();

      // クリーンアップ関数
      return () => {
        console.log("位置情報追跡をクリーンアップ");
        cleanupLocationTracking();
      };
    }
  }, [currentUserId, initializeLocationTracking, cleanupLocationTracking]);
  // テスト用の投稿を追加（最初の位置情報取得時のみ）
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
        replies: [
          {
            id: "reply-1",
            content: "これはテストリプライです",
            author: "リプライユーザー",
            timestamp: new Date(),
            reactions: {},
            reactionCounts: {},
          },
          {
            id: "reply-2",
            content: "もう一つのテストリプライです",
            author: "別のユーザー",
            timestamp: new Date(),
            reactions: {},
            reactionCounts: {},
          },
        ],
        reactions: {},
        reactionCounts: {},
      };
      setPosts([testPost]);
    }
  }, [location, posts.length, setPosts]);

  // 画像選択機能
  const handleImagePicker = async () => {
    try {
      // パーミッションを要求
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert("フォトライブラリへのアクセスを許可してください");
        return;
      }

      // 画像を選択
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!pickerResult.canceled && pickerResult.assets[0]) {
        setSelectedImage(pickerResult.assets[0].uri);
      }
    } catch (error) {
      console.error("画像選択エラー:", error);
      alert("画像の選択に失敗しました");
    }
  };

  // 画像削除機能
  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  // 投稿作成時の画像アップロード処理
  const handleCreatePostWithImage = async () => {
    if (!newPost.content.trim() && !selectedImage) {
      Alert.alert("エラー", "投稿内容または画像を入力してください");
      return;
    }

    if (!location) {
      Alert.alert("エラー", "位置情報が取得できません");
      return;
    }

    try {
      console.log("画像付き投稿作成開始...");

      let photoURL = undefined;

      // 画像が選択されている場合はFirebase Storageにアップロード
      if (selectedImage) {
        // 画像サイズをチェック
        const isValidSize = await validateImageSize(selectedImage);
        if (!isValidSize) {
          Alert.alert(
            "エラー",
            "画像サイズが10MBを超えています。より小さい画像を選択してください。"
          );
          return;
        }

        console.log("Firebase Storageに画像をアップロード中...");
        photoURL = await uploadImageToStorage(selectedImage, currentUserId);

        if (!photoURL) {
          Alert.alert("エラー", "画像のアップロードに失敗しました");
          return;
        }

        console.log("画像アップロード成功:", photoURL);
      }

      // createPostを直接呼び出し、画像URLを含める
      const postData = {
        content: newPost.content,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        userId: currentUserId,
        photoURL: photoURL, // Firebase Storageからの画像URL
      };

      const result = await createPost(postData);
      if (result) {
        console.log("画像付き投稿作成成功:", result);

        // ローカルの投稿リストに追加
        const newPostObj: Post = {
          id: result.id,
          content: newPost.content,
          author: `User-${currentUserId.slice(-6)}`,
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          timestamp: new Date(),
          image: photoURL, // Firebase Storageからの画像URL
          replies: [],
          reactions: {},
          reactionCounts: {},
        };

        setPosts((prev) => [newPostObj, ...prev]);
        setNewPost({ content: "" });
        setSelectedImage(null);
        setModalVisible(false);
        Alert.alert("成功", "投稿が作成されました！");
      } else {
        Alert.alert("エラー", "投稿の作成に失敗しました");
      }
    } catch (error) {
      console.error("画像付き投稿の作成エラー:", error);
      Alert.alert("エラー", "投稿の作成に失敗しました");
    }
  };

  // キーボード高さの管理
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

  const handleMarkerPress = (post: Post) => {
    // ★デバッグ用: マーカー押下時の投稿データを確認
    console.log("=== マーカー押下デバッグ ===");
    console.log("選択された投稿ID:", post.id);
    console.log("選択された投稿内容:", post.content);
    console.log("選択された投稿作成者:", post.author);
    console.log("選択された投稿の画像URL:", post.image);
    console.log("画像URL型:", typeof post.image);
    console.log("選択された投稿の全データ:", JSON.stringify(post, null, 2));
    console.log("=========================");

    setSelectedLocation(post.location);
    setMessageListVisible(true);

    // マップの位置を調整（マップ全体を下に移動して投稿位置を画面上部に表示）
    // メッセージリストが画面の下半分を占めるので、マップの中心を北（上）に移動
    const offsetLatitude = -0.001; // 緯度のオフセット（北に移動してマップ全体を下げる）
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

  // すれ違い履歴画面に遷移する関数
  const handleOpenEncounterHistory = () => {
    router.push("/(tabs)/history");
  };

  // マイページ画面に遷移する関数
  const handleOpenMyPage = () => {
    router.push("/(tabs)/mypage");
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
              // コメントリスト表示時のマップタッチを無効化
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
                bottom: height * 0.5, // ScrollViewエリアを除外
                zIndex: 999,
              }}
              pointerEvents="none" // マップのタッチを無効化
            />
          )}
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>位置位置を取得中...</Text>
        </View>
      )}
      {/* メッセージリストエリア */}
      {messageListVisible && (
        <KeyboardAvoidingView
          style={[
            styles.keyboardAvoidingView,
            {
              zIndex: 1000,
              height: height * 0.5, // 明示的に高さを設定
            },
          ]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          <View
            style={[
              styles.messageListContainer,
              {
                // transform: [{ translateY: slideAnim }], // 一時的にコメントアウト
                marginBottom: keyboardHeight > 0 ? keyboardHeight - 100 : 0,
                height: height * 0.4, // 明示的に高さを設定
              },
            ]}
          >
            {/* ハンドルバE*/}
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

            {/* コメントリスト*/}
            <ScrollView
              style={{
                height: 300,
              }}
              contentContainerStyle={{
                paddingBottom: 20,
              }}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={true}
            >
              {getPostsForCoordinates(selectedLocation, posts).map(
                (post, index) => (
                  <PostDisplayComponent
                    key={post.id}
                    post={post}
                    currentUserId={currentUserId}
                    expandedReplies={expandedReplies}
                    replyMode={replyMode}
                    newReply={newReply}
                    onToggleReplies={toggleReplies}
                    onReplyModeChange={setReplyMode}
                    onNewReplyChange={setNewReply}
                    onReplySubmit={handleReplySubmit}
                    onReactionPress={(postId, isReply, replyId) => {
                      if (showReactionPicker) {
                        showReactionPicker(postId, isReply, replyId);
                      }
                    }}
                  />
                )
              )}

              {getPostsForCoordinates(selectedLocation, posts).length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    この場所にはまだコメントがありません
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      )}
      {/* フローティングボタン群 */}
      {/* マイページボタン */}
      <TouchableOpacity
        style={styles.floatingButtonTertiary}
        onPress={handleOpenMyPage}
      >
        <Ionicons name="person" size={28} color="white" />
      </TouchableOpacity>

      {/* すれ違い履歴ボタン */}
      <TouchableOpacity
        style={styles.floatingButtonSecondary}
        onPress={handleOpenEncounterHistory}
      >
        <Ionicons name="people" size={28} color="white" />
      </TouchableOpacity>
      {/* フローティング投稿ボタン */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
      <PostModalComponent
        visible={modalVisible}
        newPost={{
          content: newPost.content,
          author: "", // 投稿者名は自動設定されるため空文字列
          image: selectedImage || "",
        }}
        selectedImage={selectedImage}
        onClose={() => {
          handleCancelPost();
          setModalVisible(false);
          setSelectedImage(null);
        }}
        onNewPostChange={(post) => setNewPost({ content: post.content })} // authorは使用しない
        onCreatePost={handleCreatePostWithImage}
        onImagePicker={handleImagePicker}
        onRemoveImage={handleRemoveImage}
      />

      {/* リアクション選択モーダル */}
      <Modal
        visible={reactionPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideReactionPicker}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={hideReactionPicker}
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
                    hideReactionPicker();
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
