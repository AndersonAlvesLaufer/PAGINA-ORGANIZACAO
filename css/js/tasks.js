// js/tasks.js - Código otimizado para gerenciamento de tarefas

import { db } from './firebase.js';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, updateDoc, serverTimestamp, writeBatch, where, getDocs
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { showNotification, showSpinner, hideSpinner } from './utils.js'; // Importa funções utilitárias

// Referência à coleção de tarefas no Firestore
const TASKS_COLLECTION = collection(db, 'tasks');
const SPINNER_ID = 'tasksSpinner'; // ID do spinner da seção de tarefas

// Variáveis de estado
let unsubscribeTasks = null;

// --- Funções Auxiliares ---

/**
 * Cria o elemento HTML (LI) para uma tarefa.
 * @param {object} task - Objeto da tarefa com id, text, completed, createdAt, dueDate, priority.
 * @returns {HTMLElement} O elemento LI criado.
 */
function createTaskElement(task) {
    const li = document.createElement('li');
    li.dataset.id = task.id; // Armazena o ID no elemento
    li.className = task.completed ? 'task-item task-completed' : 'task-item';

    // Formata data de vencimento (se existir)
    let dueDateFormatted = '';
    if (task.dueDate) {
        try {
            // Ajusta para entrada tipo 'date' (YYYY-MM-DD)
            const date = new Date(task.dueDate + 'T00:00:00'); // Considera timezone local
            dueDateFormatted = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            console.warn("Erro ao formatar data:", task.dueDate, e);
        }
    }

    // Define prioridade (padrão 'medium' se ausente)
    const priority = task.priority || 'medium';

    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" aria-label="Marcar como concluída" ${task.completed ? 'checked' : ''}>
      <div class="task-details">
        <span class="task-text">${task.text}</span>
        <div class="task-meta">
            ${dueDateFormatted ? `<span class="task-due-date"><i class="fas fa-calendar-alt" aria-hidden="true"></i> ${dueDateFormatted}</span>` : ''}
            <span class="task-priority" data-priority="${priority}"><i class="fas fa-flag" aria-hidden="true"></i> ${priority.charAt(0).toUpperCase() + priority.slice(1)}</span>
        </div>
      </div>
      <button class="remove-task-btn btn btn-danger btn-small" title="Remover tarefa" aria-label="Remover tarefa">
        <i class="fas fa-trash"></i>
      </button>
    `;

    // --- Adiciona Event Listeners para o item ---
    const checkbox = li.querySelector('.task-checkbox');
    const removeBtn = li.querySelector('.remove-task-btn');

    // Listener para marcar/desmarcar como completa
    checkbox.addEventListener('change', async () => {
        try {
            await updateDoc(doc(db, 'tasks', task.id), {
                completed: checkbox.checked
            });
            li.classList.toggle('task-completed', checkbox.checked); // Atualiza visualmente
            // showNotification(`Tarefa ${checkbox.checked ? 'concluída' : 'pendente'}`, 'info');
        } catch (error) {
            console.error('Erro ao atualizar tarefa:', error);
            showNotification(`Erro ao atualizar tarefa: ${error.message}`, 'error');
            checkbox.checked = !checkbox.checked; // Reverte a mudança visualmente
            li.classList.toggle('task-completed', checkbox.checked);
        }
    });

    // Listener para remover tarefa (com confirmação)
    removeBtn.addEventListener('click', async () => {
        // ADICIONADO: Confirmação
        if (!confirm(`Tem certeza que deseja remover a tarefa "${task.text}"?`)) {
            return;
        }
        try {
            await deleteDoc(doc(db, 'tasks', task.id));
            showNotification('Tarefa removida com sucesso', 'success');
            // O listener do onSnapshot removerá o item do DOM
        } catch (error) {
            console.error('Erro ao remover tarefa:', error);
            showNotification(`Erro ao remover tarefa: ${error.message}`, 'error');
        }
    });

    // Adicionar listener para edição inline ou modal (FUNCIONALIDADE FUTURA)
    // li.querySelector('.task-text').addEventListener('click', () => { /* Abrir edição */ });

    return li;
}


// --- Funções Principais ---

/**
 * Adiciona uma nova tarefa no Firestore.
 * @async
 */
async function addTask() {
    const taskInput = document.getElementById('taskInput');
    const dueDateInput = document.getElementById('taskDueDate');
    const priorityInput = document.getElementById('taskPriority');

    if (!taskInput || !dueDateInput || !priorityInput) {
        console.error('Elementos de input de tarefa não encontrados');
        return;
    }

    const taskValue = taskInput.value.trim();
    const dueDateValue = dueDateInput.value || null; // Salva null se vazio
    const priorityValue = priorityInput.value;

    // Validação do input
    if (!taskValue) {
        showNotification('Por favor, digite o texto da tarefa', 'warning');
        taskInput.focus();
        return;
    }
    if (taskValue.length > 250) { // Limite aumentado ligeiramente
        showNotification('A tarefa não pode ter mais de 250 caracteres', 'warning');
        return;
    }
     // Validação simples da data (se fornecida)
     if (dueDateValue) {
         try {
             new Date(dueDateValue + 'T00:00:00'); // Tenta criar data para validar formato
         } catch (e) {
             showNotification('Formato de data inválido.', 'warning');
             dueDateInput.focus();
             return;
         }
     }


    showSpinner(SPINNER_ID); // Mostra spinner ao adicionar

    try {
        await addDoc(TASKS_COLLECTION, {
            text: taskValue,
            completed: false,
            createdAt: serverTimestamp(), // Usa timestamp do servidor
            dueDate: dueDateValue,         // Salva data
            priority: priorityValue      // Salva prioridade
        });

        // Limpa os inputs e mostra feedback
        taskInput.value = '';
        dueDateInput.value = '';
        priorityInput.value = 'medium'; // Volta ao padrão
        showNotification('Tarefa adicionada com sucesso!', 'success');
        taskInput.focus(); // Foca no input para próxima tarefa

    } catch (error) {
        console.error('Erro ao salvar tarefa:', error);
        showNotification(`Erro ao adicionar tarefa: ${error.message}`, 'error');

        // Fallback para localStorage (simples, apenas texto) - PODE SER REMOVIDO SE PERSISTÊNCIA OFFLINE DO FIREBASE ESTIVER OK
        /*
        if (error.code === 'unavailable' || !navigator.onLine) {
            try {
                const tasks = JSON.parse(localStorage.getItem('tasksBackup') || '[]');
                tasks.push({ text: taskValue, completed: false, id: `local_${Date.now()}` }); // Adiciona ID local
                localStorage.setItem('tasksBackup', JSON.stringify(tasks));
                showNotification('Tarefa salva localmente (modo offline)', 'warning');
                taskInput.value = ''; // Limpa mesmo offline
            } catch (localError) {
                console.error("Erro ao salvar backup local:", localError);
            }
        }
        */
    } finally {
        hideSpinner(SPINNER_ID); // Esconde spinner
    }
}

/**
 * Limpa todas as tarefas concluídas.
 * @async
 */
async function clearCompletedTasks() {
    if (!confirm("Tem certeza que deseja remover todas as tarefas concluídas?")) {
        return;
    }

    showSpinner(SPINNER_ID);
    try {
        // 1. Encontra as tarefas concluídas
        const q = query(TASKS_COLLECTION, where("completed", "==", true));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            showNotification("Nenhuma tarefa concluída para remover.", 'info');
            return;
        }

        // 2. Deleta em lote (mais eficiente)
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        showNotification(`${snapshot.size} tarefa(s) concluída(s) removida(s).`, 'success');

    } catch (error) {
        console.error('Erro ao limpar tarefas concluídas:', error);
        showNotification(`Erro ao limpar tarefas: ${error.message}`, 'error');
    } finally {
        hideSpinner(SPINNER_ID);
    }
}


/**
 * Carrega as tarefas do Firestore em tempo real e renderiza na lista.
 */
function loadTasks() {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) {
        console.error('Elemento tasksList não encontrado no DOM');
        return;
    }

    showSpinner(SPINNER_ID);

    // Cancela listener anterior se existir
    if (unsubscribeTasks) {
        unsubscribeTasks();
        unsubscribeTasks = null;
    }

    // Query com ordenação (ex: por data de criação descendente)
    // Poderia ordenar por dueDate ou priority também
    const tasksQuery = query(TASKS_COLLECTION, orderBy('createdAt', 'desc'));

    unsubscribeTasks = onSnapshot(tasksQuery,
        (snapshot) => {
            hideSpinner(SPINNER_ID); // Esconde spinner após receber dados
            tasksList.innerHTML = ''; // Limpa a lista atual

            if (snapshot.empty) {
                tasksList.innerHTML = '<li class="empty-message">Nenhuma tarefa encontrada.</li>';
            } else {
                snapshot.forEach((docSnap) => {
                    const task = { id: docSnap.id, ...docSnap.data() };
                    const li = createTaskElement(task); // Cria o elemento LI
                    tasksList.appendChild(li);
                });
            }

            // Fallback localStorage - REMOVIDO, confiar na persistência offline do Firebase
        },
        (error) => {
            hideSpinner(SPINNER_ID); // Esconde spinner em caso de erro
            console.error('Erro ao carregar tarefas:', error);
            showNotification(`Erro ao carregar tarefas: ${error.message}. Verifique sua conexão.`, 'error');
            tasksList.innerHTML = '<li class="error-message">Não foi possível carregar as tarefas.</li>';
        }
    );
}

/**
 * Inicializa o sistema de tarefas.
 */
export function initTasks() {
    const taskInput = document.getElementById('taskInput');
    const addTaskButton = document.getElementById('addTaskBtn');
    const clearCompletedButton = document.getElementById('clearCompletedTasksBtn');

    if (!taskInput || !addTaskButton || !clearCompletedButton) {
        console.error('Elementos essenciais da seção de tarefas não encontrados no DOM');
        return;
    }

    // Adiciona listener para o botão Adicionar
    addTaskButton.addEventListener('click', addTask);

    // Adiciona listener para adicionar tarefa com Enter no input principal
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Evita envio de formulário se houver
            addTask();
        }
    });

    // Adiciona listener para o botão Limpar Concluídas
    clearCompletedButton.addEventListener('click', clearCompletedTasks);

    // Carrega as tarefas iniciais e configura listener
    loadTasks();

    console.log('Módulo de Tarefas inicializado.');

    // Cleanup function (opcional, mas boa prática se o módulo puder ser "desmontado")
    // return () => {
    //     if (unsubscribeTasks) unsubscribeTasks();
    // };
}

// Não inicializa automaticamente, será chamado por utils.js