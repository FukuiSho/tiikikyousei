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
