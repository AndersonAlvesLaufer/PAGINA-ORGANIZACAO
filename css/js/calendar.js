// js/calendar.js

import { db } from './firebase.js';
import {
    collection, addDoc, onSnapshot, updateDoc, doc, deleteDoc, serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { showNotification, showSpinner, hideSpinner, openModal, closeModal } from './utils.js';

// Referências
const eventsCollection = collection(db, 'events');
const CALENDAR_EL_ID = 'calendar';
const MODAL_ID = 'eventModal';
const SPINNER_ID = 'calendarSpinner';
const MODAL_SPINNER_ID = 'eventModalSpinner';

// Estado
let calendarInstance = null;
let currentEditingEvent = null;
let unsubscribeCalendar = null;

// --- Funções Auxiliares ---
function resetEventModal() { /* ... (mantido igual) ... */ const form = document.getElementById(MODAL_ID); if (!form) return; form.querySelector('#modalTitle').textContent = 'Novo Evento'; form.querySelector('#eventTitleInput').value = ''; form.querySelector('#eventDescriptionInput').value = ''; form.querySelector('#eventLocationInput').value = ''; form.querySelector('#deleteEventBtn').style.display = 'none'; currentEditingEvent = null; }
function populateEventModal(eventData) { /* ... (mantido igual) ... */ const form = document.getElementById(MODAL_ID); if (!form) return; const startDate = (eventData.start instanceof Date) ? eventData.start : new Date(eventData.start); form.querySelector('#modalTitle').textContent = 'Editar Evento'; form.querySelector('#eventTitleInput').value = eventData.title || ''; form.querySelector('#eventDescriptionInput').value = eventData.extendedProps?.description || ''; form.querySelector('#eventLocationInput').value = eventData.extendedProps?.location || ''; form.querySelector('#deleteEventBtn').style.display = 'inline-block'; currentEditingEvent = { id: eventData.id, start: startDate, end: eventData.end, allDay: eventData.allDay, title: eventData.title, extendedProps: eventData.extendedProps || {} }; }

// --- Manipuladores de Eventos do FullCalendar ---
function handleEventClick(info) { populateEventModal(info.event); openModal(MODAL_ID); }
function handleDateSelect(info) { resetEventModal(); currentEditingEvent = { start: info.start, end: info.end, allDay: info.allDay }; openModal(MODAL_ID); if(calendarInstance) calendarInstance.unselect(); }
async function handleEventDrop(info) { const event = info.event; const eventData = { id: event.id, title: event.title, start: event.start, end: event.end, allDay: event.allDay, extendedProps: event.extendedProps }; await saveEventData(eventData, true); }
async function handleEventResize(info) { const event = info.event; const eventData = { id: event.id, title: event.title, start: event.start, end: event.end, allDay: event.allDay, extendedProps: event.extendedProps }; await saveEventData(eventData, true); }

// --- Funções de Manipulação de Dados (Firestore) ---
async function saveEventFromModal() {
    const form = document.getElementById(MODAL_ID);
    const titleInput = form?.querySelector('#eventTitleInput');
    const descriptionInput = form?.querySelector('#eventDescriptionInput');
    const locationInput = form?.querySelector('#eventLocationInput');

    // CORRIGIDO: Garante que currentEditingEvent existe e tem start/end
    if (!titleInput || !descriptionInput || !locationInput || !currentEditingEvent || !currentEditingEvent.start) {
        showNotification('Erro interno ou dados de data ausentes.', 'error');
        return;
    }
    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();
    const location = locationInput.value.trim();
    if (!title) { showNotification('Título obrigatório.', 'warning'); titleInput.focus(); return; }

    const isUpdate = !!currentEditingEvent.id;
    const eventDataToSave = {
        id: currentEditingEvent.id,
        title: title,
        // Usa as datas que foram definidas ao selecionar ou ao carregar evento existente
        start: currentEditingEvent.start,
        end: currentEditingEvent.end,
        allDay: currentEditingEvent.allDay,
        extendedProps: { ...(currentEditingEvent.extendedProps || {}), description: description, location: location }
    };

    // Fecha o modal ANTES de iniciar a operação assíncrona
    closeModal(MODAL_ID);
    // Salva e aguarda o resultado (ou erro)
    await saveEventData(eventDataToSave, isUpdate);
}

async function saveEventData(eventData, isUpdate) {
    const spinnerContainer = MODAL_SPINNER_ID; // Sempre usar spinner do modal neste fluxo
    showSpinner(spinnerContainer);

    let startISO = null, endISO = null;
    try { startISO = eventData.start ? new Date(eventData.start).toISOString() : null; } catch { /* ignora */ }
    try { endISO = eventData.end ? new Date(eventData.end).toISOString() : null; } catch { /* ignora */ }
    if (!startISO) { hideSpinner(spinnerContainer); showNotification('Data início inválida.', 'error'); return null; }

    const dataForFirestore = {
        title: eventData.title, start: startISO, end: endISO, allDay: eventData.allDay,
        extendedProps: eventData.extendedProps || {}, updatedAt: serverTimestamp()
    };

    try {
        let result = null;
        if (isUpdate && eventData.id) {
            await updateDoc(doc(db, 'events', eventData.id), dataForFirestore);
            showNotification('Evento atualizado!', 'success');
            result = { ...eventData };
        } else {
            dataForFirestore.createdAt = serverTimestamp();
            const docRef = await addDoc(eventsCollection, dataForFirestore);
            showNotification('Evento criado!', 'success');
            result = { id: docRef.id, ...eventData }; // Inclui ID retornado
        }
        hideSpinner(spinnerContainer); // Esconde spinner SÓ no sucesso
        return result; // Retorna dados do evento
    } catch (error) {
        hideSpinner(spinnerContainer); // Esconde spinner no erro também
        console.error(`Erro ${isUpdate ? 'atualizar' : 'criar'} evento:`, error);
        showNotification(`Erro: ${error.message}`, 'error');
        return null; // Retorna null no erro
    }
}

export async function deleteCalendarEvent(eventId, confirmDeletion = true) {
     // ... (código mantido igual, já usava confirmação e spinner) ...
     if (!eventId) return;
     if (confirmDeletion && !confirm('Excluir este evento?')) return;
     const spinnerContainer = document.getElementById(MODAL_ID)?.style.display === 'block' ? MODAL_SPINNER_ID : SPINNER_ID;
     showSpinner(spinnerContainer);
     try { await deleteDoc(doc(db, 'events', eventId)); showNotification('Evento excluído!', 'success'); closeModal(MODAL_ID); }
     catch (error) { console.error('Erro excluir evento:', error); showNotification(`Erro: ${error.message}`, 'error'); }
     finally { hideSpinner(spinnerContainer); }
}

function loadCalendarEvents() { /* ... (mantido igual) ... */ if (!calendarInstance) return; showSpinner(SPINNER_ID); if (unsubscribeCalendar) unsubscribeCalendar(); const q = query(eventsCollection, orderBy("createdAt", "desc")); unsubscribeCalendar = onSnapshot(q, (snapshot) => { hideSpinner(SPINNER_ID); const source = calendarInstance.getEventSourceById('firestoreEvents'); if (source) source.remove(); const events = snapshot.docs.map(docSnap => { const data = docSnap.data(); return { id: docSnap.id, title: data.title, start: data.start, end: data.end, allDay: data.allDay, extendedProps: data.extendedProps || {} }; }); calendarInstance.addEventSource({ id: 'firestoreEvents', events: events }); }, (error) => { hideSpinner(SPINNER_ID); console.error('Erro carregar eventos:', error); showNotification(`Erro: ${error.message}`, 'error'); }); }

// --- Inicialização ---
export function initCalendar() {
    const calendarEl = document.getElementById(CALENDAR_EL_ID); const modal = document.getElementById(MODAL_ID);
    if (!calendarEl || !modal) { console.error('Calendário ou modal não encontrado.'); return; }
    calendarInstance = new FullCalendar.Calendar(calendarEl, { /* ... (opções mantidas iguais) ... */ locale: 'pt-br', headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }, buttonText: { today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', list: 'Lista' }, initialView: 'dayGridMonth', navLinks: true, editable: true, selectable: true, selectMirror: true, dayMaxEvents: true, nowIndicator: true, height: 'auto', select: handleDateSelect, eventClick: handleEventClick, eventDrop: handleEventDrop, eventResize: handleEventResize });
    calendarInstance.render(); console.log('FullCalendar inicializado!');
    loadCalendarEvents();

    // Listeners do modal (CORRIGIDO: Verificações adicionadas)
    modal.querySelector('#saveEventBtn')?.addEventListener('click', saveEventFromModal); // Chama função correta
    modal.querySelector('#cancelEventBtn')?.addEventListener('click', () => closeModal(MODAL_ID));
    modal.querySelector('#closeEventModal')?.addEventListener('click', () => closeModal(MODAL_ID));
    modal.querySelector('#deleteEventBtn')?.addEventListener('click', () => { if (currentEditingEvent?.id) deleteCalendarEvent(currentEditingEvent.id, true); });
    modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(MODAL_ID); });

    // Anexa funções ao window para contracts.js
    window.addCalendarEvent = (data) => saveEventData(data, false);
    window.updateCalendarEvent = (data) => saveEventData(data, true);
    window.deleteCalendarEvent = deleteCalendarEvent;
    console.log('Módulo de Calendário inicializado.');
}
window.addEventListener('beforeunload', () => { if (unsubscribeCalendar) unsubscribeCalendar(); });