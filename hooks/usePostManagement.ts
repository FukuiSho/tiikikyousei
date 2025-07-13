import * as Location from "expo-location";
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { Post, PostFormData } from "../components/utils/types";
import { validateAndConvertImageUrl } from "../services/imageService";
import {
  createPost,
  createReply,
  getNearbyPosts,
  updatePostReaction,
  updateReplyReaction,
} from "../services/postService";

interface UsePostManagementProps {
  currentUserId: string;
  location: Location.LocationObject | null;
}

interface UsePostManagementReturn {
  // State
  posts: Post[];
  newPost: PostFormData;
  newReply: PostFormData;
  expandedReplies: Set<string>;
  replyMode: string | null;
  reactionPickerVisible: boolean;
  reactionPickerTarget: {
    postId: string;
    isReply: boolean;
    replyId?: string;
  } | null;

  // Actions
  setPosts: (posts: Post[] | ((prev: Post[]) => Post[])) => void;
  setNewPost: (post: PostFormData) => void;
  setNewReply: (reply: PostFormData) => void;
  setReplyMode: (mode: string | null) => void;
  handleCreatePost: (onSuccess?: () => void) => Promise<void>;
  handleReplySubmit: (postId: string) => Promise<void>;
  handleReaction: (
    postId: string,
    pickerLabel: string,
    isReply?: boolean,
    replyId?: string
  ) => Promise<void>;
  showReactionPicker: (
    postId: string,
    isReply?: boolean,
    replyId?: string
  ) => void;
  hideReactionPicker: () => void;
  toggleReplies: (postId: string) => void;
  loadNearbyPosts: () => Promise<void>;
  handleCancelPost: () => void;
}

export const usePostManagement = ({
  currentUserId,
  location,
}: UsePostManagementProps): UsePostManagementReturn => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState<PostFormData>({ content: "" });
  const [newReply, setNewReply] = useState<PostFormData>({ content: "" });
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set()
  );
  const [replyMode, setReplyMode] = useState<string | null>(null);
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [reactionPickerTarget, setReactionPickerTarget] = useState<{
    postId: string;
    isReply: boolean;
    replyId?: string;
  } | null>(null);

  const handleCreatePost = useCallback(
    async (onSuccess?: () => void) => {
      if (!newPost.content.trim() || !location) {
        Alert.alert("エラー", "投稿内容を入力してください");
        return;
      }

      if (!location) {
        console.error("位置情報が取得できません");
        Alert.alert("エラー", "位置情報が取得できません");
        return;
      }

      try {
        console.log("投稿作成開始...");
        const postData = {
          content: newPost.content,
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          userId: currentUserId,
        };

        const result = await createPost(postData);
        if (result) {
          console.log("投稿作成成功:", result);
          const newPostObj: Post = {
            id: result.id,
            content: newPost.content,
            author: `User-${currentUserId.slice(-6)}`,
            location: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            timestamp: new Date(),
            replies: [],
            reactions: {},
            reactionCounts: {},
          };

          setPosts((prev) => [newPostObj, ...prev]);
          setNewPost({ content: "" });
          onSuccess?.();
        }
      } catch (error) {
        console.error("投稿作成エラー:", error);
        Alert.alert("エラー", "投稿の作成に失敗しました");
      }
    },
    [newPost.content, location, currentUserId]
  );

  const handleReplySubmit = useCallback(
    async (postId: string) => {
      if (!newReply.content.trim()) {
        Alert.alert("エラー", "返信内容を入力してください");
        return;
      }

      try {
        console.log("返信作成開始...", {
          postId,
          content: newReply.content,
          userId: currentUserId,
        });
        const replyData = {
          content: newReply.content,
          userId: currentUserId,
        };

        const result = await createReply(postId, replyData);
        if (result) {
          console.log("返信作成成功:", result);
          const newReplyObj = {
            id: result.id,
            content: newReply.content,
            author: `User-${currentUserId.slice(-6)}`,
            timestamp: new Date(),
            reactions: {},
            reactionCounts: {},
          };

          console.log("ローカル状態を更新中...", newReplyObj);
          setPosts((prev) => {
            const updatedPosts = prev.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    replies: [...(post.replies || []), newReplyObj],
                  }
                : post
            );
            console.log("投稿状態更新完了:", updatedPosts);
            return updatedPosts;
          });

          setNewReply({ content: "" });
          setReplyMode(null);
          console.log("返信送信完了");
        } else {
          console.error("返信作成に失敗: resultがnull");
          Alert.alert("エラー", "返信の作成に失敗しました");
        }
      } catch (error) {
        console.error("返信作成エラー:", error);
        Alert.alert("エラー", "返信の作成に失敗しました");
      }
    },
    [newReply.content, currentUserId, setPosts, setNewReply, setReplyMode]
  );

  const handleReaction = useCallback(
    async (
      postId: string,
      pickerLabel: string,
      isReply: boolean = false,
      replyId?: string
    ) => {
      try {
        console.log(
          `リアクション処理開始 PostID=${postId}, Emoji=${pickerLabel}, isReply=${isReply}, replyId=${replyId}`
        );

        let success;
        if (isReply && replyId) {
          success = await updateReplyReaction(postId, replyId, pickerLabel);
        } else {
          success = await updatePostReaction(postId, pickerLabel);
        }

        if (!success) {
          Alert.alert("エラー", "リアクションの更新に失敗しました");
          return;
        }

        // ローカルの投稿リストも更新（UI即座更新のため）
        setPosts((prev) =>
          prev.map((post) => {
            if (post.id === postId) {
              if (isReply && replyId) {
                // リプライのリアクション処理
                const updatedReplies =
                  post.replies?.map((reply) => {
                    if (reply.id === replyId) {
                      const reactions = { ...(reply.reactions || {}) };
                      const reactionCounts = {
                        ...(reply.reactionCounts || {}),
                      };

                      const currentReaction = reactions[currentUserId];

                      if (currentReaction === pickerLabel) {
                        // 同じリアクションの場合は削除
                        delete reactions[currentUserId];
                        reactionCounts[pickerLabel] = Math.max(
                          0,
                          (reactionCounts[pickerLabel] || 0) - 1
                        );
                        if (reactionCounts[pickerLabel] === 0) {
                          delete reactionCounts[pickerLabel];
                        }
                        console.log(
                          `リプライのリアクション削除: ${pickerLabel}`
                        );
                      } else {
                        // 異なるリアクションまたは新規の場合
                        if (currentReaction) {
                          // 既存のリアクションを減らす
                          reactionCounts[currentReaction] = Math.max(
                            0,
                            (reactionCounts[currentReaction] || 0) - 1
                          );
                          if (reactionCounts[currentReaction] === 0) {
                            delete reactionCounts[currentReaction];
                          }
                        }
                        // 新しいリアクションを追加
                        reactions[currentUserId] = pickerLabel;
                        reactionCounts[pickerLabel] =
                          (reactionCounts[pickerLabel] || 0) + 1;
                        console.log(
                          `リプライのリアクション追加: ${pickerLabel}`
                        );
                      }

                      return {
                        ...reply,
                        reactions,
                        reactionCounts,
                      };
                    }
                    return reply;
                  }) || [];

                return {
                  ...post,
                  replies: updatedReplies,
                };
              } else {
                // 親投稿のリアクション処理
                const reactions = { ...(post.reactions || {}) };
                const reactionCounts = { ...(post.reactionCounts || {}) };

                const currentReaction = reactions[currentUserId];

                if (currentReaction === pickerLabel) {
                  // 同じリアクションの場合は削除
                  delete reactions[currentUserId];
                  reactionCounts[pickerLabel] = Math.max(
                    0,
                    (reactionCounts[pickerLabel] || 0) - 1
                  );
                  if (reactionCounts[pickerLabel] === 0) {
                    delete reactionCounts[pickerLabel];
                  }
                  console.log(`投稿のリアクション削除: ${pickerLabel}`);
                } else {
                  // 異なるリアクションまたは新規の場合
                  if (currentReaction) {
                    // 既存のリアクションを減らす
                    reactionCounts[currentReaction] = Math.max(
                      0,
                      (reactionCounts[currentReaction] || 0) - 1
                    );
                    if (reactionCounts[currentReaction] === 0) {
                      delete reactionCounts[currentReaction];
                    }
                  }
                  // 新しいリアクションを追加
                  reactions[currentUserId] = pickerLabel;
                  reactionCounts[pickerLabel] =
                    (reactionCounts[pickerLabel] || 0) + 1;
                  console.log(`投稿のリアクション追加: ${pickerLabel}`);
                }

                return {
                  ...post,
                  reactions,
                  reactionCounts,
                };
              }
            }
            return post;
          })
        );

        console.log("リアクション処理完了");
      } catch (error) {
        console.error("リアクション処理エラー:", error);
        Alert.alert("エラー", "リアクションの処理中にエラーが発生しました");
      }
    },
    [currentUserId]
  );

  const loadNearbyPosts = useCallback(async () => {
    if (!location) return;

    try {
      console.log("周辺投稿を取得中...");
      const nearbyPosts = await getNearbyPosts(
        location.coords.latitude,
        location.coords.longitude,
        1.0
      );

      console.log(
        "usePostManagement: 取得された生データ:",
        nearbyPosts.length,
        "件"
      );

      // 生データの詳細確認
      nearbyPosts.forEach((rawPost, index) => {
        console.log(`=== Raw Post ${index + 1} Debug ===`);
        console.log("ID:", rawPost.id);
        console.log("text:", rawPost.text);
        console.log("photoURL:", rawPost.photoURL);
        console.log("photoURL type:", typeof rawPost.photoURL);
        console.log("photoURL is null:", rawPost.photoURL === null);
        console.log("photoURL is undefined:", rawPost.photoURL === undefined);
        console.log("photoURL is empty string:", rawPost.photoURL === "");
        console.log("photoURL length:", rawPost.photoURL?.length);
        console.log("userID:", rawPost.userID);
        console.log("coordinates:", rawPost.coordinates);
        console.log("timestamp:", rawPost.timestamp);
        console.log("parentPostID:", rawPost.parentPostID);
        console.log("全データ:", JSON.stringify(rawPost, null, 2));
        console.log("==========================");
      });

      if (nearbyPosts.length > 0) {
        console.log("usePostManagement: 周辺投稿の変換開始...");

        const convertedPosts = await Promise.all(
          nearbyPosts.map(async (firestorePost) => {
            // ★デバッグ用: 画像URL変換の詳細ログ
            console.log("=== Post Conversion Debug ===");
            console.log("Firestore Post ID:", firestorePost.id);
            console.log("Firestore text:", firestorePost.text);
            console.log("Firestore photoURL:", firestorePost.photoURL);
            console.log("photoURL Type:", typeof firestorePost.photoURL);
            console.log("photoURL存在確認:", !!firestorePost.photoURL);
            console.log("photoURL Length:", firestorePost.photoURL?.length);

            // 画像URLの検証と変換（非同期処理）
            const validImageUrl = await validateAndConvertImageUrl(
              firestorePost.photoURL
            );
            console.log("変換後の画像URL:", validImageUrl);
            console.log("変換後URL Type:", typeof validImageUrl);

            const reactions: { [userID: string]: string } = {};
            const reactionCounts: { [emoji: string]: number } = {};

            if (
              firestorePost.reactions &&
              typeof firestorePost.reactions === "object"
            ) {
              Object.entries(firestorePost.reactions).forEach(
                ([emoji, data]: [string, any]) => {
                  if (data && data.userIds && Array.isArray(data.userIds)) {
                    reactionCounts[emoji] = data.count || data.userIds.length;
                    data.userIds.forEach((userId: string) => {
                      reactions[userId] = emoji;
                    });
                  }
                }
              );
            }

            const convertedPost = {
              id: firestorePost.id,
              content: firestorePost.text, // textフィールドをcontentにマッピング
              author: `User-${firestorePost.userID.slice(-6)}`, // userIDからauthorを生成
              location: {
                latitude: firestorePost.coordinates.latitude,
                longitude: firestorePost.coordinates.longitude,
              },
              timestamp: firestorePost.timestamp,
              parentPostID: firestorePost.parentPostID,
              image: validImageUrl || undefined, // ★重要: 検証済みの画像URL（null → undefined）
              reactions: reactions,
              reactionCounts: reactionCounts,
              replies: [],
            };

            // ★デバッグ用: 変換後のデータ確認
            console.log("Converted Post Details:");
            console.log("- ID:", convertedPost.id);
            console.log("- Content:", convertedPost.content);
            console.log("- Author:", convertedPost.author);
            console.log("- Image:", convertedPost.image);
            console.log("- Image Type:", typeof convertedPost.image);
            console.log("- Has Image:", !!convertedPost.image);
            console.log("Conversion Complete for Post:", firestorePost.id);
            console.log("=============================");

            return convertedPost;
          })
        );

        // 既存の投稿を更新または新しい投稿を追加
        setPosts((prevPosts) => {
          const updatedPosts = [...prevPosts];
          let hasNewPosts = false;

          // 親投稿とリプライを分離
          const parentPosts = convertedPosts.filter(
            (post) => !post.parentPostID
          );
          const replies = convertedPosts.filter((post) => post.parentPostID);

          // 親投稿を処理
          parentPosts.forEach((newPost) => {
            const existingPostIndex = updatedPosts.findIndex(
              (p) => p.id === newPost.id
            );
            if (existingPostIndex >= 0) {
              updatedPosts[existingPostIndex] = {
                ...updatedPosts[existingPostIndex],
                reactions: newPost.reactions,
                reactionCounts: newPost.reactionCounts,
              };
            } else {
              updatedPosts.unshift(newPost);
              hasNewPosts = true;
            }
          });

          // リプライを親投稿に追加
          replies.forEach((reply) => {
            const parentPostIndex = updatedPosts.findIndex(
              (p) => p.id === reply.parentPostID
            );
            if (parentPostIndex >= 0) {
              const existingReplies =
                updatedPosts[parentPostIndex].replies || [];
              const existingReplyIndex = existingReplies.findIndex(
                (r) => r.id === reply.id
              );

              if (existingReplyIndex >= 0) {
                // 既存のリプライを更新
                existingReplies[existingReplyIndex] = {
                  ...existingReplies[existingReplyIndex],
                  reactions: reply.reactions,
                  reactionCounts: reply.reactionCounts,
                };
              } else {
                // 新しいリプライを追加
                existingReplies.push({
                  id: reply.id,
                  content: reply.content,
                  author: reply.author,
                  timestamp: reply.timestamp,
                  reactions: reply.reactions,
                  reactionCounts: reply.reactionCounts,
                });
                hasNewPosts = true;
              }

              updatedPosts[parentPostIndex] = {
                ...updatedPosts[parentPostIndex],
                replies: existingReplies,
              };
            }
          });

          if (hasNewPosts) {
            console.log(`新しい投稿またはリプライが追加されました`);
          }

          return updatedPosts;
        });
      }
    } catch (error) {
      console.error("周辺投稿取得エラー:", error);
    }
  }, [location]);

  const showReactionPicker = useCallback(
    (postId: string, isReply: boolean = false, replyId?: string) => {
      setReactionPickerTarget({ postId, isReply, replyId });
      setReactionPickerVisible(true);
    },
    []
  );

  const hideReactionPicker = useCallback(() => {
    setReactionPickerVisible(false);
  }, []);

  const toggleReplies = useCallback((postId: string) => {
    setExpandedReplies((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(postId)) {
        newExpanded.delete(postId);
      } else {
        newExpanded.add(postId);
      }
      return newExpanded;
    });
  }, []);

  const handleCancelPost = useCallback(() => {
    setNewPost({ content: "" });
  }, []);

  return {
    // State
    posts,
    newPost,
    newReply,
    expandedReplies,
    replyMode,
    reactionPickerVisible,
    reactionPickerTarget,

    // Actions
    setPosts,
    setNewPost,
    setNewReply,
    setReplyMode,
    handleCreatePost,
    handleReplySubmit,
    handleReaction,
    showReactionPicker,
    hideReactionPicker,
    toggleReplies,
    loadNearbyPosts,
    handleCancelPost,
  };
};
