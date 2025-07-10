import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase.config";

/**
 * 画像をFirebase Storageにアップロードし、ダウンロードURLを返す
 */
export const uploadImageToStorage = async (
  imageUri: string,
  userId: string
): Promise<string | null> => {
  try {
    console.log("画像アップロード開始:", imageUri);

    // 画像をfetch APIで取得
    const response = await fetch(imageUri);
    if (!response.ok) {
      throw new Error("画像の取得に失敗しました");
    }

    // BlobとしてデータKを取得
    const blob = await response.blob();
    
    // ファイル名を生成（ユーザーID + タイムスタンプ + 拡張子）
    const timestamp = Date.now();
    const fileName = `posts/${userId}/${timestamp}.jpg`;
    
    // Storage参照を作成
    const storageRef = ref(storage, fileName);
    
    // ファイルをアップロード
    console.log("Firebase Storageにアップロード中...");
    const uploadResult = await uploadBytes(storageRef, blob);
    console.log("アップロード完了:", uploadResult);
    
    // ダウンロードURLを取得
    const downloadURL = await getDownloadURL(storageRef);
    console.log("ダウンロードURL取得完了:", downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error("画像アップロードエラー:", error);
    return null;
  }
};

/**
 * 画像URIからファイルサイズを取得（MB単位）
 */
export const getImageSize = async (imageUri: string): Promise<number> => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    return blob.size / (1024 * 1024); // MB単位で返す
  } catch (error) {
    console.error("画像サイズ取得エラー:", error);
    return 0;
  }
};

/**
 * 画像サイズが制限内かチェック（10MB制限）
 */
export const validateImageSize = async (imageUri: string): Promise<boolean> => {
  const sizeInMB = await getImageSize(imageUri);
  const maxSizeInMB = 10;
  
  if (sizeInMB > maxSizeInMB) {
    console.warn(`画像サイズが制限を超えています: ${sizeInMB}MB (制限: ${maxSizeInMB}MB)`);
    return false;
  }
  
  return true;
};
