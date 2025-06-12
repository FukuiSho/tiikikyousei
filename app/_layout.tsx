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
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/*
          ★ここを変更しました！
          「signup」ルートを一番上に配置することで、アプリ起動時に最初に表示されます。
          headerShown: false は、画面上部のヘッダーを非表示にする設定です。
        */}
        <Stack.Screen name="signup" options={{ headerShown: false }} />

        {/* ユーザーがログインした後に遷移する、タブナビゲーションのルートです */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* 存在しないルートが呼び出された場合に表示される画面です */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
