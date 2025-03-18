// js/calendarTable.js

import { db } from './firebase.js';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const eventsCollection = collection(db, 'events');

window.loadCalendarEvents = function loadCalendarEvents() {
  const tbody = document.querySelector('#calendarEventsTable tbody');
  if (!tbody) return;
  
  onSnapshot(eventsCollection, (snapshot) => {
    tbody.innerHTML = '';
    snapshot.forEach(docSnap => {
      const event = docSnap.data();
      event.id = docSnap.id;
      const tr = document.createElement('tr');
      
      const tdTitle = document.createElement('td');
      tdTitle.contentEditable = true;
      tdTitle.innerText = event.title || '';
      tdTitle.style.padding = '10px';
      tdTitle.style.border = '1px solid #ddd';
      tr.appendChild(tdTitle);
      
      const tdStart = document.createElement('td');
      tdStart.contentEditable = true;
      tdStart.innerText = event.start ? new Date(event.start).toISOString().slice(0,16) : '';
      tdStart.style.padding = '10px';
      tdStart.style.border = '1px solid #ddd';
      tr.appendChild(tdStart);
      
      const tdEnd = document.createElement('td');
      tdEnd.contentEditable = true;
      tdEnd.innerText = event.end ? new Date(event.end).toISOString().slice(0,16) : '';
      tdEnd.style.padding = '10px';
      tdEnd.style.border = '1px solid #ddd';
      tr.appendChild(tdEnd);
      
      const tdDesc = document.createElement('td');
      tdDesc.contentEditable = true;
      tdDesc.innerText = event.description || '';
      tdDesc.style.padding = '10px';
      tdDesc.style.border = '1px solid #ddd';
      tr.appendChild(tdDesc);
      
      const tdActions = document.createElement('td');
      tdActions.style.padding = '10px';
      tdActions.style.border = '1px solid #ddd';
      const btnDelete = document.createElement('button');
      btnDelete.innerText = 'X';
      btnDelete.style.color = 'red';
      btnDelete.style.border = 'none';
      btnDelete.style.background = 'transparent';
      btnDelete.style.cursor = 'pointer';
      btnDelete.style.fontSize = '12px';
      btnDelete.addEventListener('click', () => {
         removeCalendarEvent(event.id);
      });
      tdActions.appendChild(btnDelete);
      tr.appendChild(tdActions);
      
      tr.setAttribute('data-id', event.id);
      tbody.appendChild(tr);
    });
  }, error => {
    console.error('Erro ao carregar eventos da tabela:', error);
  });
};

window.saveCalendarTableData = function saveCalendarTableData() {
  const tbody = document.querySelector('#calendarEventsTable tbody');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(async (row) => {
    const id = row.getAttribute('data-id');
    if (!id) return;
    const cells = row.querySelectorAll('td');
    const updatedData = {
      title: cells[0].innerText.trim(),
      start: cells[1].innerText.trim(),
      end: cells[2].innerText.trim(),
      description: cells[3].innerText.trim()
    };
    try {
      await setDoc(doc(db, 'events', id), updatedData, { merge: true });
      console.log('Evento atualizado:', id);
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
    }
  });
  alert('Eventos salvos com sucesso!');
};

window.removeCalendarEvent = async function removeCalendarEvent(eventId) {
  try {
    await deleteDoc(doc(db, 'events', eventId));
    console.log('Evento removido:', eventId);
  } catch (error) {
    console.error('Erro ao remover evento:', error);
  }
};
