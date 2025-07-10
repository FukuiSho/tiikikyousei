import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../src/firebase";
import { AuthContext } from "./index";

// アカウント関連
export const AuthContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
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
        <Signup />
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

// Googleログインの場合
/* import { useAuthContext } from "../(tabs)/index";

export default function SignupScreen() {
  const { login, loading } = useAuthContext();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rigeeへようこそ!</Text>
      <Text style={styles.subtitle}>ログインまたは新規登録してくだせ</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#6200EE" />
      ) : (
        <Button title="Googleでログイン/登録" onPress={login} color="#6200EE" />
      )}
    </View>
  );
}*/

// メールアドレス/パスワードでの場合
const Signup: React.FC = () => {
  // 各入力欄の値を保持するstate
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true); // True：ログインモード、False：新規登録モード

  // 各操作（ログイン・新規登録）中のローディング状態
  const { signup, login, loading: authLoading } = useAuthContext();
  const [isLoadingOperation, setIsLoadingOperation] = useState<boolean>(false); // 個別操作のローディング状態

  // 「登録する」か「ログインする」ボタンが押された時の処理
  const handleAuth = async () => {
    setIsLoadingOperation(true); // 操作開始

    try {
      if (isLoginMode) {
        // ログインモード
        if (!email || !password) {
          Alert.alert(
            "エラー",
            "メールアドレスとパスワードを入力してください。"
          );
          return;
        }
        await login(email, password);
      } else {
        // 新規登録モード
        if (password !== confirmPassword) {
          Alert.alert("エラー", "パスワードと確認用パスワードが一致しません。");
          return;
        }

        if (!email || !password || !nickname) {
          Alert.alert("エラー", "すべての項目を入力してください。");
          return;
        }
        await signup(email, password, nickname);
      }
    } catch (error) {
      console.log("Auth operation failed in SignupScreen:", error);
    } finally {
      setIsLoadingOperation(false); // 操作終了
    }
  };

  // ログイン/新規登録モードの切り替え
  const toggleAuthMode = () => {
    setIsLoginMode((prevMode) => !prevMode);
    // 切り替え時、フォームリセット処理
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setNickname("");
  };

  const buttonText = isLoadingOperation
    ? isLoginMode
      ? "ログイン中..."
      : "登録中..."
    : isLoginMode
    ? "ログインする"
    : "登録する";

  const isButtonDisabled =
    isLoadingOperation ||
    authLoading ||
    !email ||
    !password ||
    (!isLoginMode && (!confirmPassword || !nickname)); // 新規登録モードではニックネームと確認パスワード必須

  return (
    // SafeAreaViewで画面の安全な領域にコンテンツを配置
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>
          {isLoginMode ? "ログイン" : "アカウント登録"}
        </Text>
        {/* メールアドレス入力欄 */}
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          // メールアドレス入力に特化したキーボードタイプ
          keyboardType="email-address"
          // 入力された文字を自動で大文字にしない
          autoCapitalize="none"
          // 入力値をstateにバインド
          value={email}
          onChangeText={setEmail}
          editable={!isLoadingOperation} // 操作中編集不可
        />
        {/* パスワード入力欄 */}
        <TextInput
          style={styles.input}
          placeholder="パスワード (6文字以上)"
          // 入力値を非表示にする（***** のように表示）
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!isLoadingOperation} // 操作中編集不可
        />

        {/* 新規登録モードでのみ表示*/}
        {!isLoginMode && (
          <>
            {/* パスワード確認入力欄 */}
            <TextInput
              style={styles.input}
              placeholder="パスワード (確認用)"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isLoadingOperation} // 操作中編集不可
            />
            {/* ニックネーム入力欄 */}
            <TextInput
              style={styles.input}
              placeholder="ニックネーム"
              value={nickname}
              onChangeText={setNickname}
              editable={!isLoadingOperation} // 操作中編集不可
            />
          </>
        )}

        {/* ログイン/登録ボタン */}
        <Button
          title={buttonText}
          onPress={handleAuth}
          // すべての項目が入力されていないとボタンを無効にする例
          disabled={isButtonDisabled}
          color={Platform.OS === "ios" ? "#007AFF" : "#2196F3"} // OSによるボタン色の調整例
        />

        {/* モード切り替え */}
        <TouchableOpacity onPress={toggleAuthMode} style={styles.toggleButton}>
          <Text style={styles.toggleButtonText}>
            {isLoginMode
              ? "アカウントをお持ちではないですか？　新規登録"
              : "既にアカウントをお持ちですか？　ログイン"}
          </Text>
        </TouchableOpacity>

        {/* 区切り線またはテキスト */}
        {/*<View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>または</Text>
          <View style={styles.divider} />
        </View>
        */}
        {/* Googleでログインボタン */}
        {/*
        <TouchableOpacity
          style={styles.googleButton}
          onPress={login} // <-- AuthContextから取得したlogin関数を呼び出す
          disabled={loading} // <-- ロード中は無効にする
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" /> // ロード中はインジケーター表示
          ) : (
            <>
              <Ionicons
                name="logo-google"
                size={24}
                color="#FFFFFF"
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>Googleでログイン/登録</Text>
            </>
          )}
        </TouchableOpacity>
        }
        */}
        {/* 他の要素（ログインリンクなど）はここに追加*/}
      </View>
    </SafeAreaView>
  );
};

// スタイルシート
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f8f8", // 背景色
  },
  container: {
    flex: 1,
    justifyContent: "center", // 垂直方向の中央揃え
    alignItems: "center", // 水平方向の中央揃え
    padding: 20, // パディング
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30, // タイトルの下部にスペース
  },
  input: {
    width: "100%", // 親要素の幅いっぱいに
    padding: 12, // 入力欄の内側のパディング
    marginBottom: 15, // 各入力欄の下部のスペース
    borderWidth: 1, // 枠線
    borderColor: "#ccc", // 枠線の色
    borderRadius: 8, // 角の丸み
    backgroundColor: "#fff", // 入力欄の背景色
    fontSize: 16,
  },
  subtitle: {
    marginBottom: 15,
    fontSize: 16,
  },
  toggleButton: {
    marginTop: 20,
  },
  toggleButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },
});

const authStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
});

export default Signup;
