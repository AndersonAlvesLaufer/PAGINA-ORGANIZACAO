// js/theme.js - Sistema de temas otimizado

import { db } from './firebase.js';
import { collection, setDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Constantes para evitar "magic strings"
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  BLUE: 'blue'
};

const THEME_COLLECTION = collection(db, 'themes');
const THEME_DOC = doc(THEME_COLLECTION, 'userTheme');
const LOCAL_STORAGE_KEY = 'theme';

// Variável para controle do debounce
let themeDebounceTimer = null;
const DEBOUNCE_DELAY = 300; // ms

/**
 * Mostra uma notificação temporária na tela
 * @param {string} message - Mensagem a ser exibida
 */
function showThemeNotification(message) {
  // Remove notificações existentes
  const oldNotification = document.querySelector('.theme-notification');
  if (oldNotification) oldNotification.remove();

  // Cria nova notificação
  const notification = document.createElement('div');
  notification.className = 'theme-notification';
  notification.textContent = message;
  document.body.appendChild(notification);

  // Animação de aparecer e desaparecer
  setTimeout(() => notification.style.opacity = '1', 10);
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

/**
 * Alterna o tema do body: light -> dark -> blue -> light
 */
window.toggleTheme = function toggleTheme() {
  // Debounce para evitar múltiplas chamadas rápidas
  clearTimeout(themeDebounceTimer);
  
  themeDebounceTimer = setTimeout(() => {
    const body = document.body;
    const currentTheme = body.className || THEMES.LIGHT;
    
    // Determina o próximo tema na sequência
    let newTheme;
    switch(currentTheme) {
      case THEMES.LIGHT:
        newTheme = THEMES.DARK;
        break;
      case THEMES.DARK:
        newTheme = THEMES.BLUE;
        break;
      default:
        newTheme = THEMES.LIGHT;
    }

    // Aplica o novo tema
    body.className = newTheme;

    // Salva a preferência
    saveThemePreference(newTheme)
      .then(() => {
        showThemeNotification(`Tema alterado para ${newTheme}`);
      })
      .catch((error) => {
        console.error('Erro ao salvar tema:', error);
        showThemeNotification('Erro ao salvar preferência de tema');
      });
  }, DEBOUNCE_DELAY);
};

/**
 * Salva a preferência de tema no Firestore e localStorage
 * @param {string} theme - Tema a ser salvo
 * @returns {Promise} - Promise da operação de salvamento
 */
function saveThemePreference(theme) {
  return new Promise((resolve, reject) => {
    // Tenta salvar no Firestore primeiro
    setDoc(THEME_DOC, { theme }, { merge: true })
      .then(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, theme);
        console.log('Tema salvo com sucesso');
        resolve();
      })
      .catch((error) => {
        // Fallback para localStorage se Firestore falhar
        console.warn('Falha ao salvar no Firestore, usando localStorage', error);
        localStorage.setItem(LOCAL_STORAGE_KEY, theme);
        resolve(); // Resolve mesmo com fallback
      });
  });
}

/**
 * Carrega o tema salvo e configura listener para mudanças em tempo real
 */
window.loadTheme = function loadTheme() {
  const body = document.body;
  
  // Carrega do localStorage como fallback inicial
  const savedTheme = localStorage.getItem(LOCAL_STORAGE_KEY) || THEMES.LIGHT;
  body.className = savedTheme;

  // Configura listener para atualizações em tempo real do Firestore
  const unsubscribe = onSnapshot(THEME_DOC, 
    (docSnap) => {
      if (docSnap.exists()) {
        const theme = docSnap.data().theme;
        if (Object.values(THEMES).includes(theme)) { // Valida o tema
          body.className = theme;
          localStorage.setItem(LOCAL_STORAGE_KEY, theme);
        }
      }
    },
    (error) => {
      console.error('Erro no listener do tema:', error);
      // Mantém o tema atual sem alterações
    }
  );

  return unsubscribe; // Retorna função para cancelar o listener
};

/**
 * Inicializa o sistema de temas
 */
window.initTheme = function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  
  if (themeToggle) {
    // Configura o evento de clique com acessibilidade
    themeToggle.addEventListener('click', window.toggleTheme);
    themeToggle.setAttribute('aria-label', 'Alternar tema');
    
    // Atualiza o ícone conforme o tema atual
    const updateToggleIcon = () => {
      const currentTheme = document.body.className || THEMES.LIGHT;
      const icon = themeToggle.querySelector('i');
      if (icon) {
        icon.className = currentTheme === THEMES.DARK ? 'fas fa-sun' :
                        currentTheme === THEMES.BLUE ? 'fas fa-tint' : 'fas fa-moon';
      }
    };
    
    // Listener para atualizar ícone quando o tema mudar
    document.body.addEventListener('themeChanged', updateToggleIcon);
    updateToggleIcon();
  }

  // Carrega o tema e armazena a função de unsubscribe
  const unsubscribe = window.loadTheme();

  // Retorna função de cleanup
  return () => {
    clearTimeout(themeDebounceTimer);
    unsubscribe?.();
  };
};

// Inicializa automaticamente quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const cleanupTheme = window.initTheme();

  // Limpa os listeners quando a página for descarregada
  window.addEventListener('beforeunload', cleanupTheme);
});