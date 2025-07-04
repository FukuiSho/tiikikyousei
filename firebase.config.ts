import { FirebaseApp, initializeApp } from "firebase/app";
import { Firestore, getFirestore } from "firebase/firestore";

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyCzBqPDX_hvWP5HU8F-hfb9appmpfxxP3o",
  authDomain: "kyouseidb-6e400.firebaseapp.com",
  projectId: "kyouseidb-6e400",
  storageBucket: "kyouseidb-6e400.firebasestorage.app",
  messagingSenderId: "303304465881",
};

// Firebase初期化
let app: FirebaseApp;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  console.log("Firebase App初期化成功");
  // Firestore データベース
  db = getFirestore(app);
  console.log("Firestore初期化成功");
} catch (error) {
  console.error("Firebase初期化エラー:", error);
  throw error;
}

// Authは使用しないため、undefinedをエクスポート
export { db };
export const auth = undefined;
export default app;
