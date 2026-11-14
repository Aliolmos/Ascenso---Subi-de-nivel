/* Config de Firebase: reemplazá los PEGAR_ACA con los datos de tu proyecto
   (Firebase → Configuración del proyecto → Tus apps → app web). */
const FIREBASE = {
  apiKey: "AIzaSyBoNvCDQZec5V59_lB8zKFacsXzM_fx5Sc",
  authDomain: "racha-7834a.firebaseapp.com",
  projectId: "racha-7834a",
  storageBucket: "racha-7834a.firebasestorage.app",
  messagingSenderId: "720893050211",
  appId: "1:720893050211:web:d0450c08025c265283a756",
};
const FB_ON = !FIREBASE.apiKey.startsWith("PEGAR");
