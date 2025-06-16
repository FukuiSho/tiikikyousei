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

// 使うリアクションの種類をここで定義します
const reactionImages: { [key: string]: any } = {
  "1": require("../../assets/images/face1.png"),
  "2": require("../../assets/images/face2.png"),
  "3": require("../../assets/images/face3.png"),
  "4": require("../../assets/images/face4.png"),
  "5": require("../../assets/images/face5.png"),
  "6": require("../../assets/images/face6.png"),
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
    author: "",
  });
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set()
  );
  const [replyMode, setReplyMode] = useState<string | null>(null);
  const [newReply, setNewReply] = useState({
    content: "",
    author: "",
  });
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [currentUserId] = useState("user-" + Date.now()); // 簡易的なユーザーID
  // アニメーション用の値（初期値は画面外の下に設定）
  const slideAnim = useRef(new Animated.Value(height * 0.5)).current;
  // MapViewのref
  const mapRef = useRef<MapView>(null);
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("エラー", "位置情報の許可が必要です");
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation); // テスト用の投稿を追加
      const testPost: Post = {
        id: "test-1",
        content: "これはテスト投稿です。",
        author: "テストユーザー",
        location: {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        },
        timestamp: new Date(),
        replies: [],
        reactions: {},
        reactionCounts: {},
      };
      setPosts([testPost]);
    })();
  }, []);

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
  const handleCreatePost = () => {
    if (!newPost.content.trim() || !newPost.author.trim()) {
      Alert.alert("エラー", "全ての項目を入力してください");
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
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      timestamp: new Date(),
      reactions: {},
      reactionCounts: {},
    };

    setPosts([...posts, post]);
    setNewPost({ content: "", author: "" });
    setModalVisible(false);
    Alert.alert("成功", "投稿が作成されました！");
  };
  const handleCancelPost = () => {
    setNewPost({ content: "", author: "" });
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
    return posts.filter((post) => {
      const distance = Math.sqrt(
        Math.pow(post.location.latitude - selectedLocation.latitude, 2) +
          Math.pow(post.location.longitude - selectedLocation.longitude, 2)
      );
      return distance < 0.01; // 約1km
    });
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
    setNewReply({ content: "", author: "" });
    setReplyMode(null);
    Keyboard.dismiss();
    Alert.alert("成功", "返信が投稿されました！");
  };

  const handleReaction = (
    postId: string,
    pickerLabel: string,
    isReply: boolean = false,
    replyId?: string
  ) => {
    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          if (isReply && replyId) {
            // Reply のリアクション
            const updatedReplies = (post.replies || []).map((reply) => {
              if (reply.id === replyId) {
                const reactions = { ...(reply.reactions || {}) };
                const reactionCounts = { ...(reply.reactionCounts || {}) };

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
            // Post のリアクション
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
        }
        return post;
      })
    );
  };
  const showReactionPicker = (
    postId: string,
    isReply: boolean = false,
    replyId?: string
  ) => {
    const reactions = [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ];
    const buttons = reactions.map((pickerLabel) => ({
      text: pickerLabel,
      onPress: () => handleReaction(postId, pickerLabel, isReply, replyId),
    }));

    buttons.push({
      text: "キャンセル",
      onPress: () => {},
    });

    Alert.alert("リアクションを選択", "", buttons, { cancelable: true });
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>地域共生アプリ</Text>
      </View>{" "}
      {location ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01, // 初期表示は少し広めに設定（約1km範囲）
            longitudeDelta: 0.01, // 初期表示は少し広めに設定（約1km範囲）
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
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>位置情報を取得中...</Text>{" "}
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
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {getPostsForLocation().map((post) => (
                <View key={post.id} style={styles.messageItemContainer}>
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
                        {post.timestamp.toLocaleString("ja-JP")}
                      </Text>
                    </View>{" "}
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
                        <Ionicons name="heart-outline" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>{" "}
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
                                source={reactionImages[pickerLabel]}
                                style={{ width: 20, height: 20, marginRight: 4 }}
                                resizeMode="contain"
                              />
                              <Text style={styles.reactionCount}>{count}</Text>
                            </TouchableOpacity>
                          )
                        )}
                      </View>
                    )}
                  {/* リプライ数表示 */}
                  {post.replies && post.replies.length > 0 && (
                    <TouchableOpacity
                      style={styles.replyToggle}
                      onPress={() => toggleReplies(post.id)}
                    >
                      <Text style={styles.replyToggleText}>
                        {expandedReplies.has(post.id)
                          ? "返信を隠す"
                          : `返信を表示 (${post.replies.length}件)`}
                      </Text>
                    </TouchableOpacity>
                  )}{" "}
                  {/* リプライリスト */}
                  {expandedReplies.has(post.id) && post.replies && (
                    <View style={styles.repliesContainer}>
                      {post.replies.map((reply) => (
                        <View key={reply.id}>
                          <View style={styles.replyItem}>
                            <View style={styles.replyIcon}>
                              <Ionicons name="person" size={16} color="#888" />
                            </View>
                            <View style={styles.replyContent}>
                              <Text style={styles.replyUserName}>
                                {reply.author}
                              </Text>
                              <Text style={styles.replyText}>
                                {reply.content}
                              </Text>
                              <Text style={styles.replyTime}>
                                {reply.timestamp.toLocaleString("ja-JP")}
                              </Text>
                            </View>
                            <View style={styles.replyActions}>
                              <TouchableOpacity
                                style={styles.replyActionButton}
                                onPress={() =>
                                  showReactionPicker(post.id, true, reply.id)
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

                          {/* リプライのリアクション表示 */}
                          {reply.reactionCounts &&
                            Object.keys(reply.reactionCounts).length > 0 && (
                              <View style={styles.replyReactionsDisplay}>
                                {Object.entries(reply.reactionCounts).map(
                                  ([pickerLabel, count]) => (
                                    <TouchableOpacity
                                      key={pickerLabel}
                                      style={[
                                        styles.replyReactionItem,
                                        reply.reactions?.[currentUserId] ===
                                          pickerLabel &&
                                          styles.reactionItemActive,
                                      ]}
                                      onPress={() =>
                                        handleReaction(
                                          post.id,
                                          pickerLabel,
                                          true,
                                          reply.id
                                        )
                                      }
                                    >
                                      <Text style={{ fontSize: 14, marginRight: 4 }}>
                                        {pickerLabel}
                                      </Text>
                                      <Text style={styles.reactionCount}>
                                        {count}
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
                      <TextInput
                        style={styles.replyAuthorInput}
                        placeholder="あなたの名前"
                        value={newReply.author}
                        onChangeText={(text) =>
                          setNewReply({ ...newReply, author: text })
                        }
                        maxLength={20}
                      />
                      <View style={styles.replyFormButtons}>
                        <TouchableOpacity
                          style={styles.replyCancel}
                          onPress={() => {
                            setReplyMode(null);
                            setNewReply({ content: "", author: "" });
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
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>{" "}
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
              </TouchableOpacity>
            </View>{" "}
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>投稿者名</Text>
                <TextInput
                  style={styles.input}
                  placeholder="あなたの名前を入力"
                  value={newPost.author}
                  onChangeText={(text) =>
                    setNewPost({ ...newPost, author: text })
                  }
                  maxLength={20}
                  returnKeyType="done"
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
                <Text style={styles.submitButtonText}>投稿する</Text>
              </TouchableOpacity>
            </View>
          </View>        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}