import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView from "react-native-maps";

// 型とコンポーネントのインポート
import { MapComponent } from "../../components/MapComponent";
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
import {
  handleReaction,
  showReactionPicker,
} from "../../components/utils/reactionUtils";

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
  const mapRef = useRef<MapView>(null);

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

    setPosts([...posts, post]);
    setNewPost({ content: "", author: "", image: "" });
    setSelectedImage(null);
    setImagePosition(null);
    setModalVisible(false);
    Alert.alert("成功", "投稿が作成されました！");
  };

  const handleCancelPost = () => {
    setNewPost({ content: "", author: "", image: "" });
    setSelectedImage(null);
    setImagePosition(null);
    setModalVisible(false);
  };

  // ========== 地図関連の関数 ==========
  const handleMarkerPress = (post: Post) => {
    setSelectedPost(post);
    setMessageListVisible(true);

    if (mapRef.current && location) {
      const offsetLatitude = post.location.latitude + 0.001;
      mapRef.current.animateToRegion(
        {
          latitude: offsetLatitude,
          longitude: post.location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
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
    if (mapRef.current && location) {
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

  // ========== 画像選択関連の関数 ==========
  const handleSelectImageFromLibrary = async () => {
    const imageUri = await selectImageFromLibrary();
    if (imageUri) {
      setSelectedImage(imageUri);
      setNewPost({ ...newPost, image: imageUri });
    }
  };

  const handleSelectImageFromCamera = async () => {
    const imageUri = await selectImageFromCamera();
    if (imageUri) {
      setSelectedImage(imageUri);
      setNewPost({ ...newPost, image: imageUri });
    }
  };

  const handleShowImagePickerOptions = () => {
    showImagePickerOptions(
      handleSelectImageFromLibrary,
      handleSelectImageFromCamera
    );
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setNewPost({ ...newPost, image: "" });
  };

  // ========== リアクション関連の関数 ==========
  const handlePostReaction = (
    postId: string,
    emoji: string,
    isReply: boolean = false,
    replyId?: string
  ) => {
    handleReaction(
      posts,
      setPosts,
      postId,
      emoji,
      currentUserId,
      isReply,
      replyId
    );
  };

  const handleShowReactionPicker = (
    postId: string,
    isReply: boolean = false,
    replyId?: string
  ) => {
    showReactionPicker(postId, handlePostReaction, isReply, replyId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>地域共生アプリ</Text>
      </View>
      {/* 地図エリア */}
      <MapComponent
        location={location}
        posts={posts}
        onMarkerPress={handleMarkerPress}
        mapRef={mapRef}
      />{" "}
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
        onSlideUp={() => {}} // ダミー関数を追加
        onSlideToNormal={() => {}} // ダミー関数を追加
      />
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
