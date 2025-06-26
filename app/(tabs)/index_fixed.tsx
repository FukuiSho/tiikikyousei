import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

interface Post {
  id: string;
  title: string;
  content: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
  author: string;
  replies?: Reply[];
}

interface Reply {
  id: string;
  content: string;
  author: string;
  timestamp: Date;
}

const { width, height } = Dimensions.get("window");

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
    title: "",
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

  // アニメーション用の値（初期値は画面外の下に設定）
  const slideAnim = useRef(new Animated.Value(height * 0.5)).current;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("エラー", "位置情報の許可が必要です");
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);

      // テスト用の投稿を追加
      const testPost: Post = {
        id: "test-1",
        title: "テスト投稿",
        content: "これはテスト投稿です。",
        author: "テストユーザー",
        location: {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        },
        timestamp: new Date(),
        replies: [],
      };
      setPosts([testPost]);
    })();
  }, []);

  const handleCreatePost = () => {
    if (
      !newPost.title.trim() ||
      !newPost.content.trim() ||
      !newPost.author.trim()
    ) {
      Alert.alert("エラー", "全ての項目を入力してください");
      return;
    }

    if (!location) {
      Alert.alert("エラー", "位置情報が取得できません");
      return;
    }

    const post: Post = {
      id: Date.now().toString(),
      title: newPost.title,
      content: newPost.content,
      author: newPost.author,
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      timestamp: new Date(),
      replies: [],
    };

    setPosts([...posts, post]);
    setNewPost({ title: "", content: "", author: "" });
    setModalVisible(false);
    Alert.alert("成功", "投稿が作成されました！");
  };

  const handleCancelPost = () => {
    setNewPost({ title: "", content: "", author: "" });
    setModalVisible(false);
  };

  const handleMarkerPress = (post: Post) => {
    setSelectedLocation(post.location);
    setMessageListVisible(true);

    // 下から上にスライドインアニメーション
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleCloseMessageList = () => {
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

    setNewReply({ content: "", author: "" });
    setReplyMode(null);
    Alert.alert("成功", "返信が投稿されました！");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>地域共生アプリ</Text>
      </View>

      {/* 地図エリア */}
      <View style={styles.mapContainer}>
        {location ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
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
                title={post.title}
                description={`${post.content.substring(0, 50)}...`}
                onPress={() => handleMarkerPress(post)}
              />
            ))}
          </MapView>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>位置情報を取得中...</Text>
          </View>
        )}
      </View>

      {/* メッセージリストエリア */}
      {messageListVisible && (
        <Animated.View
          style={[
            styles.messageListContainer,
            {
              transform: [{ translateY: slideAnim }],
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
          <ScrollView style={styles.messageList}>
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
                  </View>

                  {/* アイコン群 */}
                  <View style={styles.messageIcons}>
                    <TouchableOpacity style={styles.iconButton}>
                      <Ionicons name="camera-outline" size={16} color="#666" />
                    </TouchableOpacity>
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
                    <TouchableOpacity style={styles.iconButton}>
                      <Ionicons name="person-outline" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

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
                )}

                {/* リプライリスト */}
                {expandedReplies.has(post.id) && post.replies && (
                  <View style={styles.repliesContainer}>
                    {post.replies.map((reply) => (
                      <View key={reply.id} style={styles.replyItem}>
                        <View style={styles.replyIcon}>
                          <Ionicons name="person" size={16} color="#888" />
                        </View>
                        <View style={styles.replyContent}>
                          <Text style={styles.replyUserName}>
                            {reply.author}
                          </Text>
                          <Text style={styles.replyText}>{reply.content}</Text>
                          <Text style={styles.replyTime}>
                            {reply.timestamp.toLocaleString("ja-JP")}
                          </Text>
                        </View>
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
      )}

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
        onRequestClose={handleCancelPost}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>新しい投稿</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCancelPost}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>タイトル</Text>
                <TextInput
                  style={styles.input}
                  placeholder="投稿のタイトルを入力"
                  value={newPost.title}
                  onChangeText={(text) =>
                    setNewPost({ ...newPost, title: text })
                  }
                  maxLength={50}
                />
              </View>

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
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  // メッセージリストエリア
  messageListContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.5,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  messageListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  messageListTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageItemContainer: {
    marginBottom: 8,
  },
  messageItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  // リプライ関連のスタイル
  replyToggle: {
    paddingHorizontal: 52,
    paddingVertical: 8,
  },
  replyToggleText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  repliesContainer: {
    paddingLeft: 52,
    backgroundColor: "#fafafa",
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  replyItem: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  replyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyUserName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    color: "#555",
    lineHeight: 16,
    marginBottom: 2,
  },
  replyTime: {
    fontSize: 10,
    color: "#999",
  },
  replyForm: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: "white",
    marginBottom: 8,
    minHeight: 60,
    textAlignVertical: "top",
  },
  replyAuthorInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: "white",
    marginBottom: 8,
  },
  replyFormButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  replyCancel: {
    backgroundColor: "#6c757d",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  replyCancelText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  replySubmit: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  replySubmitText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    color: "#999",
  },
  messageIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  // モーダル関連
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: height * 0.8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#6c757d",
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  submitButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "600",
  },
  floatingButton: {
    position: "absolute",
    bottom: 30,
    left: "50%",
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 8,
  },
});
