import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCaMrXWbpZ2PWAz0n7Pg3BSfQlbWKmUIp0",
  authDomain: "restaurant-system-6fb57.firebaseapp.com",
  databaseURL: "https://restaurant-system-6fb57-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "restaurant-system-6fb57",
  storageBucket: "restaurant-system-6fb57.firebasestorage.app",
  messagingSenderId: "423284471398",
  appId: "1:423284471398:web:1040e86fa3fe373e7c5fa7"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
