// lib/firebaseConfig.js

import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyBzNhJmdJn6NflGWg35yFEPBwOL4n0xuIE",  authDomain: 'sih2023-3c557.firebaseapp.com',
  projectId: 'sih2023-3c557',
  storageBucket: 'sih2023-3c557.appspot.com',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Storage
const storage = getStorage(app);

export { storage };