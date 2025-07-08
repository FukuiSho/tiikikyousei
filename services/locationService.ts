/*
 * ================================================
 * 📍 Location Service - 位置情報管理システム
 * ================================================
 *
 * このファイルは位置情報の取得、保存、すれ違い検出、
 * プロフィール管理などの機能を提供します。
 *
 * 主な機能:
 * - 📍 GPS位置情報の取得と保存
 * - 👥 ユーザー間のすれ違い検出
 * - 📝 プロフィール情報の管理
 * - 💬 一言メッセージの管理
 * - 📊 すれ違い統計の取得
 *
 * @author Community App Team
 * @version 1.0.0
 */

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
  where,
} from "firebase/firestore";
import { db } from "../firebase.config";

// ================================================
// 🔧 ユーティリティ関数群
// ================================================

// ユーザーIDを正規化する関数（user_プレフィックスの重複を防ぐ）
const normalizeUserId = (userId: string): string => {
  // user_プレフィックスがすでにある場合は除去
  const cleanId = userId.replace(/^user_/, "");
  return cleanId;
};

// Firestoreドキュメント用のIDを生成（user_プレフィックス付き）
const generateDocumentId = (userId: string): string => {
  const cleanId = normalizeUserId(userId);
  return `user_${cleanId}`;
};

// ================================================
// 📄 型定義 - データ構造の定義
// ================================================

/**
 * ユーザー位置情報の基本データ構造
 * Firestoreの'users'コレクションで使用
 */
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
    usernames: string[]; // すれ違った時点での相手のユーザー名
    oneMessages: string[]; // すれ違った時点での相手の一言メッセージ
    icons: string[]; // すれ違った時点での相手のアイコン
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
  username: string;
  icon: string;
  oneMessage: string;
  timestamp: Date;
  location: { latitude: number; longitude: number };
  distance: number;
}

// プロフィール情報の型定義
export interface UserProfile {
  id: string; // ドキュメントID（user_プレフィックス付きのユーザーID）
  userId: string; // 元のユーザーID
  profileID: string; // プロフィールID（userId + 'profile'）
  gender?: string; // 性別
  bloodType?: string; // 血液型
  hometown?: string; // 出身地
  birthday?: Date; // 誕生日
  zodiacSign?: string; // 星座
  worries?: string; // 悩み
  selfIntroduction?: string; // 自己紹介
  tags?: string[]; // タグ（趣味、特技など）
  createdAt: Date; // 作成日時
  updatedAt: Date; // 更新日時
}

// ==============================================
// プロフィール更新用の型（部分更新対応）
// ==============================================
export interface UserProfileUpdateData {
  gender?: string; // 性別
  bloodType?: string; // 血液型
  hometown?: string; // 出身地
  birthday?: Date; // 誕生日
  zodiacSign?: string; // 星座
  worries?: string; // 悩み・相談したいこと
  selfIntroduction?: string; // 自己紹介文
  tags?: string[]; // タグ（趣味、特技、興味など）
}

// ==============================================
// 🌍 位置情報管理関数群
// ==============================================

/**
 * 現在地を取得してFirestoreに保存する関数
 *
 * @param userId - ユーザーID
 * @param shouldDetectEncounters - すれ違い検出を実行するかどうか
 * @returns Promise<Users | null> - 保存されたユーザー情報またはnull
 *
 * 機能:
 * - 位置情報の許可確認
 * - GPS位置情報の取得（複数回試行）
 * - Firestoreへの位置情報保存
 * - すれ違い検出（オプション）
 */
export const saveLocationToFirestore = async (
  userId: string,
  shouldDetectEncounters: boolean = false
): Promise<Users | null> => {
  try {
    console.log("saveLocationToFirestore開始 - userId:", userId);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📡 Firebase接続確認
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (!db) {
      console.error("Firebase Firestoreが初期化されていません");
      return null;
    }
    console.log("Firebase Firestore接続確認OK");

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 📍 位置情報の許可を確認
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log("位置情報の許可状態を確認中...");
    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log("位置情報の許可状態:", status);

    if (status !== "granted") {
      console.error("位置情報の許可が得られませんでした");
      return null;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🎯 現在地を取得（複数回試行で確実性を向上）
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 🏠 住所を取得（オプション - リバースジオコーディング）
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 💾 Firestoreに保存するデータを準備
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
        usernames: [],
        oneMessages: [],
        icons: [],
        count: 0,
      },
    };
    console.log("Firestoreに保存するデータ:", locationData);

    // ユーザーIDベースの固定ドキュメントIDを使用（正規化済み）
    const documentId = generateDocumentId(userId);
    console.log(
      "使用するドキュメントID:",
      documentId,
      "元のユーザーID:",
      userId
    );

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
      usernames: [],
      oneMessages: [],
      icons: [],
      count: 0,
    };
    let existingOneMessage = "現在地を共有しました"; // デフォルト値

    if (existingDoc.exists()) {
      const existingData = existingDoc.data();
      if (existingData.encounters) {
        // 既存のencountersデータがある場合、新しいフィールドを追加
        existingEncounters = {
          userIds: existingData.encounters.userIds || [],
          timestamps: existingData.encounters.timestamps || [],
          locations: existingData.encounters.locations || [],
          distances: existingData.encounters.distances || [],
          usernames: existingData.encounters.usernames || [],
          oneMessages: existingData.encounters.oneMessages || [],
          icons: existingData.encounters.icons || [],
          count: existingData.encounters.count || 0,
        };
        console.log(
          "既存のencountersデータを保持・拡張します:",
          existingEncounters
        );
      }
      if (existingData.oneMessage) {
        existingOneMessage = existingData.oneMessage;
        console.log("既存の一言メッセージを保持します:", existingOneMessage);
      }
    }

    // encountersと一言メッセージを保持してドキュメントを更新
    const updatedLocationData = {
      ...locationData,
      oneMessage: existingOneMessage, // 既存の一言メッセージを保持
      encounters: existingEncounters, // 既存のencountersを保持
    };

    await setDoc(docRef, updatedLocationData);
    console.log(
      "位置情報をFirestoreに保存/更新しました（encounters保持）:",
      documentId
    );

    // すれ違い検出を実行（フラグで制御）
    let encounters: EncounterWithUserInfo[] = [];
    if (shouldDetectEncounters) {
      console.log("すれ違い検出を開始します...");
      encounters = await detectAndRecordEncounters(userId, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (encounters.length > 0) {
        console.log(`${encounters.length}件のすれ違いを検出しました`);
      } else {
        console.log("新しいすれ違いは検出されませんでした");
      }
    }
    return {
      id: documentId,
      username: `User ${userId}`,
      icon: "https://example.com/images/default.jpg",
      timestamp: new Date(), // 表示用に現在時刻を設定
      oneMessage: existingOneMessage, // 保持された一言メッセージ
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

// ==============================================
// 📊 位置情報取得関数群
// ==============================================

/**
 * Firestoreから最新の位置情報を取得
 * @param limitCount - 取得する位置情報の上限数
 * @returns Promise<Users[]> - ユーザー位置情報の配列
 */
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
          usernames: [],
          oneMessages: [],
          icons: [],
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
            usernames: [],
            oneMessages: [],
            icons: [],
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
    const documentId = generateDocumentId(userId);
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
          usernames: [],
          oneMessages: [],
          icons: [],
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

// ==============================================
// 👥 すれ違い検出・記録関数群
// ==============================================

/**
 * 近くのユーザーを検出してすれ違い情報を記録
 * @param myUserId - 自分のユーザーID
 * @param myLocation - 自分の現在位置
 * @param encounterThreshold - すれ違い検出の距離閾値（メートル）
 * @returns Promise<EncounterWithUserInfo[]> - 検出されたすれ違い情報
 *
 * 機能:
 * - 20分間隔制限付きで重複すれ違いを防止
 * - 相互記録（自分と相手の両方に記録）
 * - 距離計算による正確な検出
 */
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
      // 自分自身は除外（複数の条件でチェック）
      if (
        otherUser.id === myUserId ||
        otherUser.id === generateDocumentId(myUserId) ||
        otherUser.profileID === `${myUserId}profile`
      ) {
        continue;
      }

      // ユーザーIDが同じ場合も除外（user_プレフィックスを除いて比較）
      const otherUserIdClean = otherUser.id.replace(/^user_/, "");
      const myUserIdClean = myUserId.replace(/^user_/, "");
      if (otherUserIdClean === myUserIdClean) {
        continue;
      }

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

        // 重複チェック（過去20分以内に同じユーザーとのすれ違いがないか）
        const isDuplicate = await checkRecentEncounterInUser(
          myUserId,
          otherUser.id,
          20 // 20分間隔に変更
        );

        if (!isDuplicate) {
          // 20分以内の重複がない場合は記録
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

          // 現在のユーザーの情報を取得
          const myUserInfo = await getUserLocationFromFirestore(myUserId);
          const myUsername = myUserInfo?.username || `User ${myUserId}`;
          const myIcon =
            myUserInfo?.icon || "https://example.com/images/default.jpg";
          const myOneMessage = myUserInfo?.oneMessage || "メッセージなし";

          // Usersドキュメントにすれ違い情報を保存（自分側の記録）
          await addEncounterToUser(myUserId, {
            userId: otherUser.id,
            username: otherUser.username,
            icon: otherUser.icon,
            oneMessage: otherUser.oneMessage,
            timestamp: new Date(),
            location: encounterLocation,
            distance: Math.round(distance * 100) / 100,
          });

          // 相手のユーザーにも記録（相手側の記録）
          await addEncounterToUser(otherUser.id, {
            userId: myUserId,
            username: myUsername,
            icon: myIcon,
            oneMessage: myOneMessage,
            timestamp: new Date(),
            location: encounterLocation,
            distance: Math.round(distance * 100) / 100,
          });

          // すれ違い成功をログに記録
          console.log(
            `✅ すれ違い記録完了: ${myUserId} ⟷ ${otherUser.id} (${Math.round(distance * 100) / 100}m)`
          );
          console.log(`新規すれ違いを記録: ${otherUser.username}`);
        } else {
          console.log(
            `重複スキップ: ${otherUser.username} (20分以内に記録済み)`
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
    // 自分自身とのすれ違いは記録しない
    const userIdClean = userId.replace(/^user_/, "");
    const encounterUserIdClean = encounterRecord.userId.replace(/^user_/, "");
    if (userIdClean === encounterUserIdClean) {
      console.log(`自分自身とのすれ違いをスキップ: ${userId}`);
      return;
    }

    const documentId = generateDocumentId(userId);
    const docRef = doc(db, "users", documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const userData = docSnap.data();
      const currentEncounters = userData.encounters || {
        userIds: [],
        timestamps: [],
        locations: [],
        distances: [],
        usernames: [],
        oneMessages: [],
        icons: [],
        count: 0,
      };

      // 新しいすれ違い情報を追加（すれ違った時点での相手の情報を保存）
      currentEncounters.userIds.push(encounterRecord.userId);
      currentEncounters.timestamps.push(encounterRecord.timestamp);
      currentEncounters.locations.push(encounterRecord.location);
      currentEncounters.distances.push(encounterRecord.distance);
      currentEncounters.usernames.push(encounterRecord.username);
      currentEncounters.oneMessages.push(encounterRecord.oneMessage);
      currentEncounters.icons.push(encounterRecord.icon);
      currentEncounters.count += 1;

      // ドキュメントを更新
      await setDoc(docRef, {
        ...userData,
        encounters: currentEncounters,
      });

      console.log(`ユーザー ${userId} のすれ違い情報を更新しました`);
    } else {
      // ユーザーが存在しない場合は新規作成
      console.log(`ユーザー ${userId} が存在しないため、新規作成します`);

      const newUserData = {
        userId: userId,
        username: `User-${userId.slice(-6)}`,
        oneMessage: "",
        encounters: {
          userIds: [encounterRecord.userId],
          timestamps: [encounterRecord.timestamp],
          locations: [encounterRecord.location],
          distances: [encounterRecord.distance],
          usernames: [encounterRecord.username],
          oneMessages: [encounterRecord.oneMessage],
          icons: [encounterRecord.icon],
          count: 1,
        },
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      await setDoc(docRef, newUserData);
      console.log(
        `ユーザー ${userId} を新規作成し、すれ違い情報を追加しました`
      );
    }
  } catch (error) {
    console.error("ユーザーのすれ違い情報追加エラー:", error);
  }
};

// Usersドキュメント内で最近のすれ違い記録をチェック（重複防止、20分間隔）
const checkRecentEncounterInUser = async (
  myUserId: string,
  otherUserId: string,
  withinMinutes: number
): Promise<boolean> => {
  try {
    // 自分自身とのすれ違いチェックは常にtrueを返す
    const myUserIdClean = myUserId.replace(/^user_/, "");
    const otherUserIdClean = otherUserId.replace(/^user_/, "");
    if (myUserIdClean === otherUserIdClean) {
      console.log(
        `自分自身とのすれ違いチェック: ${myUserId} === ${otherUserId}`
      );
      return true; // 重複として扱う
    }

    const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000);
    console.log(
      `重複チェック開始: ${myUserId} vs ${otherUserId}, カットオフ時間: ${cutoffTime.toISOString()} (${withinMinutes}分以内)`
    );

    const documentId = generateDocumentId(myUserId);
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
      usernames: [],
      oneMessages: [],
      icons: [],
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
      usernames: [],
      oneMessages: [],
      icons: [],
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
      usernames: [],
      oneMessages: [],
      icons: [],
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
      usernames: [],
      oneMessages: [],
      icons: [],
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
      usernames: [],
      oneMessages: [],
      icons: [],
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
    const documentId = generateDocumentId(userId);
    const docRef = doc(db, "users", documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.log(
        `ユーザー ${userId} のドキュメントが存在しません（初回起動または新規ユーザー）`
      );
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

      // 保存された履歴情報を使用（すれ違った時点での情報）
      let otherUsername = "Unknown User";
      let otherIcon = "https://example.com/images/default.jpg";
      let otherOneMessage = "";

      // 新しいフィールドが存在する場合は履歴から取得
      if (encounters.usernames && encounters.usernames[i]) {
        otherUsername = encounters.usernames[i];
      }
      if (encounters.icons && encounters.icons[i]) {
        otherIcon = encounters.icons[i];
      }
      if (encounters.oneMessages && encounters.oneMessages[i]) {
        otherOneMessage = encounters.oneMessages[i];
      }

      // 新しいフィールドが存在しない場合は現在の情報を取得（後方互換性）
      if (!encounters.usernames || !encounters.usernames[i]) {
        const otherUserDoc = await getDoc(
          doc(db, "users", generateDocumentId(otherUserId))
        );
        if (otherUserDoc.exists()) {
          const otherUserData = otherUserDoc.data();
          otherUsername = otherUserData.username || "Unknown User";
          otherIcon =
            otherUserData.icon || "https://example.com/images/default.jpg";
          otherOneMessage = otherUserData.oneMessage || "";
        }
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

// ==============================================
// プロフィール管理関数群
// ==============================================

// プロフィール情報を保存・更新
export const saveUserProfile = async (
  userId: string,
  profileData: UserProfileUpdateData
): Promise<boolean> => {
  try {
    // プロフィール用のドキュメントIDを生成
    const profileDocumentId = generateDocumentId(userId);
    const docRef = doc(db, "profiles", profileDocumentId);

    // undefinedフィールドを除外するヘルパー関数
    const removeUndefinedFields = (obj: any) => {
      const result: any = {};
      Object.keys(obj).forEach((key) => {
        if (obj[key] !== undefined && obj[key] !== null) {
          result[key] = obj[key];
        }
      });
      return result;
    };

    // 既存のプロフィールを取得
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // 既存のプロフィールを更新
      const existingData = docSnap.data();
      const cleanedProfileData = removeUndefinedFields(profileData);
      const updatedData = {
        ...existingData,
        ...cleanedProfileData,
        updatedAt: serverTimestamp(),
      };

      await setDoc(docRef, updatedData);
      console.log(`ユーザー ${userId} のプロフィールを更新しました`);
      return true;
    } else {
      // 新規プロフィールを作成
      const cleanedProfileData = removeUndefinedFields(profileData);

      const baseProfileData: any = {
        userId: userId,
        profileID: `${userId}profile`,
        gender: cleanedProfileData.gender || "",
        bloodType: cleanedProfileData.bloodType || "",
        hometown: cleanedProfileData.hometown || "",
        zodiacSign: cleanedProfileData.zodiacSign || "", // 星座フィールドを追加
        worries: cleanedProfileData.worries || "",
        selfIntroduction: cleanedProfileData.selfIntroduction || "",
        tags: cleanedProfileData.tags || [],
      };

      // birthdayが有効な場合のみ追加
      if (
        cleanedProfileData.birthday &&
        cleanedProfileData.birthday instanceof Date &&
        !isNaN(cleanedProfileData.birthday.getTime())
      ) {
        baseProfileData.birthday = cleanedProfileData.birthday;
      }

      const newProfile = {
        ...baseProfileData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(docRef, newProfile);
      console.log(`ユーザー ${userId} の新規プロフィールを作成しました`);
      return true;
    }
  } catch (error) {
    console.error("プロフィールの保存に失敗しました:", error);
    return false;
  }
};

// プロフィール情報を取得
export const getUserProfile = async (
  userId: string
): Promise<UserProfile | null> => {
  try {
    const profileDocumentId = generateDocumentId(userId);
    const docRef = doc(db, "profiles", profileDocumentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId || userId,
        profileID: data.profileID || `${userId}profile`,
        gender: data.gender || "",
        bloodType: data.bloodType || "",
        hometown: data.hometown || "",
        birthday: data.birthday?.toDate?.() || undefined,
        zodiacSign: data.zodiacSign || "", // 星座フィールドを追加
        worries: data.worries || "",
        selfIntroduction: data.selfIntroduction || "",
        tags: data.tags || [],
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      };
    } else {
      console.log(`ユーザー ${userId} のプロフィールが見つかりません`);
      return null;
    }
  } catch (error) {
    console.error("プロフィールの取得に失敗しました:", error);
    return null;
  }
};

// プロフィール情報を削除
export const deleteUserProfile = async (userId: string): Promise<boolean> => {
  try {
    const profileDocumentId = generateDocumentId(userId);
    const docRef = doc(db, "profiles", profileDocumentId);

    await setDoc(
      docRef,
      {
        deleted: true,
        deletedAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`ユーザー ${userId} のプロフィールを削除しました`);
    return true;
  } catch (error) {
    console.error("プロフィールの削除に失敗しました:", error);
    return false;
  }
};

// 複数のプロフィールを取得（検索・一覧表示用）
export const getMultipleUserProfiles = async (
  userIds: string[]
): Promise<{ [userId: string]: UserProfile }> => {
  try {
    const profiles: { [userId: string]: UserProfile } = {};

    // 並列処理でプロフィールを取得
    const profilePromises = userIds.map(async (userId) => {
      const profile = await getUserProfile(userId);
      if (profile) {
        profiles[userId] = profile;
      }
    });

    await Promise.all(profilePromises);
    return profiles;
  } catch (error) {
    console.error("複数プロフィールの取得に失敗しました:", error);
    return {};
  }
};

// タグによるプロフィール検索
export const searchProfilesByTag = async (
  tag: string,
  limitCount: number = 20
): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, "profiles"), limit(limitCount));

    const querySnapshot = await getDocs(q);
    const profiles: UserProfile[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // タグにマッチするプロフィールのみ追加
      if (data.tags && Array.isArray(data.tags) && data.tags.includes(tag)) {
        profiles.push({
          id: doc.id,
          userId: data.userId || "",
          profileID: data.profileID || "",
          gender: data.gender || "",
          bloodType: data.bloodType || "",
          hometown: data.hometown || "",
          birthday: data.birthday?.toDate?.() || undefined,
          worries: data.worries || "",
          selfIntroduction: data.selfIntroduction || "",
          tags: data.tags || [],
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        });
      }
    });

    return profiles;
  } catch (error) {
    console.error("タグによるプロフィール検索に失敗しました:", error);
    return [];
  }
};

// 出身地によるプロフィール検索
export const searchProfilesByHometown = async (
  hometown: string,
  limitCount: number = 20
): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, "profiles"), limit(limitCount));

    const querySnapshot = await getDocs(q);
    const profiles: UserProfile[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // 出身地にマッチするプロフィールのみ追加
      if (data.hometown && data.hometown.includes(hometown)) {
        profiles.push({
          id: doc.id,
          userId: data.userId || "",
          profileID: data.profileID || "",
          gender: data.gender || "",
          bloodType: data.bloodType || "",
          hometown: data.hometown || "",
          birthday: data.birthday?.toDate?.() || undefined,
          worries: data.worries || "",
          selfIntroduction: data.selfIntroduction || "",
          tags: data.tags || [],
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        });
      }
    });

    return profiles;
  } catch (error) {
    console.error("出身地によるプロフィール検索に失敗しました:", error);
    return [];
  }
};

// ==============================================
// 一言メッセージ管理関数群
// ==============================================

// 一言メッセージを取得
export const getUserOneMessage = async (userId: string): Promise<string> => {
  try {
    const documentId = generateDocumentId(userId);
    const docRef = doc(db, "users", documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.oneMessage || "";
    } else {
      console.log(`ユーザー ${userId} の一言メッセージが見つかりません`);
      return "";
    }
  } catch (error) {
    console.error("一言メッセージの取得に失敗しました:", error);
    return "";
  }
};

// 一言メッセージを更新
export const updateUserOneMessage = async (
  userId: string,
  oneMessage: string
): Promise<boolean> => {
  try {
    const documentId = generateDocumentId(userId);
    const docRef = doc(db, "users", documentId);

    await setDoc(
      docRef,
      {
        oneMessage: oneMessage,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`ユーザー ${userId} の一言メッセージを更新しました`);
    return true;
  } catch (error) {
    console.error("一言メッセージの更新に失敗しました:", error);
    return false;
  }
};

// すれ違い検知専用の関数（位置情報の保存は行わない）
export const performEncounterDetection = async (
  userId: string
): Promise<EncounterWithUserInfo[]> => {
  try {
    console.log("すれ違い検知専用処理開始 - userId:", userId);

    // 現在地を取得
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    // すれ違い検知のみ実行
    const encounters = await detectAndRecordEncounters(userId, {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    console.log(`すれ違い検知専用処理完了: ${encounters.length}件検出`);
    return encounters;
  } catch (error) {
    console.error("すれ違い検知専用処理エラー:", error);
    return [];
  }
};

// ユーザーの投稿数を取得する関数
export const getUserPostCount = async (userId: string): Promise<number> => {
  try {
    if (!userId) {
      console.warn("getUserPostCount: ユーザーIDが指定されていません");
      return 0;
    }

    const q = query(collection(db, "posts"), where("userID", "==", userId));

    const querySnapshot = await getDocs(q);
    const postCount = querySnapshot.size;

    console.log(`✅ ユーザー ${userId} の投稿数: ${postCount}`);
    return postCount;
  } catch (error) {
    console.error("❌ 投稿数取得エラー:", error);
    return 0;
  }
};
