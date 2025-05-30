// ホーム画面 - マルチプラットフォーム対応版

import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 位置情報の型定義
interface LocationCoords {
  latitude: number;
  longitude: number;
}

// マルチプラットフォーム対応の位置情報取得フック
function useLocation() {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getLocationAsync = async () => {
      try {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
          // Web環境での位置情報取得
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
              setError('位置情報の取得に失敗しました');
              // フォールバック座標（東京駅）
              setLocation({
                latitude: 35.6762,
                longitude: 139.6503,
              });
              setIsLoading(false);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000
            }
          );
        } else {
          // Android/iOS環境での位置情報取得
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setError('位置情報の権限が拒否されました');
            // フォールバック座標（東京駅）
            setLocation({
              latitude: 35.6762,
              longitude: 139.6503,
            });
            setIsLoading(false);
            return;
          }

          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });

          setLocation({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
          });
          setIsLoading(false);
        }
      } catch (error) {
        console.error('位置情報取得エラー:', error);
        setError('位置情報の取得に失敗しました');
        // フォールバック座標（東京駅）
        setLocation({
          latitude: 35.6762,
          longitude: 139.6503,
        });
        setIsLoading(false);
      }
    };

    getLocationAsync();
  }, []);

  return { location, isLoading, error };
}

// Web版用の地図コンポーネント
const WebMap = React.memo(({ location }: { location: LocationCoords }) => {
  const mapUrl = useMemo(() => 
    `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude-0.005}%2C${location.latitude-0.005}%2C${location.longitude+0.005}%2C${location.latitude+0.005}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`,
    [location.latitude, location.longitude]
  );

  if (Platform.OS === 'web') {
    // Web環境でのHTML要素を使用
    return React.createElement('div', { 
      style: { 
        flex: 1, 
        position: 'relative',
        height: '100%',
        width: '100%'
      } 
    }, [
      React.createElement('iframe', {
        key: 'map-iframe',
        src: mapUrl,
        style: {
          width: '100%',
          height: '100%',
          border: 'none',
        },
        scrolling: 'no',
        frameBorder: '0',
        title: '現在地マップ'
      }),
      React.createElement('div', {
        key: 'map-overlay',
        style: {
          position: 'absolute',
          top: 10,
          left: 10,
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: 8,
          borderRadius: 4,
          zIndex: 100,
        }
      }, 
      React.createElement('span', {
        style: {
          color: 'white',
          fontSize: 12,
          fontWeight: 'bold',
        }
      }, `📍 現在地: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`))
    ]);
  }

  // ネイティブ環境のフォールバック
  return (
    <View style={styles.webMapContainer}>
      <View style={styles.webMapOverlay}>
        <Text style={styles.webMapText}>
          📍 現在地: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </Text>
      </View>
    </View>
  );
});

// ネイティブ版用の地図表示コンポーネント
const NativeMapDisplay = React.memo(({ location }: { location: LocationCoords }) => {
  const handleOpenMaps = async () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${location.latitude},${location.longitude}`,
      android: `geo:0,0?q=${location.latitude},${location.longitude}`,
      default: `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`,
    });
    
    if (url) {
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          // フォールバック：Googleマップをブラウザで開く
          const webUrl = `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`;
          await Linking.openURL(webUrl);
        }      } catch (error) {
        console.error('地図アプリを開く際のエラー:', error);
        Alert.alert(
          '地図情報', 
          `緯度: ${location.latitude.toFixed(6)}\n経度: ${location.longitude.toFixed(6)}\n\n地図アプリを開けませんでした。`,
          [{ text: 'OK' }]
        );
      }
    }
  };

  return (
    <View style={styles.nativeMapContainer}>
      <View style={styles.mapHeader}>
        <Ionicons name="location" size={32} color="#007AFF" />
        <Text style={styles.nativeMapTitle}>現在地</Text>
      </View>
      
      <View style={styles.coordinatesContainer}>
        <Text style={styles.coordinateLabel}>緯度</Text>
        <Text style={styles.nativeMapCoords}>{location.latitude.toFixed(6)}</Text>
        
        <Text style={styles.coordinateLabel}>経度</Text>
        <Text style={styles.nativeMapCoords}>{location.longitude.toFixed(6)}</Text>
      </View>

      <TouchableOpacity style={styles.mapButton} onPress={handleOpenMaps}>
        <Ionicons name="map" size={20} color="white" />
        <Text style={styles.mapButtonText}>地図で確認</Text>
      </TouchableOpacity>
      
      <Text style={styles.nativeMapNote}>
        位置情報が正常に取得されました
      </Text>
    </View>
  );
});

// メインコンポーネント
export default function HomeScreen() {
  const { location, isLoading, error } = useLocation();

  const handlePostPress = () => {
    if (location) {
      Alert.alert(
        '投稿', 
        `現在地から投稿しますか？\n\n緯度: ${location.latitude.toFixed(4)}\n経度: ${location.longitude.toFixed(4)}`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '投稿する', 
            onPress: () => {
              // 将来的にここに投稿機能を実装
              Alert.alert('成功', '投稿されました！');
            }
          }
        ]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>位置情報を取得中...</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error || '位置情報の取得に失敗しました'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* プラットフォーム別の地図表示 */}      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <WebMap location={location} />
        ) : (
          <NativeMapDisplay location={location} />
        )}
      </View>      {/* 投稿ボタン */}
      <TouchableOpacity 
        style={styles.postButton} 
        onPress={handlePostPress}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
  },
  postButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#ff69b4',
    borderRadius: 30,
    padding: 16,
    elevation: 5,
    ...(Platform.OS === 'web' 
      ? { boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        }
    ),
  },
  // Web地図関連スタイル
  webMapContainer: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapOverlay: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 8,
  },
  webMapText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },  // ネイティブ地図関連スタイル
  nativeMapContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  nativeMapTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#333',
  },
  coordinatesContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 200,
  },
  coordinateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontWeight: '600',
  },
  nativeMapCoords: {
    fontSize: 18,
    color: '#333',
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
  },
  mapButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mapButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  nativeMapNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
});
