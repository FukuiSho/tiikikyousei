// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  /*getAuth,*/
  /*GoogleAuthProvider,*/
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth"; // Firebase Authenticationを使えるようにするため

import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

import { getFirestore } from "firebase/firestore"; // Cloud Firestoreを使えるようにするため
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCs3maLIkbV9zD9oDe-3e4pOBDjJwg-3sU",
  authDomain: "kyouseidb-6e400.firebaseapp.com",
  projectId: "kyouseidb-6e400",
  storageBucket: "kyouseidb-6e400.firebasestorage.app",
  messagingSenderId: "303304465881",
  appId: "1:303304465881:web:10dfcc05f6b62676ed4dc8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// 一旦放置
//const auth = getAuth(app);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
const db = getFirestore(app);
//const provider = new GoogleAuthProvider();

export { auth, db };
