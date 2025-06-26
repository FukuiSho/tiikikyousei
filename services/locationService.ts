import * as Location from "expo-location";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase.config";

// 位置情報データの型定義
export interface Users {
  id: string; // ID（仮のメールアドレス）
  username: string; // ユーザー名
  icon: string; // 写真URL
  timestamp: Date | any; // アカウント作成時刻
  oneMessage: string; // ひとことメッセージ
  coordinates: {
    latitude: number; // 緯度
    longitude: number; // 経度
  };
  profileID: string; // プロフィールID（メールアドレス+'profile'）
  encounters: {
    userIds: string[]; // すれ違ったUserIDのリスト
    timestamps: Date[]; // 対応するタイムスタンプ
    locations: { latitude: number; longitude: number }[]; // 対応する位置情報
    distances: number[]; // 対応する距離（メートル）
    count: number; // 総すれ違い回数（パフォーマンス用）
  };
}

// 表示用のすれ違い情報（ユーザー詳細情報付き）
export interface EncounterWithUserInfo {
  otherUserId: string;
  otherUsername: string;
  otherIcon: string;
  otherOneMessage: string;
  timestamp: Date;
  location: { latitude: number; longitude: number };
  distance: number;
}

// 個別のすれ違い記録（内部処理用）
interface EncounterRecord {
  userId: string;
  timestamp: Date;
  location: { latitude: number; longitude: number };
  distance: number;
}

// 現在地を取得してFirestoreに保存
export const saveLocationToFirestore = async (
  userId: string
): Promise<Users | null> => {
  try {
    console.log("saveLocationToFirestore開始 - userId:", userId);

    // Firebase接続確認
    if (!db) {
      console.error("Firebase Firestoreが初期化されていません");
      return null;
    }
    console.log("Firebase Firestore接続確認OK");

    // 位置情報の許可を確認
    console.log("位置情報の許可状態を確認中...");
    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log("位置情報の許可状態:", status);

    if (status !== "granted") {
      console.error("位置情報の許可が得られませんでした");
      return null;
    }

    // 現在地を取得（複数回試行）
    console.log("現在地を取得中...");
    let location;
    let attemptCount = 0;
    const maxAttempts = 3;

    while (attemptCount < maxAttempts) {
      try {
        attemptCount++;
        console.log(`位置情報取得試行 ${attemptCount}/${maxAttempts}`);

        // より緩い設定から試行
        const accuracyOptions = [
          Location.Accuracy.High,
          Location.Accuracy.Balanced,
          Location.Accuracy.Low,
        ];

        const accuracy =
          accuracyOptions[
            Math.min(attemptCount - 1, accuracyOptions.length - 1)
          ];
        console.log(
          `精度設定: ${accuracy === Location.Accuracy.High ? "High" : accuracy === Location.Accuracy.Balanced ? "Balanced" : "Low"}`
        );

        location = await Location.getCurrentPositionAsync({
          accuracy: accuracy,
        });

        console.log("位置情報取得成功:", {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: new Date(location.timestamp).toISOString(),
        });
        break; // 成功したらループを抜ける
      } catch (error) {
        console.warn(`位置情報取得試行${attemptCount}失敗:`, error);

        if (attemptCount < maxAttempts) {
          const waitTime = attemptCount * 2000; // 段階的に待機時間を延長
          console.log(`${waitTime / 1000}秒後に再試行します...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          console.error(
            "位置情報取得に失敗しました（最大試行回数に達しました）"
          );

          // 最後の手段として、キャッシュされた位置情報を取得を試行
          try {
            console.log("キャッシュされた位置情報の取得を試行中...");
            location = await Location.getLastKnownPositionAsync({
              maxAge: 60000, // 1分以内のキャッシュを許可
              requiredAccuracy: 1000, // 1km以内の精度を許可
            });
            if (location) {
              console.log("キャッシュされた位置情報を使用:", location.coords);
              break;
            }
          } catch (cacheError) {
            console.warn(
              "キャッシュされた位置情報も取得できませんでした:",
              cacheError
            );
          }

          return null;
        }
      }
    }

    if (!location) {
      console.error("位置情報の取得に失敗しました");
      return null;
    } // 住所を取得（オプション）
    console.log("住所を取得中...");
    let address = "";
    try {
      const addressResult = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (addressResult.length > 0) {
        const addr = addressResult[0];
        address =
          `${addr.city || ""} ${addr.street || ""} ${addr.name || ""}`.trim();
        console.log("住所取得成功:", address);
      }
    } catch (error) {
      console.warn("住所の取得に失敗しました:", error);
    } // Firestoreに保存するデータ（初期encounters設定付き）
    const locationData: Omit<Users, "id"> = {
      username: `User ${userId}`, // デフォルトのユーザー名
      icon: "https://example.com/images/default.jpg", // デフォルトアイコン
      timestamp: serverTimestamp(),
      oneMessage: "現在地を共有しました", // デフォルトメッセージ
      coordinates: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      profileID: `${userId}profile`,
      encounters: {
        userIds: [],
        timestamps: [],
        locations: [],
        distances: [],
        count: 0,
      },
    };
    console.log("Firestoreに保存するデータ:", locationData);

    // ユーザーIDベースの固定ドキュメントIDを使用
    const documentId = `user_${userId}`;
    console.log("使用するドキュメントID:", documentId);

    // Firestoreに保存（既存のドキュメントを更新、encounters フィールドは保持）
    console.log("Firestoreに保存中...");
    const docRef = doc(db, "users", documentId);

    // 既存のドキュメントを確認
    const existingDoc = await getDoc(docRef);
    let existingEncounters = {
      userIds: [],
      timestamps: [],
      locations: [],
      distances: [],
      count: 0,
    };

    if (existingDoc.exists()) {
      const existingData = existingDoc.data();
      if (existingData.encounters) {
        existingEncounters = existingData.encounters;
        console.log("既存のencountersデータを保持します:", existingEncounters);
      }
    }

    // encountersを保持してドキュメントを更新
    const updatedLocationData = {
      ...locationData,
      encounters: existingEncounters, // 既存のencountersを保持
    };

    await setDoc(docRef, updatedLocationData);
    console.log(
      "位置情報をFirestoreに保存/更新しました（encounters保持）:",
      documentId
    );

    // すれ違い検出を実行
    console.log("すれ違い検出を開始します...");
    const encounters = await detectAndRecordEncounters(userId, {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    if (encounters.length > 0) {
      console.log(`${encounters.length}件のすれ違いを検出しました`);
    }
    return {
      id: documentId,
      username: `User ${userId}`,
      icon: "https://example.com/images/default.jpg",
      timestamp: new Date(), // 表示用に現在時刻を設定
      oneMessage: "現在地を共有しました",
      coordinates: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      profileID: `${userId}profile`,
      encounters: existingEncounters, // encountersフィールドを追加
    };
  } catch (error) {
    console.error("位置情報の保存に失敗しました:", error);
    return null;
  }
};

// Firestoreから最新の位置情報を取得
export const getLatestLocationsFromFirestore = async (
  limitCount: number = 10
): Promise<Users[]> => {
  try {
    const q = query(
      collection(db, "users"),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const locations: Users[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const coordinates = {
        latitude: data.coordinates?.latitude || data.latitude || 0,
        longitude: data.coordinates?.longitude || data.longitude || 0,
      };
      console.log(
        `ユーザーデータ取得: ${doc.id}, 座標: ${coordinates.latitude}, ${coordinates.longitude}`
      );

      locations.push({
        id: doc.id,
        username: data.username || `User ${data.userId || "Unknown"}`,
        icon: data.icon || "https://example.com/images/default.jpg",
        timestamp: data.timestamp?.toDate() || new Date(),
        oneMessage: data.oneMessage || "メッセージなし",
        coordinates: coordinates,
        profileID: data.profileID || `${data.userId || "unknown"}profile`,
        encounters: data.encounters || {
          userIds: [],
          timestamps: [],
          locations: [],
          distances: [],
          count: 0,
        },
      });
    });

    return locations;
  } catch (error) {
    console.error("位置情報の取得に失敗しました:", error);
    return [];
  }
};

// 特定ユーザーの位置情報履歴を取得
export const getUserLocationHistory = async (
  userId: string,
  limitCount: number = 50
): Promise<Users[]> => {
  try {
    const q = query(
      collection(db, "users"),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const locations: Users[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userId === userId || data.profileID === `${userId}profile`) {
        locations.push({
          id: doc.id,
          username: data.username || `User ${userId}`,
          icon: data.icon || "https://example.com/images/default.jpg",
          timestamp: data.timestamp?.toDate() || new Date(),
          oneMessage: data.oneMessage || "メッセージなし",
          coordinates: {
            latitude: data.coordinates?.latitude || data.latitude || 0,
            longitude: data.coordinates?.longitude || data.longitude || 0,
          },
          profileID: data.profileID || `${userId}profile`,
          encounters: data.encounters || {
            userIds: [],
            timestamps: [],
            locations: [],
            distances: [],
            count: 0,
          },
        });
      }
    });

    return locations;
  } catch (error) {
    console.error("ユーザー位置情報履歴の取得に失敗しました:", error);
    return [];
  }
};

// 特定のユーザーの位置情報を取得
export const getUserLocationFromFirestore = async (
  userId: string
): Promise<Users | null> => {
  try {
    const documentId = `user_${userId}`;
    const docRef = doc(db, "users", documentId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        username: data.username || `User ${userId}`,
        icon: data.icon || "https://example.com/images/default.jpg",
        timestamp: data.timestamp?.toDate() || new Date(),
        oneMessage: data.oneMessage || "メッセージなし",
        coordinates: {
          latitude: data.coordinates?.latitude || data.latitude || 0,
          longitude: data.coordinates?.longitude || data.longitude || 0,
        },
        profileID: data.profileID || `${userId}profile`,
        encounters: data.encounters || {
          userIds: [],
          timestamps: [],
          locations: [],
          distances: [],
          count: 0,
        },
      };
    } else {
      console.log("指定されたユーザーの位置情報が見つかりません");
      return null;
    }
  } catch (error) {
    console.error("位置情報の取得に失敗しました:", error);
    return null;
  }
};

// 2点間の距離を計算（メートル単位）
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // 距離（メートル）
};

// 近くのユーザーを検出してすれ違い情報を記録
export const detectAndRecordEncounters = async (
  myUserId: string,
  myLocation: { latitude: number; longitude: number },
  encounterThreshold: number = 2 // デフォルト2メートル
): Promise<EncounterWithUserInfo[]> => {
  try {
    console.log("すれ違い検出開始 - userId:", myUserId);

    // 全ユーザーの位置情報を取得
    const allUsers = await getLatestLocationsFromFirestore(100); // 最大100件取得
    const detectedEncounters: EncounterWithUserInfo[] = [];

    // 自分以外のユーザーをチェック
    for (const otherUser of allUsers) {
      if (otherUser.id === myUserId) continue; // 自分自身は除外

      // 距離を計算
      const distance = calculateDistance(
        myLocation.latitude,
        myLocation.longitude,
        otherUser.coordinates.latitude,
        otherUser.coordinates.longitude
      );

      console.log(`距離計算: ${otherUser.username} - ${distance.toFixed(2)}m`);

      // 閾値以内の場合
      if (distance <= encounterThreshold) {
        console.log(
          `すれ違い検出: ${otherUser.username} (${distance.toFixed(2)}m)`
        );

        // 重複チェック（過去3時間以内に同じユーザーとのすれ違いがないか）
        const isDuplicate = await checkRecentEncounterInUser(
          myUserId,
          otherUser.id,
          180
        );

        if (!isDuplicate) {
          // 3時間以内の重複がない場合は記録
          const encounterLocation = {
            latitude:
              (myLocation.latitude + otherUser.coordinates.latitude) / 2,
            longitude:
              (myLocation.longitude + otherUser.coordinates.longitude) / 2,
          };

          const encounterInfo: EncounterWithUserInfo = {
            otherUserId: otherUser.id,
            otherUsername: otherUser.username,
            otherIcon: otherUser.icon,
            otherOneMessage: otherUser.oneMessage,
            timestamp: new Date(),
            location: encounterLocation,
            distance: Math.round(distance * 100) / 100, // 小数点以下2桁
          };

          detectedEncounters.push(encounterInfo);

          // Usersドキュメントにすれ違い情報を保存
          await addEncounterToUser(myUserId, {
            userId: otherUser.id,
            timestamp: new Date(),
            location: encounterLocation,
            distance: Math.round(distance * 100) / 100,
          });

          // 相手のユーザーにも記録
          await addEncounterToUser(otherUser.id, {
            userId: myUserId,
            timestamp: new Date(),
            location: encounterLocation,
            distance: Math.round(distance * 100) / 100,
          });

          console.log(`新規すれ違いを記録: ${otherUser.username}`);
        } else {
          console.log(
            `重複スキップ: ${otherUser.username} (3時間以内に記録済み)`
          );
        }
      }
    }

    console.log(`すれ違い検出完了: ${detectedEncounters.length}件`);
    return detectedEncounters;
  } catch (error) {
    console.error("すれ違い検出エラー:", error);
    return [];
  }
};

// Usersドキュメントにすれ違い情報を追加
const addEncounterToUser = async (
  userId: string,
  encounterRecord: EncounterRecord
): Promise<void> => {
  try {
    const documentId = `user_${userId}`;
    const docRef = doc(db, "users", documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const userData = docSnap.data();
      const currentEncounters = userData.encounters || {
        userIds: [],
        timestamps: [],
        locations: [],
        distances: [],
        count: 0,
      };

      // 新しいすれ違い情報を追加
      currentEncounters.userIds.push(encounterRecord.userId);
      currentEncounters.timestamps.push(encounterRecord.timestamp);
      currentEncounters.locations.push(encounterRecord.location);
      currentEncounters.distances.push(encounterRecord.distance);
      currentEncounters.count += 1;

      // ドキュメントを更新
      await setDoc(docRef, {
        ...userData,
        encounters: currentEncounters,
      });

      console.log(`ユーザー ${userId} のすれ違い情報を更新しました`);
    } else {
      console.error(`ユーザー ${userId} が見つかりません`);
    }
  } catch (error) {
    console.error("ユーザーのすれ違い情報追加エラー:", error);
  }
};

// Usersドキュメント内で最近のすれ違い記録をチェック（重複防止）
const checkRecentEncounterInUser = async (
  myUserId: string,
  otherUserId: string,
  withinMinutes: number
): Promise<boolean> => {
  try {
    const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000);
    console.log(
      `重複チェック開始: ${myUserId} vs ${otherUserId}, カットオフ時間: ${cutoffTime.toISOString()}`
    );

    const documentId = `user_${myUserId}`;
    const docRef = doc(db, "users", documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const userData = docSnap.data();
      const encounters = userData.encounters;

      if (encounters && encounters.userIds && encounters.timestamps) {
        // 最近のすれ違いをチェック
        for (let i = 0; i < encounters.userIds.length; i++) {
          const encounteredUserId = encounters.userIds[i];
          const encounterTime = encounters.timestamps[i].toDate
            ? encounters.timestamps[i].toDate()
            : new Date(encounters.timestamps[i]);

          if (encounterTime < cutoffTime) {
            break; // 時間外なので終了（新しい順にソートされていると仮定）
          }

          if (encounteredUserId === otherUserId) {
            console.log(
              `重複発見: ${myUserId} と ${otherUserId} のすれ違いが既に記録済み`
            );
            return true; // 重複発見
          }
        }
      }
    }

    console.log(`重複なし: ${myUserId} と ${otherUserId} の新規すれ違い`);
    return false; // 重複なし
  } catch (error) {
    console.error("重複チェックエラー:", error);
    return false; // エラーの場合は重複なしとして処理
  }
};

// 最近のすれ違い記録をチェック（重複防止）- 古いencountersコレクション用（削除予定）

// usersdataのサンプルデータ
export const usersdata: Users[] = [
  {
    id: "user1@example.com",
    username: "田中太郎",
    icon: "https://example.com/images/user1.jpg",
    timestamp: new Date("2024-01-15T10:30:00Z"),
    oneMessage: "よろしくお願いします！",
    coordinates: {
      latitude: 35.6762,
      longitude: 139.6503,
    },
    profileID: "user1@example.comprofile",
    encounters: {
      userIds: [],
      timestamps: [],
      locations: [],
      distances: [],
      count: 0,
    },
  },
  {
    id: "user2@example.com",
    username: "佐藤花子",
    icon: "https://example.com/images/user2.jpg",
    timestamp: new Date("2024-02-20T14:15:00Z"),
    oneMessage: "今日はいい天気ですね",
    coordinates: {
      latitude: 34.6937,
      longitude: 135.5023,
    },
    profileID: "user2@example.comprofile",
    encounters: {
      userIds: [],
      timestamps: [],
      locations: [],
      distances: [],
      count: 0,
    },
  },
  {
    id: "user3@example.com",
    username: "山田次郎",
    icon: "https://example.com/images/user3.jpg",
    timestamp: new Date("2024-03-10T09:45:00Z"),
    oneMessage: "コーヒーが美味しい",
    coordinates: {
      latitude: 43.0642,
      longitude: 141.3469,
    },
    profileID: "user3@example.comprofile",
    encounters: {
      userIds: [],
      timestamps: [],
      locations: [],
      distances: [],
      count: 0,
    },
  },
  {
    id: "user4@example.com",
    username: "鈴木美咲",
    icon: "https://example.com/images/user4.jpg",
    timestamp: new Date("2024-04-05T16:20:00Z"),
    oneMessage: "桜がきれいです",
    coordinates: {
      latitude: 33.5904,
      longitude: 130.4017,
    },
    profileID: "user4@example.comprofile",
    encounters: {
      userIds: [],
      timestamps: [],
      locations: [],
      distances: [],
      count: 0,
    },
  },
  {
    id: "user5@example.com",
    username: "高橋健太",
    icon: "https://example.com/images/user5.jpg",
    timestamp: new Date("2024-05-12T11:00:00Z"),
    oneMessage: "新しいプロジェクト開始！",
    coordinates: {
      latitude: 36.2048,
      longitude: 138.2529,
    },
    profileID: "user5@example.comprofile",
    encounters: {
      userIds: [],
      timestamps: [],
      locations: [],
      distances: [],
      count: 0,
    },
  },
];

// ユーザーのすれ違い履歴を取得（新しい構造）
export const getUserEncounters = async (
  userId: string,
  limitCount: number = 50
): Promise<EncounterWithUserInfo[]> => {
  try {
    const documentId = `user_${userId}`;
    const docRef = doc(db, "users", documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log(`ユーザー ${userId} が見つかりません`);
      return [];
    }

    const userData = docSnap.data();
    const encounters = userData.encounters;

    if (!encounters || !encounters.userIds || encounters.userIds.length === 0) {
      console.log(`ユーザー ${userId} のすれ違い履歴がありません`);
      return [];
    }

    // EncounterWithUserInfo形式に変換
    const encounterList: EncounterWithUserInfo[] = [];

    // 最新順で処理（最新limitCount件のみ）
    const totalCount = encounters.userIds.length;
    const startIndex = Math.max(0, totalCount - limitCount);

    for (let i = totalCount - 1; i >= startIndex; i--) {
      const otherUserId = encounters.userIds[i];

      // 相手のユーザー情報を取得
      const otherUserDoc = await getDoc(
        doc(db, "users", `user_${otherUserId}`)
      );
      let otherUsername = "Unknown User";
      let otherIcon = "https://example.com/images/default.jpg";
      let otherOneMessage = "";

      if (otherUserDoc.exists()) {
        const otherUserData = otherUserDoc.data();
        otherUsername = otherUserData.username || "Unknown User";
        otherIcon =
          otherUserData.icon || "https://example.com/images/default.jpg";
        otherOneMessage = otherUserData.oneMessage || "";
      }

      encounterList.push({
        otherUserId: otherUserId,
        otherUsername: otherUsername,
        otherIcon: otherIcon,
        otherOneMessage: otherOneMessage,
        timestamp: encounters.timestamps[i].toDate
          ? encounters.timestamps[i].toDate()
          : new Date(encounters.timestamps[i]),
        location: encounters.locations[i],
        distance: encounters.distances[i],
      });
    }

    return encounterList;
  } catch (error) {
    console.error("すれ違い履歴の取得に失敗しました:", error);
    return [];
  }
};

// 今日のすれ違い数を取得
export const getTodayEncounterCount = async (
  userId: string
): Promise<number> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const encounters = await getUserEncounters(userId, 100);
    return encounters.filter((encounter) => {
      const encounterDate = new Date(encounter.timestamp);
      return encounterDate >= today;
    }).length;
  } catch (error) {
    console.error("今日のすれ違い数取得エラー:", error);
    return 0;
  }
};

// ==============================================
// UI表示用のAPI関数群
// ==============================================

// すれ違い履歴を取得（UI表示用）
export const getEncounterHistory = async (
  userId: string,
  options?: {
    limit?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<EncounterWithUserInfo[]> => {
  try {
    const limitCount = options?.limit || 50;
    const encounters = await getUserEncounters(userId, limitCount);

    // 日付フィルタリング
    if (options?.dateFrom || options?.dateTo) {
      return encounters.filter((encounter) => {
        const encounterDate = new Date(encounter.timestamp);
        const isAfterFrom =
          !options.dateFrom || encounterDate >= options.dateFrom;
        const isBeforeTo = !options.dateTo || encounterDate <= options.dateTo;
        return isAfterFrom && isBeforeTo;
      });
    }

    return encounters;
  } catch (error) {
    console.error("すれ違い履歴取得API エラー:", error);
    return [];
  }
};

// 今日のすれ違い情報を取得（UI表示用）
export const getTodayEncounters = async (
  userId: string
): Promise<{
  encounters: EncounterWithUserInfo[];
  count: number;
}> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEncounters = await getEncounterHistory(userId, {
      dateFrom: today,
      limit: 100,
    });

    return {
      encounters: todayEncounters,
      count: todayEncounters.length,
    };
  } catch (error) {
    console.error("今日のすれ違い取得API エラー:", error);
    return { encounters: [], count: 0 };
  }
};

// 週間すれ違い統計を取得（UI表示用）
export const getWeeklyEncounterStats = async (
  userId: string
): Promise<{
  totalCount: number;
  dailyCounts: { date: string; count: number }[];
  uniqueUsers: number;
}> => {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyEncounters = await getEncounterHistory(userId, {
      dateFrom: weekAgo,
      limit: 500,
    });

    // 日別カウント
    const dailyCounts: { [key: string]: number } = {};
    const uniqueUserIds = new Set<string>();

    weeklyEncounters.forEach((encounter) => {
      const dateStr = new Date(encounter.timestamp).toISOString().split("T")[0];
      dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
      uniqueUserIds.add(encounter.otherUserId);
    });

    // 過去7日分のデータを生成
    const dailyCountsArray = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyCountsArray.push({
        date: dateStr,
        count: dailyCounts[dateStr] || 0,
      });
    }

    return {
      totalCount: weeklyEncounters.length,
      dailyCounts: dailyCountsArray,
      uniqueUsers: uniqueUserIds.size,
    };
  } catch (error) {
    console.error("週間統計取得API エラー:", error);
    return {
      totalCount: 0,
      dailyCounts: [],
      uniqueUsers: 0,
    };
  }
};

// 特定のユーザーとのすれ違い履歴を取得（UI表示用）
export const getEncounterHistoryWithUser = async (
  myUserId: string,
  otherUserId: string,
  limit: number = 20
): Promise<EncounterWithUserInfo[]> => {
  try {
    const allEncounters = await getUserEncounters(myUserId, 200);
    return allEncounters
      .filter((encounter) => encounter.otherUserId === otherUserId)
      .slice(0, limit);
  } catch (error) {
    console.error("特定ユーザーとのすれ違い履歴取得API エラー:", error);
    return [];
  }
};

// すれ違いランキングを取得（UI表示用）
export const getEncounterRanking = async (
  userId: string,
  limit: number = 10
): Promise<
  {
    userId: string;
    username: string;
    icon: string;
    oneMessage: string;
    encounterCount: number;
    lastEncounter: Date;
  }[]
> => {
  try {
    const encounters = await getUserEncounters(userId, 500);

    // ユーザー別に集計
    const userStats: {
      [key: string]: {
        user: EncounterWithUserInfo;
        count: number;
        lastEncounter: Date;
      };
    } = {};

    encounters.forEach((encounter) => {
      const otherUserId = encounter.otherUserId;
      if (!userStats[otherUserId]) {
        userStats[otherUserId] = {
          user: encounter,
          count: 0,
          lastEncounter: new Date(encounter.timestamp),
        };
      }
      userStats[otherUserId].count++;
      const encounterDate = new Date(encounter.timestamp);
      if (encounterDate > userStats[otherUserId].lastEncounter) {
        userStats[otherUserId].lastEncounter = encounterDate;
      }
    });

    // ランキング形式で返す
    return Object.values(userStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((stat) => ({
        userId: stat.user.otherUserId,
        username: stat.user.otherUsername,
        icon: stat.user.otherIcon,
        oneMessage: stat.user.otherOneMessage,
        encounterCount: stat.count,
        lastEncounter: stat.lastEncounter,
      }));
  } catch (error) {
    console.error("すれ違いランキング取得API エラー:", error);
    return [];
  }
};

// すれ違い情報の概要を取得（UI表示用）
export const getEncounterSummary = async (
  userId: string
): Promise<{
  todayCount: number;
  weeklyCount: number;
  totalCount: number;
  uniqueUsersCount: number;
  lastEncounter?: EncounterWithUserInfo;
}> => {
  try {
    const [todayData, weeklyStats, recentEncounters] = await Promise.all([
      getTodayEncounters(userId),
      getWeeklyEncounterStats(userId),
      getEncounterHistory(userId, { limit: 1 }),
    ]);

    const allEncounters = await getUserEncounters(userId, 1000);
    const uniqueUsers = new Set(allEncounters.map((e) => e.otherUserId));

    return {
      todayCount: todayData.count,
      weeklyCount: weeklyStats.totalCount,
      totalCount: allEncounters.length,
      uniqueUsersCount: uniqueUsers.size,
      lastEncounter: recentEncounters[0] || undefined,
    };
  } catch (error) {
    console.error("すれ違い概要取得API エラー:", error);
    return {
      todayCount: 0,
      weeklyCount: 0,
      totalCount: 0,
      uniqueUsersCount: 0,
    };
  }
};
