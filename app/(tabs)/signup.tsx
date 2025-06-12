import React, { useState } from 'react';
import {
  Alert,
  Button, // 画面上部のノッチやステータスバーを考慮
  Platform, // 登録ボタンタップ時の簡易的なフィードバック用
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const SignupScreen: React.FC = () => {
  // 各入力欄の値を保持するstate
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');

  // 「登録する」ボタンが押された時の処理
  const handleSignup = () => {
    // ここに登録処理のロジックを記述します。
    // 例: 入力値のバリデーション、APIへの送信など

    if (password !== confirmPassword) {
      Alert.alert('エラー', 'パスワードと確認用パスワードが一致しません。');
      return;
    }

    if (!email || !password || !nickname) {
      Alert.alert('エラー', 'すべての項目を入力してください。');
      return;
    }

    // ここで実際の登録処理（FirebaseやFastAPIなどへの連携）を行います
    // 成功/失敗に応じてアラートや画面遷移を行います

    Alert.alert(
      '登録試行',
      `
      メールアドレス: ${email}
      パスワード: ${password}
      ニックネーム: ${nickname}
      `,
      [
        { text: 'OK', onPress: () => console.log('登録完了シミュレーション') }
      ]
    );

    // 登録成功後の画面遷移などはここに追加します
  };

  return (
    // SafeAreaViewで画面の安全な領域にコンテンツを配置
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>アカウント登録</Text>

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
        />

        {/* パスワード入力欄 */}
        <TextInput
          style={styles.input}
          placeholder="パスワード (6文字以上)"
          // 入力値を非表示にする（***** のように表示）
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* パスワード確認入力欄 */}
        <TextInput
          style={styles.input}
          placeholder="パスワード (確認用)"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {/* ニックネーム入力欄 */}
        <TextInput
          style={styles.input}
          placeholder="ニックネーム"
          value={nickname}
          onChangeText={setNickname}
        />

        {/* 登録ボタン */}
        <Button
          title="登録する"
          onPress={handleSignup}
          // すべての項目が入力されていないとボタンを無効にする例
          disabled={!email || !password || !confirmPassword || !nickname}
          color={Platform.OS === 'ios' ? '#007AFF' : '#2196F3'} // OSによるボタン色の調整例
        />

        {/* 他の要素（ログインリンクなど）はここに追加できます */}
      </View>
    </SafeAreaView>
  );
};

// スタイルシート
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f8', // 背景色
  },
  container: {
    flex: 1,
    justifyContent: 'center', // 垂直方向の中央揃え
    alignItems: 'center',   // 水平方向の中央揃え
    padding: 20,            // パディング
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30, // タイトルの下部にスペース
  },
  input: {
    width: '100%',          // 親要素の幅いっぱいに
    padding: 12,            // 入力欄の内側のパディング
    marginBottom: 15,       // 各入力欄の下部のスペース
    borderWidth: 1,         // 枠線
    borderColor: '#ccc',    // 枠線の色
    borderRadius: 8,        // 角の丸み
    backgroundColor: '#fff',// 入力欄の背景色
    fontSize: 16,
  },
});

export default SignupScreen;