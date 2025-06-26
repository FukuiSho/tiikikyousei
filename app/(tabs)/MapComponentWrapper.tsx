// プラットフォーム対応地図コンポーネント
import React from "react";
import { Platform } from "react-native";
import { Post } from "./types";
import { WebMapComponent } from "./WebMapComponent";

interface MapComponentWrapperProps {
  location: any;
  posts: Post[];
  onMarkerPress: (post: Post) => void;
  mapRef: any;
}

export const MapComponentWrapper: React.FC<MapComponentWrapperProps> = (
  props
) => {
  if (Platform.OS === "web") {
    return <WebMapComponent {...props} />;
  }

  // Native環境の場合、MapComponentを遅延読み込み
  const MapComponentLazy = React.lazy(() =>
    import("./MapComponent").then((module) => ({
      default: module.MapComponent,
    }))
  );

  return (
    <React.Suspense fallback={<WebMapComponent {...props} />}>
      <MapComponentLazy {...props} />
    </React.Suspense>
  );
};
