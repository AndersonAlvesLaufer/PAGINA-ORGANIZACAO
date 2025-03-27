// js/tasks.js - Código otimizado para gerenciamento de tarefas

import { db } from './firebase.js';
import { 
  collection, addDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, updateDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Referência à coleção de tarefas no Firestore
const TASKS_COLLECTION = collection(db, 'tasks');

// Tempo de debounce para evitar múltiplas chamadas rápidas
const DEBOUNCE_DELAY = 300;
let debounceTimer = null;

/**
 * Mostra uma notificação temporária na tela
 * @param {string} message - Mensagem a ser exibida
 * @param {boolean} isError - Se é uma mensagem de erro
 */
function showNotification(message, isError = false) {
  // Remove notificações existentes
  const oldNotification = document.querySelector('.task-notification');
  if (oldNotification) oldNotification.remove();

  // Cria nova notificação
  const notification = document.createElement('div');
  notification.className = `task-notification ${isError ? 'notification-error' : 'notification-success'}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Remove após 3 segundos
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Adiciona uma nova tarefa no Firestore
 * @async
 */
window.addTask = async function addTask() {
  const taskInput = document.getElementById('taskInput');
  const taskValue = taskInput.value.trim();

  // Validação do input
  if (!taskValue) {
    showNotification('Por favor, digite uma tarefa válida', true);
    return;
  }

  if (taskValue.length > 200) {
    showNotification('A tarefa não pode ter mais de 200 caracteres', true);
    return;
  }

  try {
    // Adiciona a nova tarefa com timestamp
    await addDoc(TASKS_COLLECTION, { 
      text: taskValue,
      completed: false,
      createdAt: serverTimestamp() // Usa serverTimestamp para consistência
    });
    
    // Limpa o input e mostra feedback
    taskInput.value = '';
    showNotification('Tarefa adicionada com sucesso!');
  } catch (error) {
    console.error('Erro ao salvar tarefa:', error);
    showNotification('Erro ao adicionar tarefa. Tente novamente.', true);
    
    // Fallback para localStorage se offline
    if (error.code === 'unavailable') {
      const tasks = JSON.parse(localStorage.getItem('tasksBackup') || []);
      tasks.push({ text: taskValue, completed: false, id: Date.now().toString() });
      localStorage.setItem('tasksBackup', JSON.stringify(tasks));
      showNotification('Tarefa salva localmente (modo offline)');
    }
  }
};

/**
 * Carrega as tarefas do Firestore em tempo real
 */
window.loadTasks = function loadTasks() {
  const tasksList = document.getElementById('tasksList');
  if (!tasksList) {
    console.error('Elemento tasksList não encontrado no DOM');
    return () => {}; // Retorna função vazia para não quebrar o cleanup
  }

  // Query com ordenação por data de criação
  const tasksQuery = query(TASKS_COLLECTION, orderBy('createdAt', 'desc'));

  // Listener para atualizações em tempo real
  const unsubscribe = onSnapshot(tasksQuery, 
    (snapshot) => {
      // Verifica se há diferenças antes de atualizar
      if (snapshot.metadata.hasPendingWrites) return;

      // Limpa a lista
      tasksList.innerHTML = '';

      // Adiciona cada tarefa
      snapshot.forEach((docSnap) => {
        const task = docSnap.data();
        const li = document.createElement('li');
        li.dataset.id = docSnap.id; // Armazena o ID no elemento

        // Cria o HTML do item
        li.innerHTML = `
          <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
          <span class="task-text ${task.completed ? 'task-completed' : ''}">${task.text}</span>
          <button class="remove-task" title="Remover tarefa">
            <i class="fas fa-trash"></i>
          </button>
        `;

        // Adiciona à lista
        tasksList.appendChild(li);

        // Configura os event listeners
        const checkbox = li.querySelector('.task-checkbox');
        const removeBtn = li.querySelector('.remove-task');

        // Listener para marcar/desmarcar como completa
        checkbox.addEventListener('change', async () => {
          try {
            await updateDoc(doc(db, 'tasks', docSnap.id), {
              completed: checkbox.checked
            });
          } catch (error) {
            console.error('Erro ao atualizar tarefa:', error);
            showNotification('Erro ao atualizar tarefa', true);
            checkbox.checked = !checkbox.checked; // Reverte a mudança
          }
        });

        // Listener para remover tarefa
        removeBtn.addEventListener('click', async () => {
          try {
            await deleteDoc(doc(db, 'tasks', docSnap.id));
            showNotification('Tarefa removida com sucesso');
          } catch (error) {
            console.error('Erro ao remover tarefa:', error);
            showNotification('Erro ao remover tarefa', true);
          }
        });
      });

      // Carrega do localStorage se estiver vazio (fallback offline)
      if (snapshot.empty) {
        const localTasks = JSON.parse(localStorage.getItem('tasksBackup') || '[]');
        if (localTasks.length > 0) {
          showNotification('Carregando tarefas salvas localmente');
          localTasks.forEach(task => {
            const li = document.createElement('li');
            li.innerHTML = `
              <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} disabled>
              <span class="task-text ${task.completed ? 'task-completed' : ''}">${task.text}</span>
              <button class="remove-task" disabled>
                <i class="fas fa-trash"></i>
              </button>
            `;
            tasksList.appendChild(li);
          });
        }
      }
    },
    (error) => {
      console.error('Erro ao carregar tarefas:', error);
      showNotification('Erro ao carregar tarefas. Verifique sua conexão.', true);
    }
  );

  return unsubscribe; // Retorna a função para cancelar o listener
};

/**
 * Inicializa o sistema de tarefas
 */
window.initTasks = function initTasks() {
  const taskInput = document.getElementById('taskInput');
  if (!taskInput) {
    console.error('Elemento taskInput não encontrado no DOM');
    return () => {}; // Retorna função vazia para não quebrar o cleanup
  }

  // Listener para adicionar tarefa com Enter
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      // Debounce para evitar múltiplas chamadas
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        window.addTask();
      }, DEBOUNCE_DELAY);
    }
  });

  // Carrega as tarefas e armazena a função de unsubscribe
  const unsubscribe = window.loadTasks();

  // Retorna função de cleanup para remover listeners
  return () => {
    clearTimeout(debounceTimer);
    unsubscribe();
  };
};

// Inicializa automaticamente quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  const cleanup = window.initTasks();

  // Limpa os listeners quando a página for descarregada
  window.addEventListener('beforeunload', cleanup);
});