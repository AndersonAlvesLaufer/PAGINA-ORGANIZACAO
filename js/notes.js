// js/notes.js

import { db } from './firebase.js';
import { doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Usamos um documento fixo para as anotações rápidas
const notesDocRef = doc(db, 'notes', 'userQuickNotes');

/**
 * Atualiza o documento de notas com o conteúdo atual do textarea.
 * Se o campo estiver vazio, o documento será atualizado para ter conteúdo vazio.
 */
window.updateNotes = async function updateNotes() {
  const textArea = document.getElementById('quickNotes');
  const content = textArea.value;
  try {
    await setDoc(notesDocRef, { content: content }, { merge: true });
    console.log("Notas atualizadas com sucesso!");
    alert("Notas atualizadas!");
  } catch (error) {
    console.error("Erro ao atualizar notas:", error);
    alert("Erro ao atualizar notas.");
  }
};

/**
 * Carrega as notas do Firestore e atualiza o campo de texto.
 */
window.loadNotes = function loadNotes() {
  const textArea = document.getElementById('quickNotes');
  onSnapshot(notesDocRef, (docSnap) => {
    if (docSnap.exists()) {
      textArea.value = docSnap.data().content || "";
    } else {
      textArea.value = "";
    }
  }, (error) => {
    console.error("Erro ao carregar notas:", error);
  });
};

/**
 * Inicializa o campo de notas.
 */
window.initNotes = function initNotes() {
  const textArea = document.getElementById('quickNotes');
  if (!textArea) {
    console.log("Campo de notas não encontrado!");
    return;
  }
  window.loadNotes();
};
