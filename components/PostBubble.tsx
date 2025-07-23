import React from "react";
import { Image, Text, View } from "react-native";

interface PostBubbleProps {
  content: string;
  author: string;
  maxWidth?: number;
  trianglePosition?: "bottom" | "top" | "none";
  image?: string; // 画像URLを追加
}

export const PostBubble: React.FC<PostBubbleProps> = ({
  content,
  author,
  maxWidth = 200,
  trianglePosition = "bottom",
  image, // 画像URLを受け取る
}) => {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 8,
        padding: 8,
        maxWidth,
        minWidth: 120,
        borderWidth: 1,
        borderColor: "#ddd",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <Text style={{ fontSize: 10, color: "#666", marginBottom: 2 }}>
        {author}
      </Text>
      <Text style={{ fontSize: 12, color: "#333" }}>{content}</Text>
      {/* 画像表示 */}
      {image && (
        <Image
          source={{ uri: image }}
          style={{
            width: maxWidth - 16,
            height: 80,
            borderRadius: 4,
            marginTop: 4,
          }}
          resizeMode="cover"
        />
      )}
      {/* 吹き出しの三角形 */}
      {trianglePosition === "bottom" && (
        <View
          style={{
            position: "absolute",
            bottom: -6,
            left: "50%",
            marginLeft: -6,
            width: 0,
            height: 0,
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderTopWidth: 6,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: "white",
          }}
        />
      )}
      {trianglePosition === "top" && (
        <View
          style={{
            position: "absolute",
            top: -6,
            left: "50%",
            marginLeft: -6,
            width: 0,
            height: 0,
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderBottomWidth: 6,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: "white",
          }}
        />
      )}
    </View>
  );
};
