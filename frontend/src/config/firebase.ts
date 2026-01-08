import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: "AIzaSyDDp6uMaJs3o9055Gcxvn_ZVj2V3gawC00",
  authDomain: "social-auth-notification.firebaseapp.com",
  projectId: "social-auth-notification",
  storageBucket: "social-auth-notification.firebasestorage.app",
  messagingSenderId: "829128456998",
  appId: "1:829128456998:web:cc16c3fc85baab6fdf5fe7",
  measurementId: "G-3336BMRNVZ"
}

const app = initializeApp(firebaseConfig)

let messaging: Messaging | null = null

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app)
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging:', error)
  }
}

export { app, messaging, getToken, onMessage }
