import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/HapticTab";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          display: "none", // タブバーを完全に非表示
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null, // タブナビゲーションから除外
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          href: null, // タブナビゲーションから除外
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: null, // タブナビゲーションから除外
        }}
      />
      <Tabs.Screen
        name="signup"
        options={{
          href: null, // タブナビゲーションから除外
        }}
      />
    </Tabs>
  );
}
