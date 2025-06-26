import { Tabs } from "expo-router";
import React from "react";

import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        // tabBarStyle: { display: "none" }, // タブバーを完全に非表示
        headerShown: false, // ヘッダーも非表示
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "",
        }}
      />
      <Tabs.Screen name="signup" options={{ title: "アカウント登録" }} />
    </Tabs>
  );
}
