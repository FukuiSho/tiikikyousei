// ホーム　地図

import { Ionicons } from '@expo/vector-icons'; // ← アイコン用
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function Home() {
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState<
    { latitude: number; longitude: number; text: string }[]
  >([]);
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('位置情報の権限がありません');
        return;
      }

      // リアルタイム位置取得
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,     // 3秒ごと
          distanceInterval: 1,    // 1m動いたら更新
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
      {/* 地図 */}
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
        {posts.map((post, index) => (
          //投稿マーカー
          <Marker
            key={index}
            coordinate={{ latitude: post.latitude, longitude: post.longitude }}
          >
            <View style={styles.customMarker}>
              <Text style={styles.customMarkerText}>
                {post.text}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>投稿する</Text>
            <TextInput
              style={styles.input}
              placeholder="今なにしてる？"
              value={postText}
              onChangeText={setPostText}
              multiline
            />
            {/* 画像はまだ未実装 → 後で画像選択ボタン追加 */}
            <View style={styles.modalButtons}>
              <Button title="キャンセル" onPress={() => setModalVisible(false)} />
              <Button
                title="投稿する"
                onPress={() => {
                  if (location) {
                    const newPost = {
                      latitude: location.latitude,
                      longitude: location.longitude,
                      text: postText,
                    };
                    setPosts((prevPosts) => [...prevPosts, newPost]);
                  }
                  setPostText('');
                  setModalVisible(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* 投稿ボタン */}
      <TouchableOpacity style={styles.postButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={36} color="#fff" />
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    height: 100,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  customMarker: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 10,
    borderColor: '#ff69b4',
    borderWidth: 2,
    maxWidth: 250, // 画面に収まる適切な最大横幅
    alignSelf: 'flex-start',     // 子要素にサイズを合わせる
  },
  customMarkerText: {
    color: '#333',
    fontSize: 14,
    flexShrink: 1,         // ← はみ出さず縮むように
    flexWrap: 'wrap',      // ← 折り返し可能に
    lineHeight: 18,
  },
});
