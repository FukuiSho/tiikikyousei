import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { styles } from "./utils/styles";
import { NewReply, Post, Reply } from "./utils/types";

interface MessageListComponentProps {
  visible: boolean;
  slideAnim: Animated.Value;
  selectedPost: Post | null;
  expandedReplies: Set<string>;
  replyMode: string | null;
  newReply: NewReply;
  currentUserId: string;
  onClose: () => void;
  onToggleReplies: (postId: string) => void;
  onReplyModeChange: (postId: string | null) => void;
  onNewReplyChange: (reply: NewReply) => void;
  onReplySubmit: (postId: string) => void;
  onReactionPress: (postId: string) => void;
  onReplyReactionPress: (postId: string, replyId: string) => void;
  onSlideUp: () => void; // メッセージリストを上にスライドする関数を追加
  onSlideToNormal: () => void; // メッセージリストを通常位置に戻す関数を追加
}

export const MessageListComponent: React.FC<MessageListComponentProps> = ({
  visible,
  slideAnim,
  selectedPost,
  expandedReplies,
  replyMode,
  newReply,
  currentUserId,
  onClose,
  onToggleReplies,
  onReplyModeChange,
  onNewReplyChange,
  onReplySubmit,
  onReactionPress,
  onReplyReactionPress,
  onSlideUp, // 新しいプロパティを追加
  onSlideToNormal, // 新しいプロパティを追加
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const panY = useRef(new Animated.Value(0)).current; // ボトムシート全体のドラッグ処理
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: panY } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY, velocityY } = event.nativeEvent;

      // 上向きの勢いがある場合、またはある程度上にドラッグした場合
      if (velocityY < -500 || translationY < -80) {
        onSlideUp();
      }
      // 下向きの勢いがある場合、またはある程度下にドラッグした場合
      else if (velocityY > 500 || translationY > 80) {
        onSlideToNormal();
      }

      // panYをリセット（ボトムシート全体の動きのため）
      Animated.spring(panY, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }
  }; // リプライ確定時の処理（メッセージリストを上にスライド）
  const handleReplySubmit = (postId: string) => {
    Keyboard.dismiss(); // キーボードを閉じる
    onReplySubmit(postId);

    // リプライ送信後にメッセージリストエリア全体を上にスライドして地図エリアを拡大
    setTimeout(() => {
      onSlideUp();
    }, 150);
  }; // リプライキャンセル時の処理（通常のスクロール）
  const handleReplyCancel = () => {
    Keyboard.dismiss(); // キーボードを閉じる
    onReplyModeChange(null);
    onNewReplyChange({ content: "", author: "" });

    // リプライキャンセル時は通常のスクロール位置調整のみ
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }, 150);
  }; // リプライモードに入ったときにスクロール位置を調整
  useEffect(() => {
    if (replyMode && scrollViewRef.current) {
      // リプライフォームが表示されたときに適切な位置までスクロール
      setTimeout(() => {
        // scrollToEndではなく、適度な位置にスクロール
        scrollViewRef.current?.scrollTo({
          y: 200, // 固定の適度な位置
          animated: true,
        });
      }, 100);
    } else if (!replyMode && scrollViewRef.current) {
      // リプライモードが終了したときは通常のスクロール位置に戻す
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  }, [replyMode]); // キーボード表示/非表示のイベントリスナー
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // キーボードが表示されたときに適度な位置にスクロール
        setTimeout(() => {
          if (replyMode) {
            scrollViewRef.current?.scrollTo({
              y: 150, // 適度な位置
              animated: true,
            });
          }
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        // キーボードが隠れたときは適切な位置にスクロール
        setTimeout(() => {
          if (replyMode) {
            scrollViewRef.current?.scrollTo({
              y: 100, // リプライモード時の適度な位置
              animated: true,
            });
          } else {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          }
        }, 50);
      }
    );

    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, [replyMode]);

  if (!visible || !selectedPost) return null;
  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View
        style={[
          styles.messageListContainer,
          {
            transform: [{ translateY: Animated.add(slideAnim, panY) }],
          },
        ]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
          enabled={true}
        >
          {" "}
          {/* シンプルなハンドルバー（ドラッグ機能なし） */}
          <View style={styles.handleBarContainer}>
            <TouchableOpacity
              onPress={onSlideToNormal}
              style={styles.handleBarTouchable}
              activeOpacity={0.7}
            >
              <View style={styles.handleBar} />
              <View style={styles.handleBarIndicator}>
                <Text style={styles.handleBarText}>ドラッグして操作</Text>
              </View>
            </TouchableOpacity>
          </View>
          {/* ヘッダー */}
          <View style={styles.messageListHeader}>
            <Text style={styles.messageListTitle}>この場所のコメント</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>{" "}
          {/* コメントリスト */}{" "}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messageList}
            contentContainerStyle={{
              paddingBottom: replyMode
                ? Math.max(300, keyboardHeight + 150)
                : 50,
              flexGrow: 1,
              minHeight: replyMode ? "100%" : "auto",
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustContentInsets={false}
            automaticallyAdjustKeyboardInsets={true}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
          >
            <View style={styles.messageItemContainer}>
              <View style={styles.messageItem}>
                {/* ユーザーアイコン */}
                <View style={styles.userIcon}>
                  <Ionicons name="person" size={20} color="#666" />
                </View>
                {/* メッセージ内容 */}
                <View style={styles.messageContent}>
                  <Text style={styles.userName}>{selectedPost.author}</Text>
                  {selectedPost.content && (
                    <Text style={styles.messageText}>
                      {selectedPost.content}
                    </Text>
                  )}
                  {/* 画像表示 */}
                  {selectedPost.image && (
                    <Image
                      source={{ uri: selectedPost.image }}
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={styles.messageTime}>
                    {selectedPost.timestamp.toLocaleString("ja-JP")}
                  </Text>
                </View>{" "}
                {/* アイコン群 */}
                <View style={styles.messageIcons}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      try {
                        onReplyModeChange(
                          replyMode === selectedPost.id ? null : selectedPost.id
                        );
                      } catch (error) {
                        console.error(
                          "返信モード切り替えでエラーが発生しました:",
                          error
                        );
                      }
                    }}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={16}
                      color="#666"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      try {
                        onReactionPress(selectedPost.id);
                      } catch (error) {
                        console.error(
                          "リアクションボタンでエラーが発生しました:",
                          error
                        );
                      }
                    }}
                  >
                    <Ionicons name="heart-outline" size={16} color="#666" />
                  </TouchableOpacity>{" "}
                </View>
              </View>
              {/* リアクション表示 */}
              {selectedPost.reactionCounts &&
              Object.keys(selectedPost.reactionCounts).length > 0 ? (
                <View style={styles.reactionsDisplay}>
                  {Object.entries(selectedPost.reactionCounts).map(
                    ([emoji, count]) => (
                      <TouchableOpacity
                        key={emoji}
                        style={[
                          styles.reactionItem,
                          selectedPost.reactions?.[currentUserId] === emoji &&
                            styles.reactionItemActive,
                        ]}
                        onPress={() => {
                          try {
                            onReactionPress(selectedPost.id);
                          } catch (error) {
                            console.error(
                              "リアクション表示タップでエラーが発生しました:",
                              error
                            );
                          }
                        }}
                      >
                        <Text style={styles.reactionEmoji}>{emoji}</Text>
                        <Text style={styles.reactionCount}>
                          {count as number}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              ) : null}
              {/* リプライ数表示 */}
              {selectedPost.replies && selectedPost.replies.length > 0 ? (
                <TouchableOpacity
                  style={styles.replyToggle}
                  onPress={() => {
                    try {
                      onToggleReplies(selectedPost.id);
                    } catch (error) {
                      console.error(
                        "返信表示切り替えでエラーが発生しました:",
                        error
                      );
                    }
                  }}
                >
                  <Text style={styles.replyToggleText}>
                    {expandedReplies.has(selectedPost.id)
                      ? "返信を隠す"
                      : `返信を表示 (${selectedPost.replies.length}件)`}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {/* リプライリスト */}
              {expandedReplies.has(selectedPost.id) && selectedPost.replies && (
                <View style={styles.repliesContainer}>
                  {selectedPost.replies.map((reply: Reply) => (
                    <View key={reply.id}>
                      <View style={styles.replyItem}>
                        <View style={styles.replyIcon}>
                          <Ionicons name="person" size={16} color="#888" />
                        </View>
                        <View style={styles.replyContent}>
                          <Text style={styles.replyUserName}>
                            {reply.author}
                          </Text>
                          <Text style={styles.replyText}>{reply.content}</Text>
                          <Text style={styles.replyTime}>
                            {reply.timestamp.toLocaleString("ja-JP")}
                          </Text>
                        </View>{" "}
                        <View style={styles.replyActions}>
                          <TouchableOpacity
                            style={styles.replyActionButton}
                            onPress={() => {
                              try {
                                onReplyReactionPress(selectedPost.id, reply.id);
                              } catch (error) {
                                console.error(
                                  "リプライリアクションボタンでエラーが発生しました:",
                                  error
                                );
                              }
                            }}
                          >
                            <Ionicons
                              name="heart-outline"
                              size={14}
                              color="#666"
                            />
                          </TouchableOpacity>{" "}
                        </View>
                      </View>
                      {/* リプライのリアクション表示 */}
                      {reply.reactionCounts &&
                      Object.keys(reply.reactionCounts).length > 0 ? (
                        <View style={styles.replyReactionsDisplay}>
                          {Object.entries(reply.reactionCounts).map(
                            ([emoji, count]) => (
                              <TouchableOpacity
                                key={emoji}
                                style={[
                                  styles.replyReactionItem,
                                  reply.reactions?.[currentUserId] === emoji &&
                                    styles.reactionItemActive,
                                ]}
                                onPress={() => {
                                  try {
                                    onReplyReactionPress(
                                      selectedPost.id,
                                      reply.id
                                    );
                                  } catch (error) {
                                    console.error(
                                      "リプライリアクション表示タップでエラーが発生しました:",
                                      error
                                    );
                                  }
                                }}
                              >
                                <Text style={styles.reactionEmoji}>
                                  {emoji}
                                </Text>
                                <Text style={styles.reactionCount}>
                                  {count as number}
                                </Text>
                              </TouchableOpacity>
                            )
                          )}
                        </View>
                      ) : null}
                    </View>
                  ))}{" "}
                </View>
              )}
              {/* リプライ入力フォーム */}{" "}
              {replyMode === selectedPost.id && (
                <View style={styles.replyForm}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="テキスト"
                    placeholderTextColor="#C4C4C4"
                    value={newReply.content}
                    onChangeText={(text) =>
                      onNewReplyChange({ ...newReply, content: text })
                    }
                    onFocus={() => {
                      // 入力フィールドがフォーカスされたときに即座にスクロール
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 50);
                    }}
                    multiline={true}
                    maxLength={200}
                  />
                  <TextInput
                    style={styles.replyAuthorInput}
                    placeholder="あなたの名前"
                    placeholderTextColor="#C4C4C4"
                    value={newReply.author}
                    onChangeText={(text) =>
                      onNewReplyChange({ ...newReply, author: text })
                    }
                    onFocus={() => {
                      // 入力フィールドがフォーカスされたときに即座にスクロール
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 50);
                    }}
                    maxLength={20}
                  />
                  <View style={styles.replyFormButtons}>
                    <TouchableOpacity
                      style={styles.replyCancel}
                      onPress={handleReplyCancel}
                    >
                      <Text style={styles.replyCancelText}>キャンセル</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.replySubmit}
                      onPress={() => handleReplySubmit(selectedPost.id)}
                    >
                      <Text style={styles.replySubmitText}>返信</Text>
                    </TouchableOpacity>{" "}
                  </View>
                </View>
              )}
            </View>
            {!selectedPost && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  投稿を選択してください{" "}
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </PanGestureHandler>
  );
};
