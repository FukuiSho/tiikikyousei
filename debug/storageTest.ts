import { getDownloadURL, listAll, ref } from "firebase/storage";
import { storage } from "../firebase.config";

/**
 * Firebase Storageへの基本的なアクセステスト
 */
export const testFirebaseStorageAccess = async () => {
  console.log("=== Firebase Storage アクセステスト開始 ===");

  try {
    // 1. ストレージルートへのアクセステスト
    console.log("1. ストレージルートへのアクセス...");
    const rootRef = ref(storage);
    const rootList = await listAll(rootRef);
    console.log("✅ ストレージルートアクセス成功");
    console.log("ルートフォルダ数:", rootList.prefixes.length);
    console.log("ルートファイル数:", rootList.items.length);

    // 2. postsフォルダへのアクセステスト
    console.log("2. postsフォルダへのアクセス...");
    const postsRef = ref(storage, "posts");
    const postsList = await listAll(postsRef);
    console.log("✅ postsフォルダアクセス成功");
    console.log("postsサブフォルダ数:", postsList.prefixes.length);
    console.log("postsファイル数:", postsList.items.length);

    // 3. 特定のユーザーフォルダへのアクセステスト
    console.log("3. 特定のユーザーフォルダへのアクセス...");
    const userRef = ref(storage, "posts/user-1750916132310-lfn52r");
    const userList = await listAll(userRef);
    console.log("✅ ユーザーフォルダアクセス成功");
    console.log("ユーザーフォルダファイル数:", userList.items.length);

    // 4. 具体的な画像ファイルのダウンロードURLテスト
    console.log("4. 具体的な画像ファイルのダウンロードURL取得...");
    const imageRef = ref(
      storage,
      "posts/user-1750916132310-lfn52r/1752424600420.jpg"
    );
    const downloadURL = await getDownloadURL(imageRef);
    console.log("✅ 画像ダウンロードURL取得成功:");
    console.log("URL:", downloadURL);

    // 5. gs://形式からのダウンロードURL取得テスト
    console.log("5. gs://形式からのダウンロードURL取得...");
    const gsUrl =
      "gs://kyouseidb-6e400.firebasestorage.app/posts/user-1750916132310-lfn52r/1752424600420.jpg";
    const gsRef = ref(storage, gsUrl);
    const gsDownloadURL = await getDownloadURL(gsRef);
    console.log("✅ gs://からのダウンロードURL取得成功:");
    console.log("URL:", gsDownloadURL);

    console.log("=== Firebase Storage アクセステスト完了 ===");
    return {
      success: true,
      downloadURL,
      gsDownloadURL,
      userFiles: userList.items.length,
      postsFiles: postsList.items.length,
    };
  } catch (error) {
    console.error("❌ Firebase Storage アクセステスト失敗:", error);
    return {
      success: false,
      error: error,
    };
  }
};

/**
 * 現在の投稿データ取得フローの詳細追跡
 */
export const tracePostDataFlow = () => {
  console.log("=== 投稿データ取得フロー追跡開始 ===");
  console.log("フロー追跡セットアップ完了");
  console.log("=== 投稿データ取得フロー追跡準備完了 ===");
};
