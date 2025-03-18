// js/calendar.js

import { db } from './firebase.js';
import { collection, addDoc, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Referência para a coleção de eventos no Firestore
const eventsCollection = collection(db, 'events');

// Variáveis para manipulação do modal e do calendário
let currentEvent = null;
let calendar = null;

/**
 * Inicializa o FullCalendar e configura os manipuladores de eventos.
 */
export function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) {
    console.error('Elemento com ID "calendar" não encontrado no DOM!');
    return;
  }
  
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
    dayMaxEvents: true,
    locale: 'pt-br',
    eventClick: function(info) {
      // Ao clicar em um evento existente
      currentEvent = {
        id: info.event.id,
        title: info.event.title,
        start: info.event.start
      };
      document.getElementById('eventTitle').value = info.event.title;
      document.getElementById('modalTitle').textContent = 'Editar Evento';
      const modal = document.getElementById('eventModal');
      modal.style.display = 'block';
    },
    select: function(info) {
      // Ao selecionar uma data/horário para criar um novo evento
      currentEvent = {
        start: info.start,
        end: info.end,
        allDay: info.allDay
      };
      document.getElementById('eventTitle').value = '';
      document.getElementById('modalTitle').textContent = 'Novo Evento';
      const modal = document.getElementById('eventModal');
      modal.style.display = 'block';
      calendar.unselect();
    },
    eventDrop: function(info) {
      // Quando um evento é arrastado para uma nova data/hora
      updateEvent({
        id: info.event.id,
        title: info.event.title,
        start: info.event.start
      });
    },
    eventResize: function(info) {
      // Quando um evento é redimensionado
      updateEvent({
        id: info.event.id,
        title: info.event.title,
        start: info.event.start
      });
    }
  });
  
  calendar.render();
  console.log('Calendário inicializado!');
  
  // Configura os manipuladores do modal
  setupModalHandlers();
}

/**
 * Configura os manipuladores de eventos do modal.
 */
function setupModalHandlers() {
  const modal = document.getElementById('eventModal');
  const closeBtn = document.getElementById('closeEventModal');
  const saveBtn = document.getElementById('saveEventBtn');
  const cancelBtn = document.getElementById('cancelEventBtn');

  closeBtn.onclick = function() {
    modal.style.display = 'none';
  };
  cancelBtn.onclick = function() {
    modal.style.display = 'none';
  };
  window.onclick = function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
  saveBtn.onclick = function() {
    const title = document.getElementById('eventTitle').value;
    if (!title || title.trim() === '') {
      alert('Por favor, digite um título para o evento.');
      return;
    }
    if (currentEvent.id) {
      // Atualiza evento existente
      updateEvent({
        id: currentEvent.id,
        title: title,
        start: currentEvent.start
      });
    } else {
      // Adiciona novo evento
      addEvent(title, currentEvent.start);
    }
    modal.style.display = 'none';
  };
}

/**
 * Adiciona um novo evento ao Firestore.
 */
export async function addEvent(title, start) {
  try {
    const docRef = await addDoc(eventsCollection, {
      title,
      start: start.toISOString()
    });
    console.log('Evento salvo no Firestore! ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Erro ao salvar evento:', error);
    return null;
  }
}

/**
 * Carrega os eventos do Firestore e atualiza o calendário.
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
  }, (error) => console.error('Erro ao carregar eventos:', error));
}

/**
 * Atualiza um evento existente no Firestore.
 */
export async function updateEvent(eventData) {
  try {
    await updateDoc(doc(db, 'events', eventData.id), {
      title: eventData.title,
      start: eventData.start.toISOString()
    });
    console.log('Evento atualizado no Firestore!');
  } catch (error) {
    console.error('Erro ao atualizar evento:', error);
  }
}

// Anexa as funções ao objeto global para acesso de outros módulos
window.initCalendar = initCalendar;
window.addEvent = addEvent;
window.loadEvents = loadEvents;
window.updateEvent = updateEvent;
