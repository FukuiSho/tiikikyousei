// ネイティブ版ホーム画面

import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function Home() {
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);

  const handlePostPress = useCallback(() => {
    console.log('投稿ボタンが押された');
    // 将来的にここに投稿機能を実装
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('位置情報の権限がありません');
        return;
      }

      // リアルタイム位置取得（最適化済み）
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // 精度をBalancedに調整
          timeInterval: 5000,     // 5秒ごとに変更（負荷軽減）
          distanceInterval: 10,   // 10m動いたら更新（頻度を減らす）
        },
        (loc) => {
          setLocation(loc.coords);
        }
      );

      // コンポーネントが消えたら位置監視停止
      return () => {
        subscription.remove();
      };
    })();
  }, []);

  if (!location) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ネイティブ版地図 */}
      <MapView
        style={styles.map}
        region={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title="現在地"
          description="リアルタイムに追従中"
        />
      </MapView>

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
  map: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
