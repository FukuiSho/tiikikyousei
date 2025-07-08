// タイプ定義ファイル
import * as Location from "expo-location";

export interface Post {
  id: string;
  content: string;
  location: {
    latitude: number;
    longitude: number;
  };
  timestamp: Date;
  author: string;
  parentPostID?: string; // 返信の場合の親投稿ID（任意）
  image?: string;
  imagePosition?: {
    x: number;
    y: number;
  };
  replies?: Reply[];
  reactions?: {
    [userId: string]: string; // userId -> emoji
  };
  reactionCounts?: {
    [emoji: string]: number; // emoji -> count
  };
}

export interface Reply {
  id: string;
  content: string;
  author: string;
  timestamp: Date;
  reactions?: {
    [userId: string]: string;
  };
  reactionCounts?: {
    [emoji: string]: number;
  };
}

export interface NewPost {
  content: string;
  author: string;
  image: string;
}

export interface NewReply {
  content: string;
  author: string;
}

export interface LocationState {
  location: Location.LocationObject | null;
  selectedPost: Post | null;
}

export interface UIState {
  modalVisible: boolean;
  messageListVisible: boolean;
  keyboardHeight: number;
  replyMode: string | null;
  expandedReplies: Set<string>;
}

export interface ImageState {
  selectedImage: string | null;
  imagePosition: {
    x: number;
    y: number;
  } | null;
}

export interface UserProfile {
  userId?: string;
  displayName?: string;
  gender?: string;
  bloodType?: string;
  hometown?: string;
  birthday?: Date;
  zodiacSign?: string; // 星座フィールドを追加
  worries?: string;
  selfIntroduction?: string;
  tags?: string[];
  oneMessage?: string;
}

export interface UserProfileUpdateData {
  gender: string;
  bloodType: string;
  hometown: string;
  birthday?: Date;
  zodiacSign?: string; // 星座フィールドを追加
  worries: string;
  selfIntroduction: string;
  tags: string[];
}

export interface PostFormData {
  content: string;
}

// 選択肢の定数定義
export const GENDER_OPTIONS = ["男性", "女性", "その他"];

export const BLOOD_TYPE_OPTIONS = ["A型", "B型", "O型", "AB型"];

export const PREFECTURE_OPTIONS = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

export const ZODIAC_SIGNS = [
  "おひつじ座",
  "おうし座",
  "ふたご座",
  "かに座",
  "しし座",
  "おとめ座",
  "てんびん座",
  "さそり座",
  "いて座",
  "やぎ座",
  "みずがめ座",
  "うお座",
];

export const BIRTH_YEARS = Array.from({ length: 80 }, (_, i) =>
  (new Date().getFullYear() - 80 + i).toString()
);

export const BIRTH_MONTHS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

export const BIRTH_DAYS = Array.from({ length: 31 }, (_, i) => `${i + 1}日`);
