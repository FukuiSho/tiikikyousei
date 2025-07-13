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
    console.warn(
      `画像サイズが制限を超えています: ${sizeInMB}MB (制限: ${maxSizeInMB}MB)`
    );
    return false;
  }

  return true;
};

/**
 * Firebase Storage URLの形式を確認し、必要に応じて変換する（非同期版）
 */
export const validateAndConvertImageUrl = async (
  imageUrl: string | undefined | null
): Promise<string | null> => {
  console.log("validateAndConvertImageUrl: 入力値:", imageUrl);
  console.log("validateAndConvertImageUrl: 入力値type:", typeof imageUrl);
  console.log("validateAndConvertImageUrl: 入力値 is null:", imageUrl === null);
  console.log(
    "validateAndConvertImageUrl: 入力値 is undefined:",
    imageUrl === undefined
  );

  if (!imageUrl) {
    console.log(
      "validateAndConvertImageUrl: 画像URLが未定義またはnullです -> null返却"
    );
    return null;
  }

  // 文字列の場合のみ処理を続行
  if (typeof imageUrl !== "string") {
    console.log(
      "validateAndConvertImageUrl: 画像URLが文字列でありません -> null返却"
    );
    return null;
  }

  const trimmedUrl = imageUrl.trim();
  console.log("validateAndConvertImageUrl: トリム後URL:", trimmedUrl);

  if (trimmedUrl === "") {
    console.log(
      "validateAndConvertImageUrl: トリム後が空文字列です -> null返却"
    );
    return null;
  }

  // 既にHTTPS形式のダウンロードURLの場合
  if (trimmedUrl.startsWith("https://firebasestorage.googleapis.com/")) {
    console.log("✅ 正しいFirebase Storage HTTPS URL:", trimmedUrl);
    return trimmedUrl;
  }

  // gs://形式の場合（ダウンロードURLに変換）
  if (trimmedUrl.startsWith("gs://")) {
    console.log(
      "⚠️ gs://形式のURLです。ダウンロードURLに変換します:",
      trimmedUrl
    );
    const downloadUrl = await getDownloadUrlFromGsUrl(trimmedUrl);
    if (downloadUrl) {
      console.log("✅ gs://からダウンロードURL変換完了:", downloadUrl);
      return downloadUrl;
    } else {
      console.error("❌ gs://からダウンロードURL変換に失敗:", trimmedUrl);
      return null;
    }
  }

  // その他のHTTP/HTTPS URL
  if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
    console.log("✅ HTTP/HTTPS URL:", trimmedUrl);
    return trimmedUrl;
  }

  console.warn("⚠️ 不明な画像URL形式:", trimmedUrl);
  return null;
};

/**
 * Firebase Storage gs://形式からダウンロードURLを取得
 */
export const getDownloadUrlFromGsUrl = async (
  gsUrl: string
): Promise<string | null> => {
  try {
    if (!gsUrl.startsWith("gs://")) {
      console.error("gs://形式のURLではありません:", gsUrl);
      return null;
    }

    // gs://bucket/path形式からpathを抽出
    const path = gsUrl.replace("gs://", "").split("/").slice(1).join("/");
    console.log("抽出されたパス:", path);

    // Storage参照を作成
    const storageRef = ref(storage, path);

    // ダウンロードURLを取得
    const downloadURL = await getDownloadURL(storageRef);
    console.log("gs://からダウンロードURL取得完了:", downloadURL);

    return downloadURL;
  } catch (error) {
    console.error("gs://からダウンロードURL取得エラー:", error);
    return null;
  }
};
