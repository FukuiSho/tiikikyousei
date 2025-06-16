import * as Location from 'expo-location';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase.config';

// 位置情報データの型定義
export interface LocationData {
  id?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date | any; // Firestore timestamp
  userId: string;
  address?: string;
}

// 現在地を取得してFirestoreに保存
export const saveLocationToFirestore = async (userId: string): Promise<LocationData | null> => {
  try {
    // 位置情報の許可を確認
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('位置情報の許可が得られませんでした');
      return null;
    }

    // 現在地を取得
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    // 住所を取得（オプション）
    let address = '';
    try {
      const addressResult = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (addressResult.length > 0) {
        const addr = addressResult[0];
        address = `${addr.city || ''} ${addr.street || ''} ${addr.name || ''}`.trim();
      }
    } catch (error) {
      console.warn('住所の取得に失敗しました:', error);
    }

    // Firestoreに保存するデータ
    const locationData: Omit<LocationData, 'id'> = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || undefined,
      timestamp: serverTimestamp(),
      userId: userId,
      address: address || undefined,
    };

    // Firestoreに保存
    const docRef = await addDoc(collection(db, 'locations'), locationData);
    
    console.log('位置情報をFirestoreに保存しました:', docRef.id);
    
    return {
      ...locationData,
      id: docRef.id,
      timestamp: new Date(), // 表示用に現在時刻を設定
    };

  } catch (error) {
    console.error('位置情報の保存に失敗しました:', error);
    return null;
  }
};

// Firestoreから最新の位置情報を取得
export const getLatestLocationsFromFirestore = async (limitCount: number = 10): Promise<LocationData[]> => {
  try {
    const q = query(
      collection(db, 'locations'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const locations: LocationData[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      locations.push({
        id: doc.id,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        timestamp: data.timestamp?.toDate() || new Date(),
        userId: data.userId,
        address: data.address,
      });
    });
    
    return locations;
  } catch (error) {
    console.error('位置情報の取得に失敗しました:', error);
    return [];
  }
};

// 特定ユーザーの位置情報履歴を取得
export const getUserLocationHistory = async (userId: string, limitCount: number = 50): Promise<LocationData[]> => {
  try {
    const q = query(
      collection(db, 'locations'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const locations: LocationData[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userId === userId) {
        locations.push({
          id: doc.id,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          timestamp: data.timestamp?.toDate() || new Date(),
          userId: data.userId,
          address: data.address,
        });
      }
    });
    
    return locations;
  } catch (error) {
    console.error('ユーザー位置情報履歴の取得に失敗しました:', error);
    return [];
  }
};
