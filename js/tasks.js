// js/tasks.js

import { db } from './firebase.js';
import { collection, addDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const tasksCollection = collection(db, 'tasks');

/**
 * Adiciona uma nova tarefa no Firestore e limpa o campo de input.
 */
window.addTask = async function addTask() {
  const taskInput = document.getElementById('taskInput');
  const taskValue = taskInput.value.trim();
  if (!taskValue) return;

  try {
    await addDoc(tasksCollection, { text: taskValue, completed: false });
    taskInput.value = '';
    console.log('Tarefa salva no Firestore!');
    alert('Tarefa adicionada com sucesso!');
  } catch (error) {
    console.error('Erro ao salvar tarefa:', error);
    alert('Erro ao adicionar tarefa. Tente novamente.');
  }
};

/**
 * Monitora a coleção de tarefas e exibe todas as tarefas em tempo real.
 */
window.loadTasks = function loadTasks() {
  const tasksList = document.getElementById('tasksList');
  if (!tasksList) {
    console.log('Não encontrei a lista de tarefas!');
    return;
  }

  onSnapshot(tasksCollection, (snapshot) => {
    tasksList.innerHTML = '';
    snapshot.forEach((docSnap) => {
      const task = docSnap.data();
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${task.text}</span>
        <button class="remove-task" data-id="${docSnap.id}">
          <i class="fas fa-trash"></i>
        </button>`;
      tasksList.appendChild(li);
    });
    tasksList.style.display = 'block';
  }, (error) => {
    console.error('Erro ao carregar tarefas:', error);
  });
};

/**
 * Inicializa o sistema de tarefas: Enter no input adiciona a tarefa, clique no lixo remove.
 */
window.initTasks = function initTasks() {
  const taskInput = document.getElementById('taskInput');
  const tasksList = document.getElementById('tasksList');
  if (!taskInput || !tasksList) {
    console.log('Campo ou lista de tarefas não encontrado!');
    return;
  }

  // Adiciona tarefa ao pressionar Enter
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      window.addTask();
    }
  });

  // Remove tarefa ao clicar no botão de remoção
  tasksList.addEventListener('click', async (e) => {
    const removeButton = e.target.closest('.remove-task');
    if (removeButton) {
      const taskId = removeButton.getAttribute('data-id');
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
        console.log('Tarefa removida!');
        alert('Tarefa removida com sucesso!');
      } catch (error) {
        console.error('Erro ao remover tarefa:', error);
        alert('Erro ao remover tarefa. Tente novamente.');
      }
    }
  });

  window.loadTasks();
};
