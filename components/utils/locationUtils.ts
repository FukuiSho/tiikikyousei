import { Post as ServicePost } from "../../services/postService";
import { Post } from "./types";

/**
 * postService.tsのPost型をフロントエンドのPost型に変換
 */
export const convertServicePostToFrontendPost = (
  servicePost: ServicePost
): Post => {
  return {
    id: servicePost.id,
    content: servicePost.text,
    location: {
      latitude: servicePost.coordinates.latitude,
      longitude: servicePost.coordinates.longitude,
    },
    timestamp: servicePost.timestamp,
    author: servicePost.userID, // 仮のユーザー名として使用
    parentPostID: servicePost.parentPostID,
    image: servicePost.photoURL, // photoURL → image に変換
    reactions: convertReactionsToFrontendFormat(servicePost.reactions),
    reactionCounts: calculateReactionCounts(servicePost.reactions),
  };
};

/**
 * Firebase形式のreactionsをフロントエンド形式に変換
 */
const convertReactionsToFrontendFormat = (reactions: {
  [emoji: string]: { count: number; userIds: string[] };
}): { [userId: string]: string } => {
  const frontendReactions: { [userId: string]: string } = {};

  Object.entries(reactions).forEach(([emoji, data]) => {
    data.userIds.forEach((userId) => {
      frontendReactions[userId] = emoji;
    });
  });

  return frontendReactions;
};

/**
 * Firebase形式のreactionsからカウントを計算
 */
const calculateReactionCounts = (reactions: {
  [emoji: string]: { count: number; userIds: string[] };
}): { [emoji: string]: number } => {
  const reactionCounts: { [emoji: string]: number } = {};

  Object.entries(reactions).forEach(([emoji, data]) => {
    reactionCounts[emoji] = data.count;
  });

  return reactionCounts;
};

/**
 * 同じ座標の投稿のマーカー位置をずらす関数
 */
export const getOffsetCoordinates = (
  post: Post,
  posts: Post[]
): { latitude: number; longitude: number } => {
  // 同じ座標の投稿を見つける
  const sameLocationPosts = posts.filter(
    (p) =>
      Math.abs(p.location.latitude - post.location.latitude) < 0.00001 &&
      Math.abs(p.location.longitude - post.location.longitude) < 0.00001
  );

  if (sameLocationPosts.length <= 1) {
    return post.location; // 単独の投稿はそのまま
  }

  // 同じ座標の投稿のインデックスを取得
  const sameLocationIndex = sameLocationPosts.findIndex(
    (p) => p.id === post.id
  );

  // 円形にマーカーを配置するための角度計算
  const angle = (sameLocationIndex * 2 * Math.PI) / sameLocationPosts.length;
  const radius = 0.0001; // 約10mの半径

  return {
    latitude: post.location.latitude + radius * Math.cos(angle),
    longitude: post.location.longitude + radius * Math.sin(angle),
  };
};

/**
 * 指定された投稿位置付近の投稿を取得する関数
 */
export const getPostsForLocation = (
  selectedPost: Post | null,
  posts: Post[]
): Post[] => {
  if (!selectedPost) return [];

  // 選択された投稿と同じ場所または近い場所の投稿を取得
  return posts.filter((post) => {
    const distance = Math.sqrt(
      Math.pow(post.location.latitude - selectedPost.location.latitude, 2) +
        Math.pow(post.location.longitude - selectedPost.location.longitude, 2)
    );
    return distance < 0.01; // 約1km
  });
};

/**
 * 指定された場所付近の投稿を取得する関数（座標版）
 */
export const getPostsForCoordinates = (
  selectedLocation: { latitude: number; longitude: number } | null,
  posts: Post[]
): Post[] => {
  if (!selectedLocation) return [];

  // 選択された場所の近くの投稿を取得（半径1km以内程度）
  const nearbyPosts = posts.filter((post) => {
    const distance = Math.sqrt(
      Math.pow(post.location.latitude - selectedLocation.latitude, 2) +
        Math.pow(post.location.longitude - selectedLocation.longitude, 2)
    );
    return distance < 0.01; // 約1km
  });

  // 親投稿のみを返す（parentPostIDがないもの）
  return nearbyPosts.filter((post) => !post.parentPostID);
};

/**
 * 指定された親投稿IDのリプライを取得
 */
export const getRepliesForPost = (
  parentPostId: string,
  selectedLocation: { latitude: number; longitude: number } | null,
  posts: Post[]
): Post[] => {
  if (!selectedLocation) return [];

  // 選択された場所の近くの投稿から、指定された親投稿のリプライのみを取得
  const nearbyPosts = posts.filter((post) => {
    const distance = Math.sqrt(
      Math.pow(post.location.latitude - selectedLocation.latitude, 2) +
        Math.pow(post.location.longitude - selectedLocation.longitude, 2)
    );
    return distance < 0.01; // 約1km
  });

  // parentPostIDが一致するリプライのみを返す
  return nearbyPosts.filter((post) => post.parentPostID === parentPostId);
};
