// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      {/* ★ここが重要です！ログイン画面を一番上に記述してください。 */}
      {/* (auth)グループが読み込まれた際に、最初にlogin.tsxが表示されます。 */}
      <Stack.Screen name="login" options={{ headerShown: false }} />

      {/* アカウント登録画面 */}
      <Stack.Screen name="signup" options={{ headerShown: false }} />

      {/* 他の認証関連画面（例: パスワードリセット）があればここに追加 */}
    </Stack>
  );
}