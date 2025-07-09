import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
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
import { auth, db } from "../../src/firebase";
import SignupScreen from "./signup";

import { MapComponentWrapper } from "../../components/MapComponentWrapper";
import { MessageListComponent } from "../../components/MessageListComponent";
import { PostModalComponent } from "../../components/PostModalComponent";
import { styles } from "../../components/utils/styles";
import { NewPost, NewReply, Post, Reply } from "../../components/utils/types";

// 型とコンポーネントのインポート
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  loginUser: User | null | undefined; // ログイン済｜未ログイン｜ロード中
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean; // ローディング状態
  signup: (email: string, password: string, nickname: string) => Promise<void>;
}
const AuthContext = createContext<AuthContextType | null>(null);
// import { getOffsetCoordinates } from '../../components/utils/locationUtils'; // 現在未使用
import {
  selectImageFromCamera,
  selectImageFromLibrary,
  showImagePickerOptions,
} from "../../components/utils/imageUtils";
import { showReactionPicker } from "../../components/utils/reactionUtils";

const { height } = Dimensions.get("window");

// アカウント関連
const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [loginUser, setLoginUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // ロード状態

  // Googleアカウントログイン関連の遺物
  // Google認証設定
  /*const [request, response, promptAsync] = Google.useAuthRequest({
    // IMPORTANT: Use your Web client ID from Google Cloud Console
    // This is NOT the Android/iOS client ID. It's the one for "Web application".
    // Example: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com'
    androidClientId:
      "303304465881-9ninlcjd3oaf7m834e38rseprm1kh6jl.apps.googleusercontent.com",
    webClientId:
      "303304465881-ali1oac1jd5rf12mdpvak6b61886i6pf.apps.googleusercontent.com",
    scopes: ["profile", "email"],
    // If you are testing in a standalone build or want more control,
    // you might also need to set iosClientId, androidClientId.
    // But for Firebase Auth, webClientId is often enough if it's correctly configured.
  });
  */

  // FirebaseAuthentication状態変化の確認
  useEffect(() => {
    // onAuthStateChangedでユーザーのログイン状態が変化時、呼び出し
    // アプリ起動時にも現在のログイン状態を通知
    const subscriber = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoginUser(firebaseUser as User | null);
      setLoading(false); // 認証確認終了時ロード終了
    });
    // クリーンアップ
    return subscriber;
  }, []);

  // メールアドレス/パスワードでの場合
  // サインアップ
  const signup = async (email: string, password: string, nickname: string) => {
    setLoading(true); // サインアップ処理開始時
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      // ユーザ表示名更新
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: nickname,
        });

        // Firestoreにユーザ情報を保存
        await setDoc(
          doc(db, "users", userCredential.user.uid),
          {
            displayName: nickname,
            photoURL: userCredential.user.photoURL || null,
            email: userCredential.user.email,
            createdAt: new Date(),
          },
          { merge: true } // 既存フィールドは上書きせず更新・追加
        );
        Alert.alert(
          "True SignUp 登録完了",
          "アカウントが正常に作成されました。"
        );
      }
    } catch (error: any) {
      let errorMessage = "SignUpError アカウント登録に失敗しました。";
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "このメールアドレスは既に使用されています。";
          break;
        case "auth/invalid-email":
          errorMessage = "メールアドレスの形式が正しくありません。";
          break;
        case "auth/operation-not-allowed":
          errorMessage =
            "現在メールアドレス/パスワードでの登録は許可されていません。管理者に確認してください。";
          break;
        case "auth/weak-password":
          errorMessage =
            "パスワードが弱すぎます。6文字以上のより強力なパスワードに設定してください。";
          break;
        default:
          console.error("Firebase SignUp error:", error);
          break;
      }
      Alert.alert("登録エラー", errorMessage);
      throw error; // errorを呼び出し元に伝える
    } finally {
      setLoading(false); // 新規登録処理終了時
    }
  };

  // ログイン
  const login = async (email: string, password: string) => {
    setLoading(true); // ログイン処理開始時
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert("True Login ログイン成功", "ようこそ"); // 成功時、loginUserが更新
    } catch (error: any) {
      let errorMessage = "LoginError ログインに失敗しました。";
      switch (error.code) {
        case "auth/invalid-email":
          errorMessage = "無効なメールアドレスです。";
          break;
        case "auth/user-disabled":
          errorMessage = "このアカウントは無効化されています。";
          break;
        case "auth/user-not-found":
          errorMessage = "ユーザが見つかりません。";
          break;
        case "auth/wrong-password":
          errorMessage = "パスワードが違います。";
          break;
        default:
          console.error("Firebase Login error:", error);
          break;
      }
      Alert.alert("ログインエラー", errorMessage);
      throw error; // errorを呼び出し元に伝える
    } finally {
      setLoading(false); // ログイン処理終了時
    }
  };

  // ログアウト
  const logout = async () => {
    setLoading(true); // ログアウト処理開始時
    try {
      await signOut(auth);
      Alert.alert("Logout ログアウト", "ログアウトしました。");
    } catch (error: any) {
      console.error("Logout error:", error);
      Alert.alert(
        "Logout error ログアウトエラー",
        `ログアウト中に問題が発生しました: ${error.message}`
      );
    }
  };

  // Googleログインの場合（遺物）
  /*
  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.authentication;
      if (id_token) {
        const credentual = GoogleAuthProvider.credential(id_token);
        signInWithCredential(auth, credentual)
          .then(async (result) => {
            // Firestoreにユーザ情報を保存
            if (result.user.uid) {
              await setDoc(
                doc(db, "users", result.user.uid),
                {
                  displayName: result.user.displayName,
                  photoURL: result.user.photoURL,
                  email: result.user.email,
                },
                { merge: true }
              );
            }
            Alert.alert("True sign-in");
          })
          .catch((error) => {
            console.error("Firebase sign-in error:", error);
          });
      }
    } else if (response?.type === "error") {
      console.error("Google Auth error:", response.error);
    }
  }, [response]); // responseが変わるたびに実行

  const login = async () => {
    try {
      if (!request) {
        Alert.alert("ninsyo error");
        return;
      }
      // ブラウザ開くトリガー
      await promptAsync();
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert("Login error", `Login problem:${error.message}`);
    }
  };
  const logout = async () => {
    try {
      await signOut(auth);
      //setLoginUser(null);
      Alert.alert("Logout");
    } catch (error: any) {
      console.error("Logout error:", error);
      Alert.alert("Logout error", `Logout problem:${error.message}`);
    }
  };
  */

  const value = {
    loginUser,
    login,
    logout,
    loading,
    signup,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <View style={authStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200EE" />
          <Text style={{ marginTop: 10 }}>認証状態確認中...</Text>
        </View>
      ) : loginUser ? (
        children
      ) : (
        <SignupScreen />
      )}
    </AuthContext.Provider>
  );
};
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      "useAuthContext must be used within an AuthContextProvider"
    );
  }
  return context;
};

function HomeScreen() {
  // ========== 状態変数 ==========
  // ユーザのログイン情報とログアウト関数を取得
  const { loginUser, logout } = useAuthContext();

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
    author: loginUser?.displayName || "",
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
    author: loginUser?.displayName || "",
  });
  const [currentUserId] = useState(loginUser?.uid || "user-" + Date.now());
  // アニメーション用の値
  const slideAnim = useRef(new Animated.Value(height * 0.5)).current;
  const mapRef = useRef<any>(null);

  // Firebase接続確認＆データの取得してLog出力
  /*useEffect(() => {
    const fetchDataFromFirestore = async () => {
      try {
        console.log("Firebase app initialized:", app.name);
        console.log("Firestore instance:", db); // dbオブジェクトが利用可能か確認
        //console.log("Firebase Authentication instance:", auth); // authオブジェクトが利用可能か確認

        const querySnapshot = await getDocs(collection(db, "users"));
        console.log("--- Documents in 'users' collection ---");
        querySnapshot.forEach((doc) => {
          console.log(`${doc.id} => `, doc.data()); // ドキュメントのIDとデータをログに出力
        });
        console.log("--------------------------------------");
      } catch (error) {
        console.error("Error fetching or adding data: ", error);
      }
    };

    fetchDataFromFirestore(); // 関数実行
  }, []);*/
  // ========== 初期化とライフサイクル ==========
  useEffect(() => {
    // ログインユーザ名が更新されるとnewPost,newReplyのauthorも更新
    setNewPost((prev) => ({ ...prev, author: loginUser?.displayName || "" }));
    setNewReply((prev) => ({ ...prev, author: loginUser?.displayName || "" }));
  }, [loginUser]);

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
  const handleCreatePost = async () => {
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

    try {
      // Firestoreに書き込み
      const docRef = await addDoc(collection(db, "posts"), {
        content: newPost.content,
        author: newPost.author,
        authorUid: loginUser?.uid,
        Image: selectedImage || null,
        imagePosition: imagePosition || null,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        timestamp: new Date(),
        reactions: {},
        reactionCounts: {},
      });
      // Firestoreを基に投稿のUI更新
      const post: Post = {
        id: docRef.id,
        content: newPost.content,
        author: newPost.author,
        authorUid: loginUser?.uid,
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
      setNewPost({
        content: "",
        author: loginUser?.displayName || "",
        image: "",
      });
      setSelectedImage(null);
      setImagePosition(null);
      setModalVisible(false);

      // 成功メッセージは非同期で表示（UIをブロックしない）
      setTimeout(() => {
        Alert.alert("成功", "投稿が作成されました！");
      }, 100);
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("エラー", "投稿の作成に失敗しました。");
    }
  };

  const handleCancelPost = () => {
    setNewPost({
      content: "",
      author: loginUser?.displayName || "",
      image: "",
    });
    setSelectedImage(null);
    setImagePosition(null);
    setModalVisible(false);
  };

  // ========== 地図関連の関数 ==========
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
  const handleReplySubmit = async (postId: string) => {
    if (!newReply.content.trim() || !newReply.author.trim()) {
      Alert.alert("エラー", "内容と投稿者名を入力してください");
      return;
    }

    try {
      // Firestoreにリプライを書き込み
      const docRef = await addDoc(collection(db, "posts", postId, "replies"), {
        content: newReply.content,
        author: newReply.author,
        authorUid: loginUser?.uid,
        timestamp: new Date(),
        reactions: {},
        reactionCounts: {},
      });

      const reply: Reply = {
        id: docRef.id,
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
      setNewReply({ content: "", author: loginUser?.displayName || "" });
      setReplyMode(null);

      // 成功メッセージは非同期で表示（UIをブロックしない）
      setTimeout(() => {
        Alert.alert("成功", "返信が投稿されました！");
      }, 100);
    } catch (error) {
      console.error("Error creating reply:", error);
      Alert.alert("エラー", "返信の投稿に失敗しました。");
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>地域共生アプリ</Text>
        {loginUser && (
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>ログアウト</Text>
          </TouchableOpacity>
        )}
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

const authStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
});

export default function AppWrapper() {
  return (
    <AuthContextProvider>
      <HomeScreen />
      <StatusBar style="auto" />
    </AuthContextProvider>
  );
}
