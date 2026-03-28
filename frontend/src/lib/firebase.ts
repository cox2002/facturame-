import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCvg5jUb81-zz0b9n_9c2nFl4S2f4xPYSo",
  authDomain: "software-facturarion.firebaseapp.com",
  projectId: "software-facturarion",
  storageBucket: "software-facturarion.firebasestorage.app",
  messagingSenderId: "1094158564373",
  appId: "1:1094158564373:web:7a2b6ae2d7f8a0448ee21c",
  measurementId: "G-6JSG5GD42L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Proveedor de autenticación por Google
export const googleProvider = new GoogleAuthProvider();
