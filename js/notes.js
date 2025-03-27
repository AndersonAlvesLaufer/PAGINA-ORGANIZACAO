// js/notes.js - Código otimizado para gerenciamento de anotações

import { db } from './firebase.js';
import { doc, setDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { showNotification, showSpinner, hideSpinner } from './utils.js'; // Importa funções utilitárias

// Referência ao documento no Firestore
const NOTES_DOC_REF = doc(db, 'notes', 'userQuickNotes'); // Assumindo um ID fixo por usuário (ajustar se houver auth)
const SPINNER_ID = 'notesSpinner'; // ID para o spinner (adicionar div no HTML se necessário)

// Tempo de debounce para auto-salvamento (em milissegundos)
const AUTO_SAVE_DELAY = 2500; // Aumentado ligeiramente
let saveTimeout = null;
let unsubscribeNotes = null; // Para guardar a função de unsubscribe do listener

/**
 * Atualiza as notas no Firestore com o conteúdo atual.
 * @async
 */
async function updateNotes() {
  const textArea = document.getElementById('quickNotes');
  if (!textArea) return; // Sai se o elemento não existe

  const content = textArea.value; // Salva mesmo se vazio para permitir limpar as notas
  // showSpinner(SPINNER_ID); // Mostrar spinner ao salvar manualmente (opcional, pode ser rápido demais)

  try {
    await setDoc(NOTES_DOC_REF, {
      content: content,
      lastUpdated: serverTimestamp() // Usa timestamp do servidor
    }, { merge: true }); // Merge para não sobrescrever outros campos se existirem

    // Não mostra notificação no auto-save para não ser intrusivo
    // Apenas mostra se for clique manual (ver initNotes)
    console.log("Notas atualizadas no Firestore");

  } catch (error) {
    console.error("Erro ao atualizar notas:", error);
    showNotification(`Erro ao salvar notas: ${error.message}`, 'error');

    // Fallback para localStorage
    try {
      localStorage.setItem('quickNotesBackup', content);
      console.warn("Notas salvas localmente como fallback");
      showNotification("Notas salvas localmente (offline)", 'warning');
    } catch (localError) {
      console.error("Erro ao salvar backup local:", localError);
    }
  } finally {
    // hideSpinner(SPINNER_ID);
  }
}

/**
 * Configura o auto-salvamento após período de inatividade.
 */
function setupAutoSave() {
  const textArea = document.getElementById('quickNotes');
  if (!textArea) return;

  textArea.addEventListener('input', () => {
    clearTimeout(saveTimeout); // Limpa o timeout anterior
    saveTimeout = setTimeout(updateNotes, AUTO_SAVE_DELAY); // Configura novo timeout
  });
}

/**
 * Carrega as notas do Firestore e configura listener em tempo real.
 */
function loadNotes() {
  const textArea = document.getElementById('quickNotes');
  if (!textArea) return;

  // showSpinner(SPINNER_ID); // Mostrar spinner ao carregar

  // Cancela listener anterior se existir
  if (unsubscribeNotes) {
    unsubscribeNotes();
    unsubscribeNotes = null;
  }

  unsubscribeNotes = onSnapshot(NOTES_DOC_REF,
    (docSnap) => {
      // hideSpinner(SPINNER_ID); // Esconde spinner após receber dados
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Evita atualizar se o conteúdo for o mesmo (prevenindo perda de foco/seleção)
        if (textArea.value !== (data.content || "")) {
             textArea.value = data.content || "";
        }
        if (data.lastUpdated) {
          // console.log(`Notas carregadas, última atualização: ${new Date(data.lastUpdated.seconds * 1000).toLocaleString()}`);
        }
      } else {
        // Documento não existe, pode ser a primeira vez
        textArea.value = ""; // Limpa o campo
        console.log("Documento de notas não encontrado, pronto para criar um novo.");
      }
    },
    (error) => {
      // hideSpinner(SPINNER_ID); // Esconde spinner em caso de erro
      console.error("Erro ao carregar notas:", error);
      showNotification(`Erro ao carregar notas: ${error.message}. Tentando backup local.`, 'error');

      // Tenta carregar do localStorage como fallback
      try {
        const backup = localStorage.getItem('quickNotesBackup');
        if (backup) {
          textArea.value = backup;
          showNotification("Notas carregadas da última versão local (offline)", 'info');
        }
      } catch (localError) {
         console.error("Erro ao carregar backup local:", localError);
      }
    }
  );
}

/**
 * Inicializa a funcionalidade de notas.
 */
export function initNotes() {
  const textArea = document.getElementById('quickNotes');
  const updateButton = document.getElementById('updateNotesBtn');

  if (!textArea || !updateButton) {
    console.error("Elementos 'quickNotes' ou 'updateNotesBtn' não encontrados no DOM");
    return;
  }

  // Configura auto-save
  setupAutoSave();

  // Carrega notas iniciais e configura listener
  loadNotes();

  // Adiciona event listener para o botão de atualização manual
  // REMOVIDO: onclick="updateNotes()" do HTML
  updateButton.addEventListener('click', () => {
      clearTimeout(saveTimeout); // Cancela qualquer auto-save pendente
      updateNotes(); // Salva imediatamente
      showNotification("Notas salvas manualmente!", 'success'); // Feedback para clique manual
  });

  // Adiciona listener para salvar antes de descarregar a página (melhor esforço)
  window.addEventListener('beforeunload', () => {
      clearTimeout(saveTimeout); // Cancela auto-save
      // Nota: Operações assíncronas aqui não são garantidas
      // updateNotes(); // Pode não completar
  });

  console.log('Módulo de Notas inicializado.');
}

// Não precisa mais de inicialização automática aqui, será chamado por utils.js
// document.addEventListener('DOMContentLoaded', initNotes);