// js/theme.js

import { db } from './firebase.js';
import { collection, setDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const themeCollection = collection(db, 'themes');

/**
 * Alterna o tema do body: light -> dark -> blue -> light, e salva no Firestore/localStorage.
 */
window.toggleTheme = function toggleTheme() {
  const body = document.body;
  const currentTheme = body.className || 'light';
  const newTheme = currentTheme === 'light'
    ? 'dark'
    : currentTheme === 'dark'
      ? 'blue'
      : 'light';

  body.className = newTheme;

  // Salva a preferência de tema
  setDoc(doc(themeCollection, 'userTheme'), { theme: newTheme }, { merge: true })
    .then(() => {
      localStorage.setItem('theme', newTheme);
      console.log('Tema salvo no Firestore e localStorage!');
    })
    .catch((error) => {
      console.error('Erro ao salvar tema:', error);
      alert('Erro ao salvar tema. Tente novamente.');
    });
};

/**
 * Carrega o tema do Firestore (e localStorage como fallback) e monitora mudanças em tempo real.
 */
window.loadTheme = function loadTheme() {
  const body = document.body;
  const savedTheme = localStorage.getItem('theme') || 'light';
  body.className = savedTheme;

  // Sincroniza com Firestore
  onSnapshot(doc(themeCollection, 'userTheme'), (docSnap) => {
    if (docSnap.exists()) {
      const theme = docSnap.data().theme;
      body.className = theme;
      localStorage.setItem('theme', theme);
    } else {
      body.className = 'light';
      localStorage.setItem('theme', 'light');
    }
  }, (error) => {
    console.error('Erro ao carregar tema:', error);
    body.className = 'light';
    localStorage.setItem('theme', 'light');
  });
};

/**
 * Inicializa o tema, associando o botão de alternância e carregando o tema salvo.
 */
window.initTheme = function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', window.toggleTheme);
  }
  window.loadTheme();
};
