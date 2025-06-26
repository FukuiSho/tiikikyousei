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

export const MapComponent: React.FC<MapComponentProps> = ({
  location,
  posts,
  onMarkerPress,
  mapRef,
}) => {
  return (
    <View style={styles.mapContainer}>
      {location ? (
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
                title={post.author}
                description={`${post.content.substring(0, 50)}...`}
                onPress={() => onMarkerPress(post)}
                pinColor={post.image ? "#FF6B6B" : "#007AFF"}
              />
            );
          })}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>位置情報を取得中...</Text>
        </View>
      )}
    </View>
  );
};
