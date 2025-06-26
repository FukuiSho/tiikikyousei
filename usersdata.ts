export interface Users {
  id: string; // ID（仮のメールアドレス）
  username: string; // ユーザー名
  icon: string; // 写真URL
  timestamp: Date | any; // アカウント作成時刻
  oneMessage: string; // ひとことメッセージ
  coordinates: {
    latitude: number; // 緯度
    longitude: number; // 経度
  };
  profileID: string; // プロフィールID（メールアドレス+'profile'）
}

export const usersdata: Users[] = [
  {
    id: "user1@example.com",
    username: "田中太郎",
    icon: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    timestamp: new Date("2024-01-15T10:30:00Z"),
    oneMessage: "今日は良い天気ですね！",
    coordinates: {
      latitude: 35.6762,
      longitude: 139.6503,
    },
    profileID: "user1@example.comprofile",
  },
  {
    id: "user2@example.com",
    username: "佐藤花子",
    icon: "https://images.unsplash.com/photo-1494790108755-2616b612b187?w=150",
    timestamp: new Date("2024-01-15T11:15:00Z"),
    oneMessage: "カフェで休憩中です☕",
    coordinates: {
      latitude: 35.6794,
      longitude: 139.7676,
    },
    profileID: "user2@example.com" + "profile",
  },
  {
    ID: "user3@example.com",
    username: "山田次郎",
    icon: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    timestamp: "2024-01-15T12:00:00Z",
    oneMessage: "お昼ご飯を食べに行きます",
    coordinates: {
      latitude: 35.6586,
      longitude: 139.7454,
    },
    profileID: "user3@example.com" + "profile",
  },
];
