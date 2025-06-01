// ホーム　地図

import { Ionicons } from '@expo/vector-icons'; // ← アイコン用
import * as Location from 'expo-location';
import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { app, db } from '../../src/firebase';

export default function Home() {
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [postText, setPostText] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    // Firebase関係（関数実行まで）
    const fetchDataFromFirestore = async () => {
      try{
        console.log("Firebase app initialized:", app.name);
        console.log("Firestore instance:", db); // dbオブジェクトが利用可能か確認
      
        const querySnapshot = await getDocs(collection(db, "users"));
        console.log("--- Documents in 'users' collection ---");
        querySnapshot.forEach((doc) => {
          console.log(`${doc.id} => `, doc.data()); // ドキュメントのIDとデータをログに出力
        });
        console.log("--------------------------------------");
      } catch(error){
        console.error("Error fetching or adding data: ", error);
      }
    };

    fetchDataFromFirestore(); // 関数実行

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
              <Button title="投稿する" onPress={() => {
                // 今は仮：投稿内容をログに出すだけ
                console.log('投稿:', postText, imageUri);
                setModalVisible(false);
              }} />
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
});
