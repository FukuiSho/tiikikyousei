import { Alert } from "react-native";
import { Post } from "./types";

/**
 * 投稿にリアクションを追加/削除する関数（即時反映対応）
 */
export const handleReaction = (
  posts: Post[],
  setPosts: (posts: Post[]) => void,
  postId: string,
  emoji: string,
  currentUserId: string,
  isReply: boolean = false,
  replyId?: string
): void => {
  // 即時反映：計算を同期的に実行してすぐにsetPostsを呼び出す
  const updatedPosts = posts.map((post) => {
    if (post.id === postId) {
      if (isReply && replyId) {
        // リプライのリアクション処理
        const updatedReplies = (post.replies || []).map((reply) => {
          if (reply.id === replyId) {
            const reactions = { ...(reply.reactions || {}) };
            const reactionCounts = { ...(reply.reactionCounts || {}) };
            const currentReaction = reactions[currentUserId];

            if (currentReaction === emoji) {
              // 同じリアクションを削除
              delete reactions[currentUserId];
              reactionCounts[emoji] = Math.max(
                0,
                (reactionCounts[emoji] || 0) - 1
              );
              if (reactionCounts[emoji] === 0) {
                delete reactionCounts[emoji];
              }
            } else {
              // 既存のリアクションを削除（あれば）
              if (currentReaction) {
                reactionCounts[currentReaction] = Math.max(
                  0,
                  (reactionCounts[currentReaction] || 0) - 1
                );
                if (reactionCounts[currentReaction] === 0) {
                  delete reactionCounts[currentReaction];
                }
              }
              // 新しいリアクションを追加
              reactions[currentUserId] = emoji;
              reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
            }

            return {
              ...reply,
              reactions,
              reactionCounts,
            };
          }
          return reply;
        });

        return {
          ...post,
          replies: updatedReplies,
        };
      } else {
        // 投稿のリアクション処理
        const reactions = { ...(post.reactions || {}) };
        const reactionCounts = { ...(post.reactionCounts || {}) };
        const currentReaction = reactions[currentUserId];

        if (currentReaction === emoji) {
          // 同じリアクションを削除
          delete reactions[currentUserId];
          reactionCounts[emoji] = Math.max(0, (reactionCounts[emoji] || 0) - 1);
          if (reactionCounts[emoji] === 0) {
            delete reactionCounts[emoji];
          }
        } else {
          // 既存のリアクションを削除（あれば）
          if (currentReaction) {
            reactionCounts[currentReaction] = Math.max(
              0,
              (reactionCounts[currentReaction] || 0) - 1
            );
            if (reactionCounts[currentReaction] === 0) {
              delete reactionCounts[currentReaction];
            }
          }
          // 新しいリアクションを追加
          reactions[currentUserId] = emoji;
          reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
        }

        return {
          ...post,
          reactions,
          reactionCounts,
        };
      }
    }
    return post;
  });

  // 即時反映：setPostsを即座に呼び出し
  setPosts(updatedPosts);
};

/**
 * リアクション選択画面を表示する関数（即時反映対応）
 */
export const showReactionPicker = (
  postId: string,
  onReactionSelect: (
    postId: string,
    emoji: string,
    isReply?: boolean,
    replyId?: string
  ) => void,
  isReply: boolean = false,
  replyId?: string
): void => {
  try {
    const reactions = ["👍", "❤️", "😊", "😂", "😮", "😢"];
    const buttons = reactions.map((emoji) => ({
      text: emoji,
      onPress: () => {
        try {
          // 即時反映：リアクション選択後すぐに処理を実行
          onReactionSelect(postId, emoji, isReply, replyId);
        } catch (error) {
          console.error("リアクション選択処理でエラーが発生しました:", error);
          Alert.alert("エラー", "リアクション処理中にエラーが発生しました");
        }
      },
    }));

    buttons.push({
      text: "キャンセル",
      onPress: () => {},
    });

    // 即時反映：Alertを表示するが、選択後は即座にUIに反映される
    Alert.alert("リアクションを選択", "", buttons, { cancelable: true });
  } catch (error) {
    console.error("リアクションピッカー表示でエラーが発生しました:", error);
    Alert.alert("エラー", "リアクション選択画面の表示中にエラーが発生しました");
  }
};
