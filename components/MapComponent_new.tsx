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
    <View style={styles.postBubble}>
      <Text style={styles.postAuthor}>
        [{index}] {post.author || "不明"}
      </Text>
      <Text style={styles.postContent} numberOfLines={2}>
        {post.content || "内容なし"}
      </Text>
      {post.image && <View style={styles.imageIndicator} />}
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
    <View style={styles.mapContainer}>
      {location ? (
        <View style={{ flex: 1, position: "relative" }}>
          {/* マップビュー */}
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
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

          {/* 絶対配置オーバーレイ - テストバブル */}
          <View
            style={{
              position: "absolute",
              top: 50,
              left: 50,
              width: 200,
              height: 100,
              backgroundColor: "red",
              zIndex: 999999,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 5,
              borderColor: "yellow",
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>
              🚨 テストバブル 🚨
            </Text>
            <Text style={{ color: "white", fontSize: 12 }}>
              表示されています！
            </Text>
          </View>

          {/* 投稿バブルオーバーレイ */}
          {posts.slice(0, 6).map((post, index) => {
            console.log(`🟢 バブル${index}作成中: ID=${post.id}`);

            return (
              <View
                key={`bubble-${post.id}`}
                style={{
                  position: "absolute",
                  top: 150 + (index % 3) * 120,
                  left: 50 + (index % 2) * 180,
                  zIndex: 999998,
                }}
              >
                <PostBubble
                  post={post}
                  onPress={() => onMarkerPress(post)}
                  index={index}
                />
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>位置情報を取得中...</Text>
        </View>
      )}
    </View>
  );
};
