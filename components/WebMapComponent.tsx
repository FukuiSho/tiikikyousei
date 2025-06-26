// Web環境用の地図コンポーネント
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./utils/styles";
import { Post } from "./utils/types";

interface WebMapComponentProps {
  location: any;
  posts: Post[];
  onMarkerPress: (post: Post) => void;
}

export const WebMapComponent: React.FC<WebMapComponentProps> = ({
  location,
  posts,
  onMarkerPress,
}) => {
  return (
    <View style={styles.mapContainer}>
      <View style={styles.webMapPlaceholder}>
        <Ionicons name="map" size={50} color="#ccc" />
        <Text style={styles.webMapText}>
          地図機能はモバイルアプリでご利用ください
        </Text>
        <Text style={styles.webMapSubtext}>
          Web版では投稿一覧で確認できます
        </Text>

        {/* 投稿一覧表示 */}
        <ScrollView style={styles.webPostsList}>
          {posts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.webPostItem}
              onPress={() => onMarkerPress(post)}
            >
              <View style={styles.webPostHeader}>
                <Text style={styles.webPostAuthor}>{post.author}</Text>
                <Text style={styles.webPostTime}>
                  {post.timestamp.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.webPostContent}>{post.content}</Text>
              {post.image && (
                <Text style={styles.webPostImage}>📷 画像付き</Text>
              )}
              <View style={styles.webPostLocation}>
                <Ionicons name="location" size={12} color="#666" />
                <Text style={styles.webPostLocationText}>
                  位置: {post.location.latitude.toFixed(4)},{" "}
                  {post.location.longitude.toFixed(4)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};
