// js/utils.js

import { db } from './firebase.js';

/**
 * Função chamada quando o DOM está carregado.
 * Inicia todos os módulos (notas, tarefas, categorias, subitens, calendário, contratos, tema, IA).
 */
export function initializeApp() {
  console.log('Iniciando o aplicativo...');
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.classList.add(savedTheme);

  try {
    if (typeof window.initNotes === 'function') window.initNotes();
    // ... outros módulos (tarefas, categorias, etc.)
    if (typeof window.initTasks === 'function') window.initTasks();
    if (typeof window.loadCategories === 'function') window.loadCategories();
    if (typeof window.initSubitemsAll === 'function') window.initSubitemsAll();
    if (typeof window.initCalendar === 'function') window.initCalendar();
    if (typeof window.initEditableTable === 'function') window.initEditableTable();
    if (typeof window.initTheme === 'function') window.initTheme();
    if (typeof window.mostrarIA === 'function') console.log('Ferramentas de IA prontas.');
  } catch (error) {
    console.error('Erro ao iniciar o aplicativo:', error);
  }
}

document.addEventListener('DOMContentLoaded', initializeApp);