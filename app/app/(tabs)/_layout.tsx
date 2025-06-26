// app/(app)/(tabs)/_layout.tsx
import { TabBarIcon } from '@/components/navigation/TabBarIcon'; // おそらく既存
import { Colors } from '@/constants/Colors'; // おそらく既存
import { useColorScheme } from '@/hooks/useColorScheme'; // おそらく既存
import { Tabs } from 'expo-router';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false, // 各タブ画面のヘッダーを非表示にする
      }}>
      <Tabs.Screen
        name="index" // app/(app)/(tabs)/index.tsx に対応
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore" // app/(app)/(tabs)/explore.tsx に対応
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'code-slash' : 'code-slash-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}