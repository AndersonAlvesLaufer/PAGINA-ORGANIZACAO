// js/calendar.js
// Arquivo principal de gerenciamento do calendário com correções e melhorias

// Importa a instância do banco de dados do Firebase
import { db } from './firebase.js';

// Importa funções específicas do Firestore
import { collection, addDoc, onSnapshot, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Cria referência para a coleção 'events' no Firestore
const eventsCollection = collection(db, 'events');

// Variável para armazenar o evento atualmente sendo editado
let currentEvent = null;

// Variável para armazenar a instância do FullCalendar
let calendar = null;

/**
 * Inicializa o FullCalendar com configurações padrão
 * @returns {void}
 */
export function initCalendar() {
  // Obtém o elemento DOM onde o calendário será renderizado
  const calendarEl = document.getElementById('calendar');
  
  // Verifica se o elemento existe
  if (!calendarEl) {
    showUserFeedback('Elemento do calendário não encontrado', 'error');
    return;
  }
  
  // Cria nova instância do FullCalendar com configurações básicas
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: false,
    locale: 'pt-br',
    buttonText: {
      today: 'Hoje',
      month: 'Mês',
      week: 'Semana',
      day: 'Dia'
    },
    eventClick: handleEventClick,
    select: handleDateSelect,
    eventDrop: handleEventMove,
    eventResize: handleEventResize, // Corrigido: único handler agora
    height: 'auto',
    contentHeight: 500,
    eventDisplay: 'block',
    eventColor: '#4a90e2',
    nowIndicator: true
  });
  
  calendar.render();
  console.log('Calendário inicializado!');
  loadEvents();
  setupModalHandlers();
}

/**
 * Manipula o clique em um evento existente
 * @param {Object} info - Dados do evento clicado
 */
function handleEventClick(info) {
  currentEvent = {
    id: info.event.id,
    title: info.event.title,
    start: info.event.start
  };
  document.getElementById('eventTitle').value = info.event.title;
  document.getElementById('modalTitle').textContent = 'Editar Evento';
  showModal();
}

/**
 * Manipula a seleção de uma nova data
 * @param {Object} info - Dados da seleção
 */
function handleDateSelect(info) {
  currentEvent = {
    start: info.start,
    end: info.end,
    allDay: info.allDay
  };
  showModal();
  calendar.unselect();
}

/**
 * Manipula o redimensionamento de eventos
 * @param {Object} info - Dados do evento redimensionado
 */
function handleEventResize(info) {
  saveEventData({
    id: info.event.id,
    title: info.event.title,
    start: info.event.start
  });
}

/**
 * Manipula o movimento de eventos
 * @param {Object} info - Dados do evento movido
 */
function handleEventMove(info) {
  saveEventData({
    id: info.event.id,
    title: info.event.title,
    start: info.event.start
  });
}

/**
 * Exibe o modal de edição de eventos
 */
function showModal() {
  const modal = document.getElementById('eventModal');
  if (modal) modal.style.display = 'block';
}

/**
 * Configura os manipuladores de eventos do modal
 */
function setupModalHandlers() {
  const modal = document.getElementById('eventModal');
  if (!modal) return;

  const closeBtn = document.getElementById('closeEventModal');
  const saveBtn = document.getElementById('saveEventBtn');
  const cancelBtn = document.getElementById('cancelEventBtn');
  const titleInput = document.getElementById('eventTitle');

  closeBtn?.addEventListener('click', () => modal.style.display = 'none');
  cancelBtn?.addEventListener('click', () => modal.style.display = 'none');
  
  window.addEventListener('click', (event) => {
    if (event.target === modal) modal.style.display = 'none';
  });

  titleInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEvent();
    }
  });

  saveBtn?.addEventListener('click', saveEvent);
}

/**
 * Valida e salva o evento (novo ou existente)
 */
function saveEvent() {
  const titleInput = document.getElementById('eventTitle');
  if (!titleInput) return;

  const title = titleInput.value.trim();
  if (!title) {
    showUserFeedback('Por favor, digite um título para o evento.', 'warning');
    return;
  }

  const eventData = {
    title: sanitizeInput(title),
    start: currentEvent.start
  };

  if (currentEvent.id) {
    eventData.id = currentEvent.id;
    updateEvent(eventData);
  } else {
    addEvent(eventData);
  }

  document.getElementById('eventModal').style.display = 'none';
}

/**
 * Adiciona um novo evento ao Firestore
 * @param {Object} eventData - Dados do evento a ser criado
 * @returns {Promise<string|null>} ID do evento criado
 */
export async function addEvent(eventData) {
  try {
    const docRef = await addDoc(eventsCollection, {
      title: eventData.title,
      start: eventData.start.toISOString()
    });
    showUserFeedback('Evento criado com sucesso!', 'success');
    return docRef.id;
  } catch (error) {
    console.error('Erro ao salvar evento:', error);
    showUserFeedback('Erro ao criar evento.', 'error');
    return null;
  }
}

/**
 * Carrega eventos do Firestore para o calendário
 */
export function loadEvents() {
  onSnapshot(eventsCollection, (snapshot) => {
    const events = [];
    snapshot.forEach((docSnap) => {
      const event = docSnap.data();
      events.push({
        id: docSnap.id,
        title: event.title,
        start: event.start
      });
    });
    
    if (calendar) {
      calendar.removeAllEvents();
      calendar.addEventSource(events);
    }
  }, (error) => {
    console.error('Erro ao carregar eventos:', error);
    showUserFeedback('Erro ao carregar eventos.', 'error');
  });
}

/**
 * Atualiza um evento existente no Firestore
 * @param {Object} eventData - Dados do evento a ser atualizado
 */
export async function updateEvent(eventData) {
  try {
    // Atualiza o evento no calendário
    await updateDoc(doc(db, 'events', eventData.id), {
      start: eventData.start.toISOString(),
      title: eventData.title
    });

    // Verifica se é uma prorrogação de contrato
    if (eventData.title.includes('Prorrogação do contrato')) {
      await registrarProrrogacaoContrato(eventData);
    }

    showUserFeedback('Evento atualizado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
    showUserFeedback('Erro ao atualizar evento.', 'error');
  }
}

async function registrarProrrogacaoContrato(eventData) {
  try {
    // Extrai o número do contrato do título do evento
    const contratoMatch = eventData.title.match(/contrato (.+)/i);
    if (!contratoMatch) return;

    const numeroContrato = contratoMatch[1];
    const dataProrrogacao = eventData.start.toISOString().split('T')[0];

    // Atualiza a coleção de contratos
    const contractsQuery = query(
      collection(db, 'contracts'),
      where('contrato', '==', numeroContrato)
    );
    
    const querySnapshot = await getDocs(contractsQuery);
    querySnapshot.forEach(async (doc) => {
      await updateDoc(doc.ref, {
        prorrogacao: dataProrrogacao,
        prorrogacaoEventId: eventData.id
      });
    });
  } catch (error) {
    console.error('Erro ao registrar prorrogação:', error);
  }
}

/**
 * Remove um evento do Firestore
 * @param {string} eventId - ID do evento a ser removido
 */
export async function deleteEvent(eventId) {
  if (!confirm('Tem certeza que deseja excluir este evento?')) return;
  
  try {
    await deleteDoc(doc(db, 'events', eventId));
    showUserFeedback('Evento excluído com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao excluir evento:', error);
    showUserFeedback('Erro ao excluir evento.', 'error');
  }
}

/**
 * Exibe feedback visual para o usuário
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo de feedback (success, error, warning)
 */
function showUserFeedback(message, type) {
  // Implementação básica - pode ser substituída por um sistema de toasts
  alert(`${type.toUpperCase()}: ${message}`);
}

/**
 * Sanitiza entradas de texto para prevenir XSS
 * @param {string} input - Texto a ser sanitizado
 * @returns {string} Texto sanitizado
 */
function sanitizeInput(input) {
  return input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Disponibiliza funções no escopo global
window.initCalendar = initCalendar;
window.addEvent = addEvent;
window.loadEvents = loadEvents;
window.updateEvent = updateEvent;
window.deleteEvent = deleteEvent;