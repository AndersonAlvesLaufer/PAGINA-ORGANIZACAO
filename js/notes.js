// js/notes.js - Código otimizado para gerenciamento de anotações

import { db } from './firebase.js';
import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Referência ao documento no Firestore (constante em maiúsculas por convenção)
const NOTES_DOC_REF = doc(db, 'notes', 'userQuickNotes');

// Tempo de debounce para auto-salvamento (em milissegundos)
const AUTO_SAVE_DELAY = 2000;
let saveTimeout = null;

/**
 * Mostra feedback visual para o usuário
 * @param {string} message - Mensagem a ser exibida
 * @param {boolean} isError - Se é uma mensagem de erro
 */
function showFeedback(message, isError = false) {
  const feedback = document.createElement('div');
  feedback.className = `feedback ${isError ? 'error' : 'success'}`;
  feedback.textContent = message;
  document.body.appendChild(feedback);
  
  // Remove o feedback após 3 segundos
  setTimeout(() => {
    feedback.style.opacity = '0';
    setTimeout(() => feedback.remove(), 300);
  }, 3000);
}

/**
 * Atualiza as notas no Firestore com o conteúdo atual
 * @async
 */
window.updateNotes = async function updateNotes() {
  const textArea = document.getElementById('quickNotes');
  const content = textArea.value.trim();
  
  try {
    // Verifica se há conteúdo para evitar atualizações desnecessárias
    await setDoc(NOTES_DOC_REF, { content, lastUpdated: new Date() }, { merge: true });
    showFeedback("Notas salvas com sucesso!");
    console.log("Notas atualizadas no Firestore");
  } catch (error) {
    console.error("Erro ao atualizar notas:", error);
    showFeedback("Erro ao salvar notas. Tente novamente.", true);
    
    // Fallback para localStorage se houver erro de conexão
    localStorage.setItem('quickNotesBackup', content);
    console.warn("Notas salvas localmente como fallback");
  }
};

/**
 * Configura o auto-salvamento após período de inatividade
 */
function setupAutoSave() {
  const textArea = document.getElementById('quickNotes');
  
  textArea.addEventListener('input', () => {
    // Limpa o timeout anterior para evitar múltiplas chamadas
    clearTimeout(saveTimeout);
    
    // Configura novo timeout para salvar após período de inatividade
    saveTimeout = setTimeout(() => {
      updateNotes();
    }, AUTO_SAVE_DELAY);
  });
}

/**
 * Carrega as notas do Firestore e configura listener em tempo real
 */
window.loadNotes = function loadNotes() {
  const textArea = document.getElementById('quickNotes');
  
  // Listener em tempo real para atualizações no Firestore
  const unsubscribe = onSnapshot(NOTES_DOC_REF, 
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        textArea.value = data.content || "";
        
        // Mostra quando as notas foram atualizadas pela última vez
        if (data.lastUpdated) {
          const lastUpdated = new Date(data.lastUpdated.seconds * 1000);
          console.log(`Notas atualizadas em: ${lastUpdated.toLocaleString()}`);
        }
      }
    },
    (error) => {
      console.error("Erro ao carregar notas:", error);
      showFeedback("Erro ao carregar notas. Verifique sua conexão.", true);
      
      // Tenta carregar do localStorage como fallback
      const backup = localStorage.getItem('quickNotesBackup');
      if (backup) {
        textArea.value = backup;
        showFeedback("Notas carregadas da última versão local");
      }
    }
  );
  
  return unsubscribe; // Retorna a função para cancelar o listener
};

/**
 * Inicializa a funcionalidade de notas
 */
window.initNotes = function initNotes() {
  const textArea = document.getElementById('quickNotes');
  
  if (!textArea) {
    console.error("Elemento 'quickNotes' não encontrado no DOM");
    return;
  }
  
  // Configura todas as funcionalidades
  setupAutoSave();
  const unsubscribe = window.loadNotes();
  
  // Adiciona event listener para o botão de atualização manual
  document.getElementById('updateNotesBtn')?.addEventListener('click', updateNotes);
  
  // Retorna função de cleanup para remover listeners
  return () => {
    clearTimeout(saveTimeout);
    unsubscribe?.();
  };
};

// Inicializa automaticamente quando o script é carregado
document.addEventListener('DOMContentLoaded', () => {
  window.initNotes();
});