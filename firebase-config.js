// ============================================================
// firebase-config.js
// Configuración Firebase compartida para toda la plataforma
// Proyecto: cocacola-20d01 | SAP PM Avisos de Mantenimiento
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyA-OL2JVA05qdR544sUU4bUEm6lHcsznns",
  authDomain:        "cocacola-20d01.firebaseapp.com",
  projectId:         "cocacola-20d01",
  storageBucket:     "cocacola-20d01.firebasestorage.app",
  messagingSenderId: "1032309684947",
  appId:             "1:1032309684947:web:e0f01a5dd5eb0ee18bb226",
  measurementId:     "G-NZMGHJM3TZ"
};

// URL pública del CSV en Firebase Storage
const STORAGE_CSV_URL =
  `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_CONFIG.storageBucket}/o/DBMANTTO.csv?alt=media`;

// Nombre del archivo en Storage
const STORAGE_CSV_PATH = 'DBMANTTO.csv';
