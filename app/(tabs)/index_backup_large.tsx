import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
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
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

// ========== 型定義 ==========

/**
 * 投稿の型定義
 */
interface Post {
  id: string;
  content: string;
  image?: string; // 画像のURI（オプション）
  imagePosition?: {
    // 地図上での画像表示位置（オプション）
    x: number;
    y: number;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
  author: string;
  replies?: Reply[];
  reactions?: {
    [userId: string]: string; // userId -> emoji
  };
  reactionCounts?: {
    [emoji: string]: number; // emoji -> count
  };
}

/**
 * リプライの型定義
 */
interface Reply {
  id: string;
  content: string;
  author: string;
  timestamp: Date;
}

const { width, height } = Dimensions.get("window");

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // 投稿関連
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState({
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
  const [newReply, setNewReply] = useState({
    content: "",
    author: "",
  });
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
      setLocation(currentLocation);

      // テスト用の投稿を追加
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
  // ========== 投稿関連の関数 ==========

  /**
   * 新しい投稿を作成する関数
   */
  const handleCreatePost = () => {
    // 入力内容の検証（テキストまたは画像のどちらかが必要）
    if ((!newPost.content.trim() && !selectedImage) || !newPost.author.trim()) {
      Alert.alert(
        "エラー",
        "テキストまたは画像、および投稿者名を入力してください"
      );
      return;
    }

    // 位置情報の確認
    if (!location) {
      Alert.alert("エラー", "位置情報が取得できません");
      return;
    }

    // 新しい投稿オブジェクトを作成
    const post: Post = {
      id: Date.now().toString(),
      content: newPost.content,
      author: newPost.author,
      image: selectedImage || undefined, // 選択された画像があれば追加
      imagePosition: imagePosition || undefined, // 画像の位置情報があれば追加
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      timestamp: new Date(),
      reactions: {},
      reactionCounts: {},
    };

    // 投稿をリストに追加
    setPosts([...posts, post]);

    // フォームと画像選択状態をリセット
    setNewPost({ content: "", author: "", image: "" });
    setSelectedImage(null);
    setImagePosition(null);
    setModalVisible(false);
    Alert.alert("成功", "投稿が作成されました！");
  };

  /**
   * 投稿作成をキャンセルする関数
   */
  const handleCancelPost = () => {
    // フォームと画像選択状態をリセット
    setNewPost({ content: "", author: "", image: "" });
    setSelectedImage(null);
    setImagePosition(null);
    setModalVisible(false);
  };

  /**
   * 同じ座標の投稿のマーカー位置をずらす関数
   */
  const getOffsetCoordinates = (post: Post, index: number) => {
    // 同じ座標の投稿を見つける
    const sameLocationPosts = posts.filter(
      (p) =>
        Math.abs(p.location.latitude - post.location.latitude) < 0.00001 &&
        Math.abs(p.location.longitude - post.location.longitude) < 0.00001
    );

    if (sameLocationPosts.length <= 1) {
      return post.location; // 単独の投稿はそのまま
    }

    // 同じ座標の投稿のインデックスを取得
    const sameLocationIndex = sameLocationPosts.findIndex(
      (p) => p.id === post.id
    );

    // 円形にマーカーを配置するための角度計算
    const angle = (sameLocationIndex * 2 * Math.PI) / sameLocationPosts.length;
    const radius = 0.0001; // 約10mの半径

    return {
      latitude: post.location.latitude + radius * Math.cos(angle),
      longitude: post.location.longitude + radius * Math.sin(angle),
    };
  };

  /**
   * 地図上のマーカーをタップした時の処理
   * 投稿の種類に関係なく、常にリプライ欄（メッセージリスト）に移動する
   */
  const handleMarkerPress = (post: Post) => {
    setSelectedPost(post);
    setMessageListVisible(true);

    // マップの位置を調整：マップ全体を下に移動して投稿位置を画面上部に表示
    // メッセージリストが画面の下半分を占めるので、マップの中心を北（上）に移動
    const offsetLatitude = -0.001; // 緯度のオフセット（北に移動してマップ全体を下げる）

    mapRef.current?.animateToRegion(
      {
        latitude: post.location.latitude + offsetLatitude,
        longitude: post.location.longitude,
        latitudeDelta: 0.0005, // 約100m範囲（超高倍率）
        longitudeDelta: 0.0005, // 約100m範囲（超高倍率）
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
          latitudeDelta: 0.002, // 通常表示を高倍率に変更（約500m範囲）
          longitudeDelta: 0.002, // 通常表示を高倍率に変更（約500m範囲）
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
      setSelectedPost(null);
    });
  };

  const getPostsForLocation = () => {
    if (!selectedPost) return [];
    // 選択された投稿の近くの投稿を取得（半径1km以内など）
    return posts.filter((post) => {
      const distance = Math.sqrt(
        Math.pow(post.location.latitude - selectedPost.location.latitude, 2) +
          Math.pow(post.location.longitude - selectedPost.location.longitude, 2)
      );
      return distance < 0.01; // 約1km
    });
  };
  /**
   * 現在選択されている投稿を取得する関数
   */
  const getCurrentPost = () => {
    return selectedPost;
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

    // 入力フィールドをクリアしてリプライモードを終了
    setNewReply({ content: "", author: "" });
    setReplyMode(null);
    Alert.alert("成功", "返信が投稿されました！");
  };

  // ========== リアクション関連の関数 ==========

  /**
   * 投稿にリアクションを追加/削除する関数
   * @param postId 投稿ID
   * @param emoji リアクションの絵文字
   */
  const handleReaction = (postId: string, emoji: string) => {
    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          // 投稿のリアクション処理
          const reactions = { ...(post.reactions || {}) };
          const reactionCounts = { ...(post.reactionCounts || {}) };

          // 既存のリアクションを確認
          const currentReaction = reactions[currentUserId];

          if (currentReaction === emoji) {
            // 同じ絵文字の場合は削除
            delete reactions[currentUserId];
            reactionCounts[emoji] = Math.max(
              0,
              (reactionCounts[emoji] || 0) - 1
            );
            if (reactionCounts[emoji] === 0) {
              delete reactionCounts[emoji];
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
            reactions[currentUserId] = emoji;
            reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
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
  };

  /**
   * リアクション選択画面を表示する関数
   */
  const showReactionPicker = (postId: string) => {
    const reactions = ["👍", "❤️", "😊", "😂", "😮", "😢"];
    const buttons = reactions.map((emoji) => ({
      text: emoji,
      onPress: () => handleReaction(postId, emoji),
    }));

    buttons.push({
      text: "キャンセル",
      onPress: () => {},
    });

    Alert.alert("リアクションを選択", "", buttons, { cancelable: true });
  };

  // ========== 画像選択関連の関数 ==========

  /**
   * フォトライブラリから画像を選択する関数
   */
  const selectImageFromLibrary = async () => {
    try {
      // フォトライブラリのアクセス許可を要求
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("エラー", "フォトライブラリへのアクセス許可が必要です");
        return;
      }

      // 画像を選択
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      // 選択された画像を状態に保存
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setNewPost({ ...newPost, image: result.assets[0].uri });
      }
    } catch {
      Alert.alert("エラー", "画像の選択に失敗しました");
    }
  };

  /**
   * カメラで画像を撮影する関数
   */
  const selectImageFromCamera = async () => {
    try {
      // カメラのアクセス許可を要求
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("エラー", "カメラへのアクセス許可が必要です");
        return;
      }

      // カメラを起動
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      // 撮影された画像を状態に保存
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setNewPost({ ...newPost, image: result.assets[0].uri });
      }
    } catch {
      Alert.alert("エラー", "カメラの起動に失敗しました");
    }
  };

  /**
   * 画像選択方法のオプションを表示する関数
   */
  const showImagePickerOptions = () => {
    Alert.alert("画像を選択", "画像の取得方法を選択してください", [
      { text: "カメラ", onPress: selectImageFromCamera },
      { text: "フォトライブラリ", onPress: selectImageFromLibrary },
      { text: "キャンセル", style: "cancel" },
    ]);
  };

  /**
   * 選択された画像を削除する関数
   */
  const removeSelectedImage = () => {
    setSelectedImage(null);
    setNewPost({ ...newPost, image: "" });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>地域共生アプリ</Text>
      </View>{" "}
      {/* 地図エリア */}
      <View style={styles.mapContainer}>
        {location ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.005, // 初期表示も高倍率に変更
              longitudeDelta: 0.005, // 初期表示も高倍率に変更
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
            {posts.map((post, index) => {
              const coordinate = getOffsetCoordinates(post, index);
              return (
                <Marker
                  key={post.id}
                  coordinate={coordinate}
                  title={post.author}
                  description={`${post.content.substring(0, 50)}...`}
                  onPress={() => handleMarkerPress(post)}
                  pinColor={post.image ? "#FF6B6B" : "#007AFF"}
                />
              );
            })}
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
          </View>{" "}
          {/* コメントリスト */}
          <ScrollView style={styles.messageList}>
            {/* 選択された投稿の詳細表示 */}
            {getCurrentPost() && (
              <View style={styles.messageItemContainer}>
                <View style={styles.messageItem}>
                  {/* ユーザーアイコン */}
                  <View style={styles.userIcon}>
                    <Ionicons name="person" size={20} color="#666" />
                  </View>

                  {/* メッセージ内容 */}
                  <View style={styles.messageContent}>
                    <Text style={styles.userName}>
                      {getCurrentPost()!.author}
                    </Text>
                    {getCurrentPost()!.content && (
                      <Text style={styles.messageText}>
                        {getCurrentPost()!.content}
                      </Text>
                    )}
                    {/* 画像表示 */}
                    {getCurrentPost()!.image && (
                      <Image
                        source={{ uri: getCurrentPost()!.image }}
                        style={styles.messageImage}
                        resizeMode="cover"
                      />
                    )}
                    <Text style={styles.messageTime}>
                      {getCurrentPost()!.timestamp.toLocaleString("ja-JP")}
                    </Text>
                  </View>

                  {/* アイコン群 */}
                  <View style={styles.messageIcons}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() =>
                        setReplyMode(
                          replyMode === getCurrentPost()!.id
                            ? null
                            : getCurrentPost()!.id
                        )
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
                      onPress={() => showReactionPicker(getCurrentPost()!.id)}
                    >
                      <Ionicons name="heart-outline" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* リアクション表示 */}
                {getCurrentPost()!.reactionCounts &&
                  Object.keys(getCurrentPost()!.reactionCounts || {}).length >
                    0 && (
                    <View style={styles.reactionsDisplay}>
                      {Object.entries(
                        getCurrentPost()!.reactionCounts || {}
                      ).map(([emoji, count]) => (
                        <TouchableOpacity
                          key={emoji}
                          style={[
                            styles.reactionItem,
                            getCurrentPost()!.reactions?.[currentUserId] ===
                              emoji && styles.reactionItemActive,
                          ]}
                          onPress={() =>
                            handleReaction(getCurrentPost()!.id, emoji)
                          }
                        >
                          <Text style={styles.reactionEmoji}>{emoji}</Text>
                          <Text style={styles.reactionCount}>
                            {count as number}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                {/* リプライ数表示 */}
                {getCurrentPost()!.replies &&
                  getCurrentPost()!.replies!.length > 0 && (
                    <TouchableOpacity
                      style={styles.replyToggle}
                      onPress={() => toggleReplies(getCurrentPost()!.id)}
                    >
                      <Text style={styles.replyToggleText}>
                        {expandedReplies.has(getCurrentPost()!.id)
                          ? "返信を隠す"
                          : `返信を表示 (${getCurrentPost()!.replies!.length}件)`}
                      </Text>
                    </TouchableOpacity>
                  )}

                {/* リプライリスト */}
                {expandedReplies.has(getCurrentPost()!.id) &&
                  getCurrentPost()!.replies && (
                    <View style={styles.repliesContainer}>
                      {getCurrentPost()!.replies!.map((reply: Reply) => (
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
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                {/* リプライ入力フォーム */}
                {replyMode === getCurrentPost()!.id && (
                  <View style={styles.replyForm}>
                    <TextInput
                      style={styles.replyInput}
                      placeholder="テキスト"
                      placeholderTextColor="#C4C4C4"
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
                      placeholderTextColor="#C4C4C4"
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
                        onPress={() => handleReplySubmit(getCurrentPost()!.id)}
                      >
                        <Text style={styles.replySubmitText}>返信</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {!getCurrentPost() && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  投稿を選択してください
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
            {/* モーダルヘッダー */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>新しい投稿</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCancelPost}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* モーダル本体 */}
            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>内容（任意）</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="投稿の内容を入力（画像のみでも投稿可能）"
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

              {/* ========== 画像選択セクション ========== */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>画像</Text>
                {/* 画像選択ボタン */}
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={showImagePickerOptions}
                >
                  <Text style={styles.imagePickerText}>
                    {selectedImage ? "画像を変更" : "画像を選択"}
                  </Text>
                  {/* 画像削除ボタン */}
                  {selectedImage && (
                    <TouchableOpacity
                      style={styles.imageRemoveButton}
                      onPress={removeSelectedImage}
                    >
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {/* 選択された画像のプレビュー */}
                {selectedImage && (
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.selectedImage}
                    resizeMode="cover"
                  />
                )}
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
        </KeyboardAvoidingView>
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
  // 画像選択関連のスタイル
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  imagePickerText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  imageRemoveButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  // メッセージ画像のスタイル
  messageImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  // リアクション関連のスタイル
  reactionsDisplay: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 52,
    paddingVertical: 4,
    marginBottom: 4,
  },
  reactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  reactionItemActive: {
    backgroundColor: "#e3f2fd",
    borderWidth: 1,
    borderColor: "#2196f3",
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
});
