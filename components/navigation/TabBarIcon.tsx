// components/navigation/TabBarIcon.tsx
import { Ionicons } from '@expo/vector-icons'; // Ioniconsをインポート
import { type ComponentProps } from 'react';

// TabBarIconコンポーネントのPropsの型定義
type TabBarIconProps = ComponentProps<typeof Ionicons> & {
  name: ComponentProps<typeof Ionicons>['name']; // Ioniconsのアイコン名を受け取る
  color: string; // アイコンの色を受け取る
};

// TabBarIconコンポーネントの定義
export function TabBarIcon({ style, ...rest }: TabBarIconProps) {
  return <Ionicons size={28} style={[{ marginBottom: -3 }, style]} {...rest} />;
}