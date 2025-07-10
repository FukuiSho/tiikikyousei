// C:\Users\hibik\.vscode\tiikikyousei\app\_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* アプリ起動時に最初に表示される認証グループ */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* 認証が完了した後に表示されるメインアプリのグループ */}
        <Stack.Screen name="(app)" options={{ headerShown: false }} />

        {/* 存在しないルートが呼び出された場合のフォールバック画面 */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}