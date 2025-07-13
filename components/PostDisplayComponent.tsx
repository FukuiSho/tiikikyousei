import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { getReactionImage } from "./utils/reactionUtils";
import { styles } from "./utils/styles";
import { Post, PostFormData } from "./utils/types";

interface PostDisplayComponentProps {
  post: Post;
  currentUserId: string;
  expandedReplies: Set<string>;
  replyMode: string | null;
  newReply: PostFormData;
  onToggleReplies: (postId: string) => void;
  onReplyModeChange: (postId: string | null) => void;
  onNewReplyChange: (reply: PostFormData) => void;
  onReplySubmit: (postId: string) => void;
  onReactionPress: (
    postId: string,
    isReply?: boolean,
    replyId?: string
  ) => void;
}

export const PostDisplayComponent: React.FC<PostDisplayComponentProps> = ({
  post,
  currentUserId,
  expandedReplies,
  replyMode,
  newReply,
  onToggleReplies,
  onReplyModeChange,
  onNewReplyChange,
  onReplySubmit,
  onReactionPress,
}) => {
  // 画像の読み込み状態を管理
  const [imageLoadState, setImageLoadState] = useState<{
    isLoading: boolean;
    hasError: boolean;
    errorMessage?: string;
  }>({
    isLoading: false,
    hasError: false,
  });

  // 画像URLが変更されたときに状態をリセット
  useEffect(() => {
    if (post.image) {
      setImageLoadState({
        isLoading: true,
        hasError: false,
      });
    }
  }, [post.image]);

  // ★デバッグ用: 投稿データの詳細確認
  useEffect(() => {
    console.log("=== PostDisplayComponent Debug ===");
    console.log("投稿ID:", post.id);
    console.log("投稿内容:", post.content);
    console.log("投稿作成者:", post.author);
    console.log("投稿の画像URL:", post.image);
    console.log("画像URL型:", typeof post.image);
    console.log("画像URL長さ:", post.image?.length);
    console.log("投稿の全データ:", JSON.stringify(post, null, 2));
    console.log("=================================");

    // 画像URLの形式をチェック
    if (post.image) {
      if (post.image.startsWith("gs://")) {
        console.warn(
          "⚠️ 警告: PostDisplayComponent - 画像URLがgs://形式です。ダウンロードURLに変換が必要です!"
        );
      } else if (
        post.image.startsWith("https://firebasestorage.googleapis.com/")
      ) {
        console.log("✅ PostDisplayComponent - 画像URLは正しいHTTPS形式です");
      } else if (
        post.image.startsWith("http://") ||
        post.image.startsWith("https://")
      ) {
        console.log("✅ PostDisplayComponent - 画像URLはHTTP/HTTPS形式です");
      } else {
        console.warn(
          "⚠️ 警告: PostDisplayComponent - 画像URLの形式が不明です:",
          post.image
        );
      }
    } else {
      console.log("ℹ️ PostDisplayComponent - 画像URLがnullまたはundefinedです");
    }
  }, [post]);

  return (
    <View style={styles.messageItemContainer}>
      {/* 親投稿 */}
      <View style={styles.messageItem}>
        {/* ユーザーアイコン */}
        <View style={styles.userIcon}>
          <Ionicons name="person" size={20} color="#666" />
        </View>

        {/* メッセージ内容 */}
        <View style={styles.messageContent}>
          <Text style={styles.userName}>{post.author}</Text>
          <Text style={styles.messageText}>{post.content}</Text>

          {/* 画像表示 */}
          {post.image ? (
            <View style={styles.imageContainer}>
              <Text style={{ fontSize: 10, color: "#666", marginTop: 4 }}>
                デバッグ: 画像URL = {post.image}
              </Text>

              {imageLoadState.isLoading && (
                <View style={styles.imageLoadingContainer}>
                  <Text style={styles.imageLoadingText}>
                    画像を読み込み中...
                  </Text>
                </View>
              )}

              {imageLoadState.hasError && (
                <View style={styles.imageErrorContainer}>
                  <Text style={styles.imageErrorText}>
                    画像の読み込みに失敗しました
                  </Text>
                  <Text style={styles.imageErrorDetails}>
                    URL: {post.image}
                  </Text>
                  {imageLoadState.errorMessage && (
                    <Text style={styles.imageErrorMessage}>
                      エラー: {imageLoadState.errorMessage}
                    </Text>
                  )}
                </View>
              )}

              <Image
                source={{ uri: post.image }}
                style={[
                  styles.messageImage,
                  imageLoadState.hasError && { opacity: 0.3 },
                ]}
                resizeMode="cover"
                onLoadStart={() => {
                  console.log(
                    "🔄 PostDisplayComponent: 画像の読み込み開始:",
                    post.image
                  );
                  setImageLoadState({
                    isLoading: true,
                    hasError: false,
                  });
                }}
                onLoad={(event) => {
                  console.log(
                    "✅ PostDisplayComponent: 画像の読み込み成功:",
                    post.image
                  );
                  console.log("画像サイズ:", event.nativeEvent.source);
                  setImageLoadState({
                    isLoading: false,
                    hasError: false,
                  });
                }}
                onError={(error: any) => {
                  console.error(
                    "❌ PostDisplayComponent: 画像の読み込みエラー:",
                    post.image
                  );
                  console.error("エラー詳細:", error.nativeEvent?.error);
                  setImageLoadState({
                    isLoading: false,
                    hasError: true,
                    errorMessage: error.nativeEvent?.error || "不明なエラー",
                  });
                }}
              />
            </View>
          ) : (
            <Text style={{ fontSize: 10, color: "#999", marginTop: 4 }}>
              デバッグ: 画像なし (post.image = {JSON.stringify(post.image)})
            </Text>
          )}

          <Text style={styles.messageTime}>
            {post.timestamp.toLocaleString("ja-JP")}
          </Text>
        </View>

        {/* アイコン群 */}
        <View style={styles.messageIcons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() =>
              onReplyModeChange(replyMode === post.id ? null : post.id)
            }
          >
            <Ionicons name="chatbubble-outline" size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.iconButton,
              post.reactions &&
                post.reactions[currentUserId] && {
                  backgroundColor: "#e3f2fd",
                  borderRadius: 4,
                },
            ]}
            onPress={() => onReactionPress(post.id)}
          >
            <Ionicons
              name={
                post.reactions && post.reactions[currentUserId]
                  ? "heart"
                  : "heart-outline"
              }
              size={16}
              color={
                post.reactions && post.reactions[currentUserId]
                  ? "#2196f3"
                  : "#666"
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* リアクション表示 */}
      {post.reactionCounts && Object.keys(post.reactionCounts).length > 0 && (
        <View style={styles.reactionSummary}>
          {Object.entries(post.reactionCounts).map(([emoji, count]) => (
            <View key={emoji} style={styles.reactionItem}>
              <Image
                source={getReactionImage(emoji)}
                style={styles.reactionIcon}
                resizeMode="contain"
              />
              <Text style={styles.reactionCount}>{count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* リプライ表示 */}
      {post.replies && post.replies.length > 0 && (
        <View style={styles.replySection}>
          <TouchableOpacity
            style={styles.replyToggle}
            onPress={() => {
              console.log(
                `リプライトグル: ${post.id}, 現在の状態: ${expandedReplies.has(post.id)}, リプライ数: ${post.replies?.length || 0}`
              );
              onToggleReplies(post.id);
            }}
          >
            <Text style={styles.replyToggleText}>
              {expandedReplies.has(post.id)
                ? "返信を隠す"
                : `返信を表示 (${post.replies?.length || 0})`}
            </Text>
          </TouchableOpacity>

          {expandedReplies.has(post.id) && (
            <View style={styles.replyList}>
              {post.replies.map((reply) => (
                <View key={reply.id} style={styles.replyItem}>
                  <View style={styles.replyUserIcon}>
                    <Ionicons name="person" size={16} color="#666" />
                  </View>
                  <View style={styles.replyContent}>
                    <Text style={styles.replyAuthor}>{reply.author}</Text>
                    <Text style={styles.replyText}>{reply.content}</Text>
                    <Text style={styles.replyTime}>
                      {reply.timestamp.toLocaleString("ja-JP")}
                    </Text>

                    {/* リプライのリアクション表示 */}
                    {reply.reactionCounts &&
                      Object.keys(reply.reactionCounts).length > 0 && (
                        <View
                          style={[
                            styles.reactionSummary,
                            { marginLeft: 0, marginTop: 4 },
                          ]}
                        >
                          {Object.entries(reply.reactionCounts).map(
                            ([emoji, count]) => (
                              <View key={emoji} style={styles.reactionItem}>
                                <Image
                                  source={getReactionImage(emoji)}
                                  style={styles.reactionIcon}
                                  resizeMode="contain"
                                />
                                <Text style={styles.reactionCount}>
                                  {count}
                                </Text>
                              </View>
                            )
                          )}
                        </View>
                      )}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.replyReactionButton,
                      reply.reactions &&
                        reply.reactions[currentUserId] && {
                          backgroundColor: "#e3f2fd",
                          borderRadius: 4,
                        },
                    ]}
                    onPress={() => onReactionPress(post.id, true, reply.id)}
                  >
                    <Ionicons
                      name={
                        reply.reactions && reply.reactions[currentUserId]
                          ? "heart"
                          : "heart-outline"
                      }
                      size={14}
                      color={
                        reply.reactions && reply.reactions[currentUserId]
                          ? "#2196f3"
                          : "#666"
                      }
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* リプライ入力フォーム */}
      {replyMode === post.id && (
        <View style={styles.replyInputSection}>
          <TextInput
            style={styles.replyInput}
            placeholder="返信を入力..."
            value={newReply.content}
            onChangeText={(text) =>
              onNewReplyChange({ ...newReply, content: text })
            }
            multiline
            maxLength={200}
          />
          <View style={styles.replyButtonGroup}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => {
                console.log("リプライ送信ボタンが押されました", {
                  postId: post.id,
                  content: newReply.content,
                  contentLength: newReply.content.trim().length,
                });
                onReplySubmit(post.id);
              }}
            >
              <Text style={styles.submitButtonText}>返信</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => onReplyModeChange(null)}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};
