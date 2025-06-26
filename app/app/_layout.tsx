// app/(app)/_layout.tsx
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack>
      {/* アプリのメイン画面はタブナビゲーション (tabs) です */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* このグループ内での存在しないルートのフォールバック */}
      <Stack.Screen name="+not-found" />
      {/* 他のメインアプリ画面があればここに追加 */}
    </Stack>
  );
}