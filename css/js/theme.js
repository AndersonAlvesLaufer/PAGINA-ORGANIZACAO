// js/theme.js - Sistema de temas otimizado

import { db } from './firebase.js';
import { doc, setDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { showNotification, showSpinner, hideSpinner } from './utils.js';

// Constantes
const THEMES = { LIGHT: 'light', DARK: 'dark', BLUE: 'blue' };
const THEME_DOC_REF = doc(db, 'settings', 'userTheme'); // Coleção 'settings', doc 'userTheme'
const LOCAL_STORAGE_KEY = 'themePreference';
const SPINNER_ID = 'themeSpinner'; // Adicionar div se quiser spinner visual

// Estado
let currentTheme = THEMES.LIGHT;
let unsubscribeTheme = null;
let themeDebounceTimer = null;
const DEBOUNCE_DELAY = 400; // ms

/**
 * Aplica o tema ao body e atualiza o botão.
 * @param {string} theme - O tema a ser aplicado ('light', 'dark', 'blue').
 */
function applyTheme(theme) {
    if (!Object.values(THEMES).includes(theme)) {
        console.warn(`Tema inválido: ${theme}. Usando ${THEMES.LIGHT}.`);
        theme = THEMES.LIGHT;
    }

    document.body.classList.remove(THEMES.LIGHT, THEMES.DARK, THEMES.BLUE);
    document.body.classList.add(theme);
    currentTheme = theme;

    // Atualiza ícone e texto do botão
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        let iconClass = 'fa-moon'; // Padrão light
        let buttonText = 'Escuro';
        if (theme === THEMES.DARK) {
            iconClass = 'fa-sun';
            buttonText = 'Azul';
        } else if (theme === THEMES.BLUE) {
            iconClass = 'fa-tint';
             buttonText = 'Claro';
        }
        if (icon) icon.className = `fas ${iconClass}`;
        themeToggle.querySelector('.theme-toggle-text').textContent = buttonText;
        themeToggle.setAttribute('aria-label', `Mudar para tema ${buttonText}`);
    }

    // Dispara evento customizado se outros módulos precisarem reagir
    document.body.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: theme } }));
}

/**
 * Alterna para o próximo tema na sequência: light -> dark -> blue -> light.
 */
function toggleTheme() {
  clearTimeout(themeDebounceTimer); // Debounce

  themeDebounceTimer = setTimeout(() => {
    let nextTheme;
    switch(currentTheme) {
      case THEMES.LIGHT: nextTheme = THEMES.DARK; break;
      case THEMES.DARK: nextTheme = THEMES.BLUE; break;
      case THEMES.BLUE: nextTheme = THEMES.LIGHT; break;
      default: nextTheme = THEMES.LIGHT;
    }

    applyTheme(nextTheme); // Aplica visualmente
    saveThemePreference(nextTheme); // Salva no backend/local

  }, DEBOUNCE_DELAY);
}

/**
 * Salva a preferência de tema no Firestore e localStorage.
 * @param {string} theme - Tema a ser salvo.
 * @async
 */
async function saveThemePreference(theme) {
    // showSpinner(SPINNER_ID); // Spinner é provavelmente muito rápido para ser útil aqui
    try {
        // Salva no localStorage imediatamente para resposta rápida
        localStorage.setItem(LOCAL_STORAGE_KEY, theme);

        // Tenta salvar no Firestore
        await setDoc(THEME_DOC_REF, {
            theme: theme,
            updatedAt: serverTimestamp()
        }, { merge: true });

        console.log(`Preferência de tema (${theme}) salva no Firestore.`);
        // showNotification(`Tema ${theme} salvo.`, 'info'); // Notificação talvez excessiva

    } catch (error) {
        console.error('Erro ao salvar preferência de tema no Firestore:', error);
        showNotification('Erro ao sincronizar preferência de tema.', 'error');
        // localStorage já foi salvo, então o tema persiste localmente
    } finally {
        // hideSpinner(SPINNER_ID);
    }
}

/**
 * Carrega o tema salvo (Firestore com fallback localStorage) e configura listener.
 */
function loadTheme() {
    // 1. Aplica tema do localStorage imediatamente
    const localTheme = localStorage.getItem(LOCAL_STORAGE_KEY) || THEMES.LIGHT;
    applyTheme(localTheme);

    // 2. Configura listener do Firestore para atualizações em tempo real/remotas
    if (unsubscribeTheme) unsubscribeTheme(); // Cancela listener anterior

    unsubscribeTheme = onSnapshot(THEME_DOC_REF,
        (docSnap) => {
            if (docSnap.exists()) {
                const firestoreTheme = docSnap.data().theme;
                if (firestoreTheme && firestoreTheme !== currentTheme) {
                    console.log(`Tema ${firestoreTheme} recebido do Firestore.`);
                    applyTheme(firestoreTheme); // Aplica tema vindo do Firestore
                    localStorage.setItem(LOCAL_STORAGE_KEY, firestoreTheme); // Sincroniza localStorage
                }
            } else {
                 // Documento não existe, talvez salvar o tema local atual?
                 console.log("Documento de tema não encontrado no Firestore. Salvando tema local:", currentTheme);
                 saveThemePreference(currentTheme); // Salva o tema carregado do localStorage (ou padrão)
            }
        },
        (error) => {
            console.error('Erro no listener de tema do Firestore:', error);
            showNotification('Erro ao verificar tema sincronizado.', 'warning');
            // Mantém o tema carregado do localStorage
        }
    );
}

/**
 * Inicializa o sistema de temas.
 */
export function initTheme() {
    const themeToggle = document.getElementById('themeToggle');

    if (!themeToggle) {
        console.error('Botão de alternar tema não encontrado.');
        return;
    }

    // Adiciona listener ao botão
    themeToggle.addEventListener('click', toggleTheme);

    // Carrega o tema inicial e configura o listener do Firestore
    loadTheme();

    console.log('Módulo de Tema inicializado.');
}

// Cleanup listener do Firestore ao descarregar
window.addEventListener('beforeunload', () => {
  if (unsubscribeTheme) {
    unsubscribeTheme();
  }
});

// Não inicializa automaticamente