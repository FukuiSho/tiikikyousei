import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyCzBqPDX_hvWP5HU8F-hfb9appmpfxxP3o",
  authDomain: "kyouseidb-6e400.firebaseapp.com",
  projectId: "kyouseidb-6e400",
  storageBucket: "kyouseidb-6e400.firebasestorage.app",
  messagingSenderId: "303304465881",
  appId: "1:303304465881:web:your-app-id-here" // 実際のアプリIDに置き換えてください
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Firestore データベース
export const db = getFirestore(app);

// Firebase Authentication
export const auth = getAuth(app);

export default app;
