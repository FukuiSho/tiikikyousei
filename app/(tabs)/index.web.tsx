// Web版ホーム画面

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 簡易的な位置情報取得フック（Web専用）
function useWebLocation() {
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsLoading(false);
        },
        (error) => {
          console.error('位置情報取得エラー:', error);
          // フォールバック座標（東京駅）
          setLocation({
            latitude: 35.6762,
            longitude: 139.6503,
          });
          setIsLoading(false);
        }
      );
    } else {
      // フォールバック座標
      setLocation({
        latitude: 35.6762,
        longitude: 139.6503,
      });
      setIsLoading(false);
    }
  }, []);

  return { location, isLoading };
}

// Web版用の地図コンポーネント
const WebMap = React.memo(({ location }) => {
  const mapUrl = useMemo(() => 
    `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude-0.005}%2C${location.latitude-0.005}%2C${location.longitude+0.005}%2C${location.latitude+0.005}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`,
    [location.latitude, location.longitude]
  );

  return (
    <View style={styles.webMapContainer}>
      <iframe
        src={mapUrl}
        style={styles.webMapIframe}
        scrolling="no"
        frameBorder="0"
        title="現在地マップ"
      />
      <View style={styles.webMapOverlay}>
        <Text style={styles.webMapText}>
          📍 現在地: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </Text>
      </View>
    </View>
  );
});

export default function Home() {
  const { location, isLoading } = useWebLocation();

  const handlePostPress = useCallback(() => {
    console.log('投稿ボタンが押された');
    // 将来的にここに投稿機能を実装
  }, []);

  if (isLoading || !location) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>位置情報を取得中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Web版地図 */}
      <WebMap location={location} />

      {/* 投稿ボタン */}
      <TouchableOpacity style={styles.postButton} onPress={handlePostPress}>
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  postButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#ff69b4',
    borderRadius: 30,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  // Web用地図スタイル
  webMapContainer: {
    flex: 1,
    position: 'relative',
  },
  webMapIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  webMapOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 4,
  },
  webMapText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
