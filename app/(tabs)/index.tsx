import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

// 型とユーティリティのインポート
import { PostBubble } from "../../components/PostBubble";
import {
  selectImageFromCamera,
  selectImageFromLibrary,
  showImagePickerOptions,
} from "../../components/utils/imageUtils";
import { getPostsForCoordinates } from "../../components/utils/locationUtils";
import { getReactionImage } from "../../components/utils/reactionUtils";
import { styles } from "../../components/utils/styles";
import { Post } from "../../components/utils/types";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { usePostManagement } from "../../hooks/usePostManagement";
import { getPersistentUserId } from "../../services/userService";

const { height } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [messageListVisible, setMessageListVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // デバッグモードの制御
  const debugMode = true; // 一時的にデバッグを有効化して詳細な分析を行う

  // 位置情報追跡フック
  const {
    location,
    isLocationTracking,
    initializeLocationTracking,
    cleanupLocationTracking,
    updateSetPosts,
  } = useLocationTracking({
    currentUserId,
    setPosts: undefined, // 初期値はundefined、後でupdateSetPostsで設定
  });

  // 投稿管理フック（位置情報をuseLocationTrackingから取得）
  const postManagement = usePostManagement({
    currentUserId,
    location,
  });

  // 投稿管理の機能を分離
  const {
    posts,
    newPost,
    newReply,
    expandedReplies,
    replyMode,
    reactionPickerVisible,
    reactionPickerTarget,
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
    handleCancelPost,
  } = postManagement;

  // アニメーション用の値（初期値は画面外の下に設定）
  const slideAnim = useRef(new Animated.Value(height * 0.5)).current;
  // MapViewのref
  const mapRef = useRef<MapView>(null);
  useEffect(() => {
    // 永続的なユーザーIDを取得
    const initializeUserId = async () => {
      const userId = await getPersistentUserId();
      setCurrentUserId(userId);
      console.log("現在のユーザーID:", userId);
    };

    initializeUserId();
  }, []);

  // useLocationTrackingフックにpostManagement.setPostsを接続
  useEffect(() => {
    if (postManagement.setPosts) {
      updateSetPosts(postManagement.setPosts);
    }
  }, [postManagement.setPosts, updateSetPosts]);

  // currentUserIdが設定されたら位置情報追跡を開始
  useEffect(() => {
    if (currentUserId) {
      console.log("ユーザーID設定完了、位置情報追跡を開始:", currentUserId);
      initializeLocationTracking();

      // クリーンアップ関数
      return () => {
        console.log("位置情報追跡をクリーンアップ");
        cleanupLocationTracking();
      };
    }
  }, [currentUserId, initializeLocationTracking, cleanupLocationTracking]);
  // テスト用の投稿を追加（最初の位置情報取得時のみ）
  useEffect(() => {
    if (location && posts.length === 0) {
      // postsが空の場合のみ実行
      const testPosts: Post[] = [
        {
          id: "test-1",
          content: "これはテスト投稿です。マップ上に吹き出しで表示されます。",
          author: "テストユーザー",
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          timestamp: new Date(),
          replies: [
            {
              id: "reply-1",
              content: "これはテストリプライです",
              author: "リプライユーザー",
              timestamp: new Date(),
              reactions: {},
              reactionCounts: {},
            },
            {
              id: "reply-2",
              content: "もう一つのテストリプライです",
              author: "別のユーザー",
              timestamp: new Date(),
              reactions: {},
              reactionCounts: {},
            },
          ],
          reactions: {},
          reactionCounts: {},
        },
        {
          id: "test-2",
          content: "2つ目のテスト投稿です。近くの場所にあります。",
          author: "別のユーザー",
          location: {
            latitude: location.coords.latitude + 0.0005,
            longitude: location.coords.longitude + 0.0005,
          },
          timestamp: new Date(),
          replies: [],
          reactions: {},
          reactionCounts: {},
        },
        {
          id: "test-3",
          content: "短いメッセージ",
          author: "ユーザーC",
          location: {
            latitude: location.coords.latitude - 0.0003,
            longitude: location.coords.longitude + 0.0002,
          },
          timestamp: new Date(),
          replies: [],
          reactions: {},
          reactionCounts: {},
        },
      ];
      setPosts(testPosts);
    }
  }, [location, posts.length, setPosts]);

  // キーボ�Eドイベントリスナ�E
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const handleMarkerPress = (post: Post) => {
    setSelectedLocation(post.location);
    setMessageListVisible(true);

    // マップの位置を調整（マップ全体を下に移動して投稿位置を画面上部に表示）
    // メッセージリストが画面の下半分を占めるので、マップの中心を北（上）に移動
    const offsetLatitude = -0.001; // 緯度のオフセット（北に移動してマップ全体を下げる）
    mapRef.current?.animateToRegion(
      {
        latitude: post.location.latitude + offsetLatitude,
        longitude: post.location.longitude,
        latitudeDelta: 0.002, // 紁E00m篁E���E�高倍率�E�E
        longitudeDelta: 0.002, // 紁E00m篁E���E�高倍率�E�E
      },
      1000
    );

    // 下から上にスライドインアニメーション
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };
  const handleCloseMessageList = () => {
    // マップを現在地中忁E��戻ぁE
    if (location) {
      mapRef.current?.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01, // 通常表示�E�紁Ekm篁E���E�E
          longitudeDelta: 0.01, // 通常表示�E�紁Ekm篁E���E�E
        },
        1000
      );
    }

    // 上から下にスライドアウトアニメーション
    Animated.timing(slideAnim, {
      toValue: height * 0.5,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setMessageListVisible(false);
      setSelectedLocation(null);
    });
  };

  // 画像選択処理
  const handleImageSelect = async () => {
    showImagePickerOptions(
      async () => {
        // フォトライブラリから選択
        const imageUri = await selectImageFromLibrary();
        if (imageUri) {
          setNewPost({ ...newPost, image: imageUri });
        }
      },
      async () => {
        // カメラで撮影
        const imageUri = await selectImageFromCamera();
        if (imageUri) {
          setNewPost({ ...newPost, image: imageUri });
        }
      }
    );
  };

  // 画像削除処理
  const handleImageRemove = () => {
    setNewPost({ ...newPost, image: undefined });
  };

  // すれ違い履歴画面に遷移する関数
  const handleOpenEncounterHistory = () => {
    router.push("/(tabs)/history");
  };

  // マイページ画面に遷移する関数
  const handleOpenMyPage = () => {
    router.push("/(tabs)/mypage");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>地域共生アプリ</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: isLocationTracking ? "#4CAF50" : "#FFC107",
              marginRight: 8,
            }}
          />
          <Text style={{ fontSize: 12, color: "#666" }}>
            {isLocationTracking ? "位置追跡中" : "待機中"}
          </Text>
        </View>
      </View>
      {location ? (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.01, // 初期表示は少し庁E��に設定（紁Ekm篁E���E�E
              longitudeDelta: 0.01, // 初期表示は少し庁E��に設定（紁Ekm篁E���E�E
            }}
            // コメントリスト表示時�Eマップ操作を無効匁E
            scrollEnabled={!messageListVisible}
            zoomEnabled={!messageListVisible}
            rotateEnabled={!messageListVisible}
            pitchEnabled={!messageListVisible}
            moveOnMarkerPress={!messageListVisible}
            onTouchStart={() => {
              // コメントリスト表示時のマップタッチを無効化
              if (messageListVisible) {
                return false;
              }
            }}
          >
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="現在地"
              description="あなたの現在位置"
              pinColor="blue"
            />
            {posts.map((post, index) => {
              // 重なり防止のためのマーカーポジショニング（改善版）
              const baseOffset = 0.0003; // オフセットを大きくして重なりを減らす
              let offsetLatitude = post.location.latitude;
              let offsetLongitude = post.location.longitude;

              // 他のマーカーとの重なりを避けるための調整
              posts.forEach((otherPost, otherIndex) => {
                if (otherIndex < index) {
                  // 既に配置されたマーカーとの重なりチェック
                  const latDiff = Math.abs(
                    otherPost.location.latitude - offsetLatitude
                  );
                  const lngDiff = Math.abs(
                    otherPost.location.longitude - offsetLongitude
                  );
                  const distance = Math.sqrt(
                    latDiff * latDiff + lngDiff * lngDiff
                  );

                  // 距離が近すぎる場合は位置を調整
                  if (distance < baseOffset * 3) {
                    // 閾値を大きく
                    const angle = index * (Math.PI / 4); // 45度間隔でより分散
                    const adjustedOffset = baseOffset * (1 + index * 0.8); // オフセットを大きく
                    offsetLatitude += adjustedOffset * Math.cos(angle);
                    offsetLongitude += adjustedOffset * Math.sin(angle);
                  }
                }
              });

              // 画面の境界を考慮した幅の動的調整
              const screenWidth = Dimensions.get("window").width;
              const baseWidth = Math.min(screenWidth * 0.8, 280); // 画面の80%または280pxの小さい方
              const maxWidth = Math.min(screenWidth * 0.9, 320); // 画面の90%または320pxの小さい方
              const minWidth = Math.max(screenWidth * 0.4, 150); // 画面の40%または150pxの大きい方

              // 地図の中心からの距離に基づいて幅を調整
              const distanceFromCenter = Math.abs(
                offsetLongitude - location.coords.longitude
              );
              const latitudeDistance = Math.abs(
                offsetLatitude - location.coords.latitude
              );
              const totalDistance = Math.sqrt(
                distanceFromCenter * distanceFromCenter +
                  latitudeDistance * latitudeDistance
              );

              // 距離に基づく幅調整をより緩やかに（十分な大きさを保つ）
              const distanceMultiplier = Math.max(
                0.7,
                1 - totalDistance * 3000
              ); // 距離による縮小をさらに緩やか
              const adjustedMaxWidth = Math.max(
                minWidth,
                Math.min(maxWidth, baseWidth * distanceMultiplier)
              );

              // Z-indexの計算（距離が近いほど高く、インデックスが小さいほど高く）
              const zIndex = Math.max(
                1,
                Math.floor(
                  1000 - totalDistance * 100000 + (posts.length - index) * 10
                )
              );

              if (debugMode) {
                console.log(
                  "🎯 MARKER POSITIONING DEBUG ====================================="
                );
                console.log("📊 Marker Data:", {
                  id: post.id,
                  index,
                  content: post.content.substring(0, 20) + "...",
                  author: post.author,
                });
                console.log("📍 Position Calculations:", {
                  originalLat: post.location.latitude,
                  originalLng: post.location.longitude,
                  offsetLat: offsetLatitude,
                  offsetLng: offsetLongitude,
                  totalDistance,
                  distanceMultiplier,
                });
                console.log("📏 Width Calculations:", {
                  screenWidth,
                  baseWidth,
                  minWidth,
                  maxWidth,
                  adjustedMaxWidth,
                  zIndex,
                });
              }

              // 画面端での吹き出しの切れを防ぐため、位置に応じてanchorを動的調整
              // 現在の地図の表示範囲を取得（簡易計算）
              const currentRegion = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };

              // 投稿位置の相対位置を計算（マップの表示範囲内での位置）
              const relativeX =
                (offsetLongitude -
                  (currentRegion.longitude -
                    currentRegion.longitudeDelta / 2)) /
                currentRegion.longitudeDelta;
              const clampedRelativeX = Math.max(0, Math.min(1, relativeX));

              // 位置に応じたanchorの調整
              let anchorX = 0.5; // デフォルトは中央
              let centerOffsetX = 0;

              if (clampedRelativeX > 0.7) {
                // 右端に近い場合：anchorを右寄せにして吹き出しを左側に表示
                anchorX = 0.85;
                centerOffsetX = -adjustedMaxWidth * 0.35;
              } else if (clampedRelativeX < 0.3) {
                // 左端に近い場合：anchorを左寄せにして吹き出しを右側に表示
                anchorX = 0.15;
                centerOffsetX = adjustedMaxWidth * 0.35;
              }

              if (debugMode) {
                console.log("🎯 Anchor Analysis:", {
                  currentRegionLng: currentRegion.longitude,
                  relativeX,
                  clampedRelativeX,
                  anchorX,
                  centerOffsetX,
                  isRightEdge: clampedRelativeX > 0.7,
                  isLeftEdge: clampedRelativeX < 0.3,
                  adjustedMaxWidth,
                });
                console.log(
                  "🎯 MARKER POSITIONING DEBUG END ================================="
                );
              }

              return (
                <Marker
                  key={post.id}
                  coordinate={{
                    latitude: offsetLatitude,
                    longitude: offsetLongitude,
                  }}
                  onPress={() => handleMarkerPress(post)}
                  // 位置に応じて動的にanchorを調整
                  anchor={{ x: anchorX, y: 1.0 }}
                  centerOffset={{ x: centerOffsetX, y: -25 }}
                  zIndex={zIndex} // 動的なZ-index
                  style={{
                    overflow: "visible",
                    zIndex: zIndex,
                  }}
                >
                  <PostBubble
                    content={post.content}
                    author={post.author}
                    maxWidth={adjustedMaxWidth}
                    image={post.image} // 画像URLを追加
                  />
                </Marker>
              );
            })}
          </MapView>
          {/* コメントリスト表示時のマップ操作防止オーバーレイ */}
          {messageListVisible && (
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: height * 0.5, // ScrollViewエリアを除外
                zIndex: 999,
              }}
              pointerEvents="none" // マップのタッチを無効化
            />
          )}
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>位置位置を取得中...</Text>
        </View>
      )}
      {/* メッセージリストエリア */}
      {messageListVisible && (
        <KeyboardAvoidingView
          style={[
            styles.keyboardAvoidingView,
            {
              zIndex: 1000,
              height: height * 0.5, // 明示的に高さを設定
            },
          ]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          <View
            style={[
              styles.messageListContainer,
              {
                // transform: [{ translateY: slideAnim }], // 一時的にコメントアウト
                marginBottom: keyboardHeight > 0 ? keyboardHeight - 100 : 0,
                height: height * 0.4, // 明示的に高さを設定
              },
            ]}
          >
            {/* ハンドルバE*/}
            <TouchableOpacity onPress={handleCloseMessageList}>
              <View style={styles.handleBar} />
            </TouchableOpacity>

            {/* ヘッダー */}
            <View style={styles.messageListHeader}>
              <Text style={styles.messageListTitle}>この場所のコメント</Text>
              <TouchableOpacity onPress={handleCloseMessageList}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* コメントリスト*/}
            <ScrollView
              style={{
                height: 300,
              }}
              contentContainerStyle={{
                paddingBottom: 20,
              }}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={true}
            >
              {getPostsForCoordinates(selectedLocation, posts).map(
                (post, index) => (
                  <View
                    key={post.id}
                    style={[styles.messageItemContainer]}
                    pointerEvents="box-none"
                  >
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
                        {post.image && (
                          <Image
                            source={{ uri: post.image }}
                            style={styles.messageImage}
                            resizeMode="cover"
                          />
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
                            setReplyMode &&
                            setReplyMode(replyMode === post.id ? null : post.id)
                          }
                        >
                          <Ionicons
                            name="chatbubble-outline"
                            size={16}
                            color="#666"
                          />
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
                          onPress={() =>
                            showReactionPicker && showReactionPicker(post.id)
                          }
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
                    {post.reactionCounts &&
                      Object.keys(post.reactionCounts).length > 0 && (
                        <View style={styles.reactionSummary}>
                          {Object.entries(post.reactionCounts).map(
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

                    {/* リプライ表示 */}
                    {post.replies && post.replies.length > 0 && (
                      <View style={styles.replySection}>
                        <TouchableOpacity
                          style={styles.replyToggle}
                          onPress={() => {
                            console.log(
                              `リプライトグル: ${post.id}, 現在の状態: ${expandedReplies.has(post.id)}, リプライ数: ${post.replies?.length || 0}`
                            );
                            toggleReplies(post.id);
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
                                  <Ionicons
                                    name="person"
                                    size={16}
                                    color="#666"
                                  />
                                </View>
                                <View style={styles.replyContent}>
                                  <Text style={styles.replyAuthor}>
                                    {reply.author}
                                  </Text>
                                  <Text style={styles.replyText}>
                                    {reply.content}
                                  </Text>
                                  <Text style={styles.replyTime}>
                                    {reply.timestamp.toLocaleString("ja-JP")}
                                  </Text>

                                  {/* リプライのリアクション表示 */}
                                  {reply.reactionCounts &&
                                    Object.keys(reply.reactionCounts).length >
                                      0 && (
                                      <View
                                        style={[
                                          styles.reactionSummary,
                                          { marginLeft: 0, marginTop: 4 },
                                        ]}
                                      >
                                        {Object.entries(
                                          reply.reactionCounts
                                        ).map(([emoji, count]) => (
                                          <View
                                            key={emoji}
                                            style={styles.reactionItem}
                                          >
                                            <Image
                                              source={getReactionImage(emoji)}
                                              style={styles.reactionIcon}
                                              resizeMode="contain"
                                            />
                                            <Text style={styles.reactionCount}>
                                              {count}
                                            </Text>
                                          </View>
                                        ))}
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
                                  onPress={() =>
                                    showReactionPicker &&
                                    showReactionPicker(post.id, true, reply.id)
                                  }
                                >
                                  <Ionicons
                                    name={
                                      reply.reactions &&
                                      reply.reactions[currentUserId]
                                        ? "heart"
                                        : "heart-outline"
                                    }
                                    size={14}
                                    color={
                                      reply.reactions &&
                                      reply.reactions[currentUserId]
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
                            setNewReply({ ...newReply, content: text })
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
                              handleReplySubmit(post.id);
                            }}
                          >
                            <Text style={styles.submitButtonText}>返信</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setReplyMode(null)}
                          >
                            <Text style={styles.cancelButtonText}>
                              キャンセル
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )
              )}

              {getPostsForCoordinates(selectedLocation, posts).length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    この場所にはまだコメントがありません
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      )}
      {/* フローティングボタン群 */}
      {/* マイページボタン */}
      <TouchableOpacity
        style={styles.floatingButtonTertiary}
        onPress={handleOpenMyPage}
      >
        <Ionicons name="person" size={28} color="white" />
      </TouchableOpacity>

      {/* すれ違い履歴ボタン */}
      <TouchableOpacity
        style={styles.floatingButtonSecondary}
        onPress={handleOpenEncounterHistory}
      >
        <Ionicons name="people" size={28} color="white" />
      </TouchableOpacity>
      {/* フローティング投稿ボタン */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          handleCancelPost();
          setModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>新しい投稿</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  handleCancelPost();
                  setModalVisible(false);
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>{" "}
            </View>
            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>内容</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="投稿の内容を入力してください"
                  value={newPost.content}
                  onChangeText={(text) =>
                    setNewPost({ ...newPost, content: text })
                  }
                  multiline={true}
                  numberOfLines={5}
                  maxLength={300}
                  textAlignVertical="top"
                />
              </View>

              {/* 画像選択エリア */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>画像</Text>
                {!newPost.image ? (
                  <TouchableOpacity
                    style={styles.imagePickerButton}
                    onPress={handleImageSelect}
                  >
                    <Ionicons name="camera" size={20} color="white" />
                    <Text style={styles.imagePickerText}>画像を選択</Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <Image
                      source={{ uri: newPost.image }}
                      style={styles.selectedImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={[
                        styles.imageRemoveButton,
                        { position: "absolute", top: 8, right: 8 },
                      ]}
                      onPress={handleImageRemove}
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  handleCancelPost();
                  setModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => handleCreatePost(() => setModalVisible(false))}
              >
                <Text style={styles.submitButtonText}>投稿する</Text>{" "}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* リアクション選択モーダル */}
      <Modal
        visible={reactionPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideReactionPicker}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={hideReactionPicker}
        >
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 15,
              padding: 20,
              margin: 20,
              maxWidth: 300,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: 15,
              }}
            >
              リアクションを選択
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {["1", "2", "3", "4", "5", "6"].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    backgroundColor: "#f0f0f0",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 60,
                    height: 60,
                  }}
                  onPress={async () => {
                    if (reactionPickerTarget) {
                      await handleReaction(
                        reactionPickerTarget.postId,
                        emoji,
                        reactionPickerTarget.isReply,
                        reactionPickerTarget.replyId
                      );
                    }
                    hideReactionPicker();
                  }}
                >
                  <Image
                    source={getReactionImage(emoji)}
                    style={{ width: 40, height: 40 }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
