// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // Firebase Authenticationを使えるようにするため
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
  appId: "1:303304465881:web:10dfcc05f6b62676ed4dc8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
export { app, auth, db };

