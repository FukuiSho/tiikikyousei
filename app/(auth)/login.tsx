// app/(auth)/login.tsx
import { Link } from 'expo-router'; // ★ これが画面遷移に必要
import React, { useState } from 'react';
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
} from 'react-native';

// コンポーネント名をLoginScreen (大文字始まり) に修正
const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const handleLogin = () => {
    // ... （ログイン処理ロジック）
    Alert.alert(
      'ログイン試行',
      `メールアドレス: ${email}\nパスワード: ${password}`,
      [{ text: 'OK', onPress: () => console.log('ログイン完了シミュレーション') }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>ログイン</Text>
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="パスワード"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button
          title="ログイン"
          onPress={handleLogin}
          disabled={!email || !password}
          color={Platform.OS === 'ios' ? '#007AFF' : '#2196F3'}
        />
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>アカウントをお持ちでないですか？ </Text>
          {/* Linkのhrefは、同じ(auth)グループ内の signup.tsx を指すため、シンプルに "/signup" */}
          <Link href="/signup" asChild>
            <TouchableOpacity>
              <Text style={styles.signupLink}>新規登録</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f8f8' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30 },
  input: {
    width: '100%', padding: 12, marginBottom: 15, borderWidth: 1,
    borderColor: '#ccc', borderRadius: 8, backgroundColor: '#fff', fontSize: 16,
  },
  signupContainer: { marginTop: 20, flexDirection: 'row', alignItems: 'center' },
  signupText: { fontSize: 16, color: '#666' },
  signupLink: { fontSize: 16, color: '#007AFF', fontWeight: 'bold' },
});

export default LoginScreen; // コンポーネント名をLoginScreen (大文字始まり) でエクスポート