import { Post } from "./types";

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
