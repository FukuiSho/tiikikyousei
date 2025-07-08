import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
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
import {
  getPostsForCoordinates,
  getRepliesForPost,
} from "../../components/utils/locationUtils";
import { getReactionImage } from "../../components/utils/reactionUtils";
import { styles } from "../../components/utils/styles";
import { Post } from "../../components/utils/types";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { usePostManagement } from "../../hooks/usePostManagement";
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
    handleCreatePost,
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
        replies: [],
        reactions: {},
        reactionCounts: {},
      };
      setPosts([testPost]);
    }
  }, [location, posts.length, setPosts]);

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

  const handleMarkerPress = (post: Post) => {
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

            {/* コメントリスト*/}
            <ScrollView
              style={[
                styles.messageList,
                Platform.OS === "android" && {
                  flex: 1,
                  maxHeight: height * 0.45,
                },
              ]}
              contentContainerStyle={{
                paddingBottom: 20,
                ...(Platform.OS === "android" && {
                  flexGrow: 1,
                  minHeight: height * 0.4,
                }),
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              scrollEnabled={true}
              nestedScrollEnabled={Platform.OS === "android"}
              bounces={Platform.OS === "ios"}
              scrollEventThrottle={Platform.OS === "android" ? 1 : 16}
              removeClippedSubviews={false}
              {...(Platform.OS === "android" && {
                overScrollMode: "always",
                persistentScrollbar: true,
                fadingEdgeLength: 0,
              })}
            >
              {getPostsForCoordinates(selectedLocation, posts).map((post) => (
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
                              />{" "}
                              <Text style={styles.reactionCount}>{count}</Text>
                            </TouchableOpacity>
                          )
                        )}
                      </View>
                    )}
                  {/* リプライ数表示 */}
                  {getRepliesForPost(post.id, selectedLocation, posts).length >
                    0 && (
                    <TouchableOpacity
                      style={styles.replyToggle}
                      onPress={() => toggleReplies(post.id)}
                    >
                      <Text style={styles.replyToggleText}>
                        {expandedReplies.has(post.id)
                          ? "返信を隠す"
                          : `返信を表示 (${getRepliesForPost(post.id, selectedLocation, posts).length}件)`}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {/* 実際のリプライ投稿リスト */}
                  {expandedReplies.has(post.id) && (
                    <View style={styles.repliesContainer}>
                      {getRepliesForPost(post.id, selectedLocation, posts).map(
                        (replyPost) => (
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
                                          replyPost.reactions?.[
                                            currentUserId
                                          ] === pickerLabel &&
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
                        )
                      )}
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

              {getPostsForCoordinates(selectedLocation, posts).length === 0 && (
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
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          handleCancelPost();
          setModalVisible(false);
        }}
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
                onPress={() => {
                  handleCancelPost();
                  setModalVisible(false);
                }}
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
                onPress={() => {
                  handleCancelPost();
                  setModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => handleCreatePost(() => setModalVisible(false))}
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
