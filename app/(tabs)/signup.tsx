import React, { useState } from "react";
import {
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
import { useAuthContext } from "./index";

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

export default Signup;
