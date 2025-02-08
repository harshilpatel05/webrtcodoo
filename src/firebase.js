// src/firebase.js
import firebase from 'firebase/app';
import 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDQsTg7WjjnDwGHJ90lHv4lpAkqamJyq6g",
  authDomain: "fir-rtc-f531d.firebaseapp.com",
  projectId: "fir-rtc-f531d",
  storageBucket: "fir-rtc-f531d.firebasestorage.app",
  messagingSenderId: "1004275366055",
  appId: "1:1004275366055:web:90dceea7047b743fb98382",
  measurementId: "G-WX81S44S7Q"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const firestore = firebase.firestore();