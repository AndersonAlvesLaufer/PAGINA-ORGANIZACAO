// js/calendar.js

import { db } from './firebase.js';
import { collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const eventsCollection = collection(db, 'events');

/**
 * Adiciona um evento ao Firestore.
 */
window.addEvent = function addEvent(title, start) {
  addDoc(eventsCollection, { title, start: start.toISOString() })
    .then(() => console.log('Evento salvo no Firestore!'))
    .catch((error) => console.error('Erro ao salvar evento:', error));
};

/**
 * Carrega os eventos do Firestore e adiciona no calendário FullCalendar.
 */
window.loadEvents = function loadEvents() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) {
    console.log('Não encontrei o calendário na página!');
    return;
  }
  onSnapshot(eventsCollection, (snapshot) => {
    const events = [];
    snapshot.forEach((docSnap) => {
      const event = docSnap.data();
      events.push({
        title: event.title,
        start: event.start
      });
    });
    if (window.calendar) {
      window.calendar.removeAllEvents();
      window.calendar.addEventSource(events);
    }
  }, (error) => console.error('Erro ao carregar eventos:', error));
};

/**
 * Inicializa o FullCalendar e chama loadEvents para adicionar eventos em tempo real.
 */
window.initCalendar = function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) {
    console.log('Não encontrei o calendário!');
    return;
  }
  if (typeof FullCalendar === 'undefined') {
    console.log('FullCalendar não está carregado. Verifique o script importado.');
    return;
  }

  // Cria instância do FullCalendar
  window.calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    events: [] // Será atualizado por loadEvents()
  });
  window.calendar.render();

  // Carrega eventos do Firestore
  window.loadEvents();
};
