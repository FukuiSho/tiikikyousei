import {
  addDoc,
  collection,
  doc,
  GeoPoint,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase.config";
import { getPersistentUserId } from "./userService";

// 投稿データの型定義（Firestoreの構造と一致）
export interface Post {
  id: string; // ドキュメントID
  coordinates: GeoPoint; // Firebase GeoPoint形式
  geohash: string; // 位置情報の効率的な検索用
  text: string; // 投稿テキスト
  photoURL?: string; // 写真URL（任意）
  timestamp: Date; // 投稿日時
  userID: string; // 投稿者のユーザーID
  parentPostID?: string; // 返信の場合の親投稿ID（任意）
  reactions: {
    [emoji: string]: {
      count: number;
      userIds: string[];
    };
  }; // リアクション情報
}

// 新規投稿データの型定義（Firestoreに保存する前）
export interface NewPost {
  text: string;
  photoURL?: string;
  latitude: number;
  longitude: number;
  parentPostID?: string; // 返信の場合
}

/**
 * 投稿をFirestoreに保存
 * 保存フィールド: ID, coordinates, geohash, text, photoURL, timestamp, userID, parentPostID, reactions
 */
export const savePostToFirestore = async (
  newPost: NewPost
): Promise<string | null> => {
  try {
    console.log("投稿をFirestoreに保存開始:", newPost);

    // 現在のユーザーIDを取得
    const userID = await getPersistentUserId();

    // GeohashとGeoPointを生成
    const coordinates = new GeoPoint(newPost.latitude, newPost.longitude);
    const geohash = generateGeohash(newPost.latitude, newPost.longitude);

    // Firestoreに保存するデータ（すべての必要フィールドを含む）
    const postData = {
      // ID: ドキュメントIDとして自動生成される
      coordinates: coordinates, // Firebase GeoPoint形式
      geohash: geohash, // 位置情報の効率的な検索用
      text: newPost.text,
      photoURL: newPost.photoURL || null, // 写真URL（任意）
      timestamp: serverTimestamp(), // サーバータイムスタンプ
      userID: userID, // 投稿者のユーザーID
      parentPostID: newPost.parentPostID || null, // 返信の場合の親投稿ID（任意）
      reactions: {}, // 初期状態では空のリアクションオブジェクト
    };

    console.log("Firestoreに保存するデータ:", postData);

    // Firestoreに保存してドキュメントIDを取得
    const docRef = await addDoc(collection(db, "posts"), postData);
    console.log("投稿を保存しました。ドキュメントID:", docRef.id);

    return docRef.id; // 生成されたドキュメントIDを返す
  } catch (error) {
    console.error("投稿の保存に失敗しました:", error);
    return null;
  }
};

/**
 * 座標からGeohashを生成（簡易版）
 * 実際のプロダクションでは geohash ライブラリを使用することを推奨
 */
const generateGeohash = (latitude: number, longitude: number): string => {
  // 簡易的なGeohash生成
  // 精度を上げるには専用ライブラリ（ngeohash等）の使用を推奨
  const precision = 8;
  const latRange = [-90, 90];
  const lonRange = [-180, 180];

  let geohash = "";
  let isEven = true;
  let lat = latitude;
  let lon = longitude;
  let latMin = latRange[0];
  let latMax = latRange[1];
  let lonMin = lonRange[0];
  let lonMax = lonRange[1];

  const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";

  for (let i = 0; i < precision; i++) {
    let ch = 0;
    for (let j = 0; j < 5; j++) {
      if (isEven) {
        // 経度
        const mid = (lonMin + lonMax) / 2;
        if (lon >= mid) {
          ch |= 1 << (4 - j);
          lonMin = mid;
        } else {
          lonMax = mid;
        }
      } else {
        // 緯度
        const mid = (latMin + latMax) / 2;
        if (lat >= mid) {
          ch |= 1 << (4 - j);
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      isEven = !isEven;
    }
    geohash += base32[ch];
  }

  return geohash;
};

/**
 * リアクションを追加/削除
 */
export const addReactionToPost = async (
  postId: string,
  emoji: string
): Promise<boolean> => {
  try {
    const userID = await getPersistentUserId();

    console.log(
      `投稿 ${postId} にリアクション ${emoji} を追加 (ユーザー: ${userID})`
    );

    // TODO: Firestoreトランザクションを使用してリアクションを更新
    // - ドキュメントを取得
    // - reactions フィールドを更新
    // - userIds配列に追加/削除
    // - count を更新

    return true;
  } catch (error) {
    console.error("リアクション追加エラー:", error);
    return false;
  }
};

/**
 * 返信投稿を作成
 */
export const createReplyPost = async (
  parentPostID: string,
  text: string,
  latitude: number,
  longitude: number,
  photoURL?: string
): Promise<string | null> => {
  try {
    console.log(`返信投稿を作成: 親投稿ID ${parentPostID}`);

    const replyPost: NewPost = {
      text,
      photoURL,
      latitude,
      longitude,
      parentPostID,
    };

    return await savePostToFirestore(replyPost);
  } catch (error) {
    console.error("返信投稿作成エラー:", error);
    return null;
  }
};

/**
 * 指定された位置周辺の投稿を取得
 * ジオハッシュを使用して効率的に検索
 */
export const getNearbyPosts = async (
  latitude: number,
  longitude: number,
  radiusKm: number = 1.0
): Promise<Post[]> => {
  try {
    console.log(
      `周辺投稿を取得中: lat=${latitude}, lng=${longitude}, radius=${radiusKm}km`
    );

    // 現在地のジオハッシュを生成
    const centerGeohash = generateGeohash(latitude, longitude);

    // ジオハッシュの精度を調整（radiusに応じて）
    const precision = radiusKm > 5 ? 4 : radiusKm > 1 ? 5 : 6;
    const searchGeohash = centerGeohash.substring(0, precision);

    console.log(`検索用ジオハッシュ: ${searchGeohash} (精度: ${precision})`);

    // Firestoreクエリ：ジオハッシュで絞り込み、タイムスタンプで並び替え
    // 複合インデックスエラーを回避するため、orderByを1つに制限
    const postsQuery = query(
      collection(db, "posts"),
      where("geohash", ">=", searchGeohash),
      where("geohash", "<", searchGeohash + "\uf8ff"), // ジオハッシュの範囲検索
      orderBy("geohash"),
      limit(100) // 多めに取得してから距離フィルタリング
    );

    const querySnapshot = await getDocs(postsQuery);
    const posts: Post[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // 距離フィルタリング（より正確な距離計算）
      if (
        data.coordinates &&
        data.coordinates.latitude &&
        data.coordinates.longitude
      ) {
        const distance = calculateDistance(
          latitude,
          longitude,
          data.coordinates.latitude,
          data.coordinates.longitude
        );

        if (distance <= radiusKm) {
          const post: Post = {
            id: doc.id,
            coordinates: data.coordinates,
            geohash: data.geohash,
            text: data.text,
            photoURL: data.photoURL,
            timestamp: data.timestamp?.toDate() || new Date(),
            userID: data.userID,
            parentPostID: data.parentPostID,
            reactions: data.reactions || {},
          };
          posts.push(post);
        }
      }
    });

    // タイムスタンプで降順ソート（最新順）
    posts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 最大50件に制限
    const limitedPosts = posts.slice(0, 50);

    console.log(`周辺投稿を${limitedPosts.length}件取得しました`);
    return limitedPosts;
  } catch (error) {
    console.error("周辺投稿取得エラー:", error);
    return [];
  }
};

/**
 * 2点間の距離を計算（km単位）
 * ハーバサイン公式を使用
 */
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // 地球の半径（km）
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * 度数を弧度に変換
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * 投稿にリアクションを追加/削除（Firestoreトランザクション使用）
 */
export const updatePostReaction = async (
  postId: string,
  emoji: string
): Promise<boolean> => {
  try {
    const userID = await getPersistentUserId();

    console.log(
      `リアクション更新: PostID=${postId}, Emoji=${emoji}, UserID=${userID}`
    );

    // Firestoreトランザクションでリアクションを更新
    const result = await runTransaction(db, async (transaction) => {
      const postRef = doc(db, "posts", postId);
      const postDoc = await transaction.get(postRef);

      if (!postDoc.exists()) {
        console.error("投稿が見つかりません:", postId);
        return false;
      }

      const postData = postDoc.data();
      const currentReactions = postData.reactions || {};

      // ユーザーの現在のリアクションを確認
      let userReactionChanged = false;

      // 同じ絵文字の場合は削除、異なる場合は追加/変更
      if (
        currentReactions[emoji] &&
        currentReactions[emoji].userIds.includes(userID)
      ) {
        // 既存のリアクションを削除
        currentReactions[emoji].userIds = currentReactions[
          emoji
        ].userIds.filter((id: string) => id !== userID);
        currentReactions[emoji].count = currentReactions[emoji].userIds.length;

        if (currentReactions[emoji].count === 0) {
          delete currentReactions[emoji];
        }
        userReactionChanged = true;
      } else {
        // 他のリアクションから削除
        Object.keys(currentReactions).forEach((existingEmoji) => {
          if (existingEmoji !== emoji) {
            currentReactions[existingEmoji].userIds = currentReactions[
              existingEmoji
            ].userIds.filter((id: string) => id !== userID);
            currentReactions[existingEmoji].count =
              currentReactions[existingEmoji].userIds.length;

            if (currentReactions[existingEmoji].count === 0) {
              delete currentReactions[existingEmoji];
            }
          }
        });

        // 新しいリアクションを追加
        if (!currentReactions[emoji]) {
          currentReactions[emoji] = {
            count: 0,
            userIds: [],
          };
        }

        currentReactions[emoji].userIds.push(userID);
        currentReactions[emoji].count = currentReactions[emoji].userIds.length;
        userReactionChanged = true;
      }

      // Firestoreを更新
      transaction.update(postRef, {
        reactions: currentReactions,
      });

      return userReactionChanged;
    });

    console.log("リアクション更新成功:", result);
    return result;
  } catch (error) {
    console.error("リアクション更新エラー:", error);
    return false;
  }
};
