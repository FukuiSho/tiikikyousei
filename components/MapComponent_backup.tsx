import * as Location from "expo-location";
import React from "react";
import { Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { getOffsetCoordinates } from "./utils/locationUtils";
import { styles } from "./utils/styles";
import { Post } from "./utils/types";

interface MapComponentProps {
  location: Location.LocationObject | null;
  posts: Post[];
  onMarkerPress: (post: Post) => void;
  mapRef: React.RefObject<MapView | null>;
}

// 投稿バブルコンポーネント
const PostBubble: React.FC<{
  post: Post;
  onPress: () => void;
  index: number;
}> = ({ post, onPress, index }) => {
  console.log(
    `🟡 PostBubble レンダリング: ID=${post.id}, Index=${index}, Author=${post.author}, Content=${post.content}`
  );

  return (
    <View
      style={[
        styles.postBubble,
        { backgroundColor: index % 2 === 0 ? "orange" : "lightgreen" },
      ]}
    >
      <Text
        style={[styles.postAuthor, { color: "darkblue", fontWeight: "bold" }]}
      >
        [{index}] {post.author || "不明"}
      </Text>
      <Text
        style={[styles.postContent, { color: "darkred" }]}
        numberOfLines={2}
      >
        {post.content || "内容なし"}
      </Text>
      {post.image && (
        <View style={[styles.imageIndicator, { backgroundColor: "magenta" }]} />
      )}
    </View>
  );
};

export const MapComponent: React.FC<MapComponentProps> = ({
  location,
  posts,
  onMarkerPress,
  mapRef,
}) => {
  console.log("🚨🚨🚨 MapComponent が実行されました！ 🚨🚨🚨");
  console.log(
    `🗺️ MapComponent レンダリング - 投稿数: ${posts.length}, 位置情報: ${location ? "あり" : "なし"}`
  );

  // デバッグ用：最初の3つの投稿データを詳細表示
  posts.slice(0, 3).forEach((post, index) => {
    console.log(
      `📍 投稿${index}: ID=${post.id}, 作者=${post.author}, 内容="${post.content}"`
    );
  });

  console.log("🔥🔥🔥 バブル表示の処理開始 🔥🔥🔥");

  return (
    <View style={[styles.mapContainer, { position: "relative", zIndex: 1 }]}>
      {location ? (
        <>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.005, // 高倍率表示
              longitudeDelta: 0.005, // 高倍率表示
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
              const coordinate = getOffsetCoordinates(post, posts);
              return (
                <Marker
                  key={post.id}
                  coordinate={coordinate}
                  onPress={() => onMarkerPress(post)}
                  pinColor={post.image ? "#FF6B6B" : "#007AFF"}
                />
              );
            })}
          </MapView>

          {/* デバッグ用テストバブル */}
          {console.log("🎯 テストバブルをレンダリングします")}
          <View
            style={[
              styles.postBubbleOverlay,
              {
                top: 20,
                left: 20,
                backgroundColor: "red",
                padding: 20,
                zIndex: 99999,
              },
            ]}
          >
            <View
              style={[
                styles.postBubble,
                { backgroundColor: "lime", borderColor: "purple" },
              ]}
            >
              <Text style={[styles.postAuthor, { fontSize: 18, color: "red" }]}>
                🚨テストバブル🚨
              </Text>
              <Text
                style={[styles.postContent, { fontSize: 16, color: "blue" }]}
              >
                これが見えればバブル表示は動作中
              </Text>
            </View>
          </View>

          {/* バブル表示用のオーバーレイビュー */}
          <View style={styles.bubbleContainer}>
            {(() => {
              console.log(`🔥 バブルコンテナ内: 投稿数=${posts.length}`);
              return posts.slice(0, 6).map((post, index) => {
                console.log(
                  `� バブル${index}作成中: ID=${post.id}, Author=${post.author}, Content="${post.content}"`
                );
                const bubbleStyle = {
                  top: 80 + (index % 3) * 100,
                  left: 20 + (index % 2) * 160,
                };
                console.log(
                  `� バブル${index}位置: top=${bubbleStyle.top}, left=${bubbleStyle.left}`
                );

                return (
                  <View
                    key={`bubble-${post.id}`}
                    style={[styles.postBubbleOverlay, bubbleStyle]}
                  >
                    <PostBubble
                      post={post}
                      onPress={() => onMarkerPress(post)}
                      index={index}
                    />
                  </View>
                );
              });
            })()}
          </View>
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>位置情報を取得中...</Text>
        </View>
      )}
    </View>
  );
};
