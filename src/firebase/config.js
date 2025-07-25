// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBXUGa65xzr-AoKdWGvOGS3kuR1Amedmis",
  authDomain: "iuran-warga-fa6a4.firebaseapp.com",
  projectId: "iuran-warga-fa6a4",
  storageBucket: "iuran-warga-fa6a4.firebasestorage.app",
  messagingSenderId: "1035809891026",
  appId: "1:1035809891026:web:b773311665a3f3e37f830b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };