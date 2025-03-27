// js/calendarTable.js
import { db } from './firebase.js';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const eventsCollection = collection(db, 'events');
let originalEvents = new Map();

export function loadCalendarEvents() {
  const tbody = document.querySelector('#calendarEventsTable tbody');
  if (!tbody) return;
  
  onSnapshot(eventsCollection, (snapshot) => {
    const fragment = document.createDocumentFragment();
    const currentIds = new Set();
    
    snapshot.forEach(docSnap => {
      const event = docSnap.data();
      event.id = docSnap.id;
      currentIds.add(event.id);
      
      const existingRow = tbody.querySelector(`tr[data-id="${event.id}"]`);
      
      if (existingRow) {
        updateEventRow(existingRow, event);
      } else {
        const newRow = createEventRow(event);
        newRow.classList.add('event-highlight');
        fragment.appendChild(newRow);
        setTimeout(() => newRow.classList.remove('event-highlight'), 1500);
      }
      
      originalEvents.set(event.id, {
        title: event.title || '',
        start: event.start || '',
        end: event.end || '',
        description: event.description || ''
      });
    });
    
    // Remove linhas de eventos deletados
    document.querySelectorAll('#calendarEventsTable tr[data-id]').forEach(row => {
      if (!currentIds.has(row.getAttribute('data-id'))) {
        row.remove();
        originalEvents.delete(row.getAttribute('data-id'));
      }
    });
    
    if (fragment.hasChildNodes()) {
      tbody.appendChild(fragment);
    }
  }, error => {
    showUserFeedback('Erro ao carregar eventos da tabela', 'error');
    console.error('Erro ao carregar eventos da tabela:', error);
  });
}

function createEventRow(event) {
  const tr = document.createElement('tr');
  tr.className = 'event-row';
  tr.setAttribute('data-id', event.id);
  
  const cells = [
    { value: event.title || '', class: 'event-title' },
    { value: event.start ? new Date(event.start).toISOString().slice(0,16) : '', class: 'event-start' },
    { value: event.end ? new Date(event.end).toISOString().slice(0,16) : '', class: 'event-end' },
    { value: event.description || '', class: 'event-description' }
  ];
  
  cells.forEach((cell, index) => {
    const td = document.createElement('td');
    td.className = `event-cell ${cell.class}`;
    td.contentEditable = true;
    td.textContent = cell.value;
    
    td.addEventListener('input', () => {
      tr.classList.add('event-modified');
    });
    
    tr.appendChild(td);
  });
  
  const tdActions = document.createElement('td');
  tdActions.className = 'event-actions';
  
  const btnDelete = document.createElement('button');
  btnDelete.className = 'delete-btn';
  btnDelete.textContent = 'Excluir';
  btnDelete.title = 'Remover evento';
  btnDelete.addEventListener('click', () => {
    removeCalendarEvent(event.id);
  });
  
  tdActions.appendChild(btnDelete);
  tr.appendChild(tdActions);
  
  return tr;
}

function updateEventRow(row, event) {
  const cells = row.querySelectorAll('.event-cell');
  
  const newValues = [
    event.title || '',
    event.start ? new Date(event.start).toISOString().slice(0,16) : '',
    event.end ? new Date(event.end).toISOString().slice(0,16) : '',
    event.description || ''
  ];
  
  cells.forEach((cell, index) => {
    if (cell.textContent !== newValues[index]) {
      cell.textContent = newValues[index];
    }
  });
  
  const original = originalEvents.get(event.id);
  if (original && (
      original.title !== (event.title || '') ||
      original.start !== (event.start || '') ||
      original.end !== (event.end || '') ||
      original.description !== (event.description || '')
  )) {
    row.classList.add('event-modified');
  } else {
    row.classList.remove('event-modified');
  }
}

export async function saveCalendarTableData() {
  const tbody = document.querySelector('#calendarEventsTable tbody');
  if (!tbody) return;
  
  const rows = tbody.querySelectorAll('tr.event-modified');
  if (rows.length === 0) {
    showUserFeedback('Nenhuma alteração para salvar', 'info');
    return;
  }
  
  const promises = Array.from(rows).map(async (row) => {
    const id = row.getAttribute('data-id');
    if (!id) return;
    
    const cells = row.querySelectorAll('.event-cell');
    const updatedData = {
      title: cells[0].textContent.trim(),
      start: cells[1].textContent.trim(),
      end: cells[2].textContent.trim(),
      description: cells[3].textContent.trim()
    };
    
    try {
      await setDoc(doc(db, 'events', id), updatedData, { merge: true });
      row.classList.remove('event-modified');
      originalEvents.set(id, updatedData);
      return { success: true, id };
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      return { success: false, id, error };
    }
  });
  
  const results = await Promise.all(promises);
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.length - successCount;
  
  if (errorCount > 0) {
    showUserFeedback(`${successCount} eventos salvos, ${errorCount} falhas`, 'warning');
  } else {
    showUserFeedback(`${successCount} eventos salvos com sucesso!`, 'success');
  }
}

export async function removeCalendarEvent(eventId) {
  if (!confirm('Tem certeza que deseja excluir este evento?')) return;
  
  try {
    await deleteDoc(doc(db, 'events', eventId));
    showUserFeedback('Evento removido com sucesso', 'success');
  } catch (error) {
    console.error('Erro ao remover evento:', error);
    showUserFeedback('Erro ao remover evento', 'error');
  }
}

function showUserFeedback(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  const notificationArea = document.getElementById('notificationArea') || document.body;
  notificationArea.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  loadCalendarEvents();
  
  document.getElementById('saveEventsBtn')?.addEventListener('click', saveCalendarTableData);
});