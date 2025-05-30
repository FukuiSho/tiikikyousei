// Web環境用のreact-native-mapsスタブ
import React from 'react';
import { View } from 'react-native';

// MapViewのスタブコンポーネント
const MapView = (props) => {
  return React.createElement(View, {
    style: props.style,
    children: props.children
  });
};

// Markerのスタブコンポーネント
const Marker = (props) => {
  return React.createElement(View, props);
};

// 他のコンポーネントのスタブ
const Polyline = (props) => React.createElement(View, props);
const Polygon = (props) => React.createElement(View, props);
const Circle = (props) => React.createElement(View, props);

// デフォルトエクスポート
export default MapView;

// 名前付きエクスポート
export {
    Circle, MapView,
    Marker, Polygon, Polyline
};

