// js/firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Configurações do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB9jDcl79FAqsbRvqr_wDD9RxOLl6p7RkM",
    authDomain: "meu-organizador-9c2aa.firebaseapp.com",
    databaseURL: "https://meu-organizador-9c2aa-default-rtdb.firebaseio.com",
    projectId: "meu-organizador-9c2aa",
    storageBucket: "meu-organizador-9c2aa.firebasestorage.app",
    messagingSenderId: "85698960652",
    appId: "1:85698960652:web:b6a118dcd2c04df529fd29",
    measurementId: "G-C7LQNVGQ12"
};

// Inicializa o app Firebase
const app = initializeApp(firebaseConfig);
// Exporta instância do Firestore
export const db = getFirestore(app);

// Habilita persistência offline do Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.log('Persistência offline não ativa (outra aba aberta).');
  } else if (err.code === 'unimplemented') {
    console.log('Persistência offline não suportada neste navegador.');
  }
});
