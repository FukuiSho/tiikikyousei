import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_ID_KEY = "@community_app_user_id";

/**
 * 永続的なユーザーIDを取得または生成する
 * アプリを再起動してもユーザーIDが維持される
 */
export const getPersistentUserId = async (): Promise<string> => {
  try {
    // 既存のユーザーIDを取得
    const existingUserId = await AsyncStorage.getItem(USER_ID_KEY);

    if (existingUserId) {
      console.log("既存のユーザーIDを使用:", existingUserId);
      return existingUserId;
    }

    // 新しいユーザーIDを生成
    const newUserId = generateUniqueUserId();

    // AsyncStorageに保存
    await AsyncStorage.setItem(USER_ID_KEY, newUserId);
    console.log("新しいユーザーIDを生成・保存:", newUserId);

    return newUserId;
  } catch (error) {
    console.error("ユーザーID取得エラー:", error);
    // エラーの場合は一時的なIDを返す
    return generateUniqueUserId();
  }
};

/**
 * ユニークなユーザーIDを生成
 * タイムスタンプ + ランダム文字列の組み合わせ
 */
const generateUniqueUserId = (): string => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `user-${timestamp}-${randomPart}`;
};

/**
 * ユーザーIDをリセット（デバッグ用）
 */
export const resetUserId = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_ID_KEY);
    console.log("ユーザーIDをリセットしました");
  } catch (error) {
    console.error("ユーザーIDリセットエラー:", error);
  }
};

/**
 * 現在保存されているユーザーIDを確認（デバッグ用）
 */
export const getCurrentStoredUserId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(USER_ID_KEY);
  } catch (error) {
    console.error("ユーザーID確認エラー:", error);
    return null;
  }
};
