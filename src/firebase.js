import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDPlBRlawny4aR0tCkM_TGjQ7-_3sk6lLY",
  authDomain: "fit-n--focus.firebaseapp.com",
  projectId: "fit-n--focus",
  storageBucket: "fit-n--focus.firebasestorage.app",
  messagingSenderId: "148220931427",
  appId: "1:148220931427:web:6505caeebd0bb1da48f756",
  measurementId: "G-M5T9V57PD5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);