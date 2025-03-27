// js/contracts.js

import { db } from './firebase.js';
import {
    collection, addDoc, doc, onSnapshot, setDoc, deleteDoc, writeBatch, query, orderBy, serverTimestamp, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { showNotification, showSpinner, hideSpinner } from './utils.js';

// Referências e Estado (iguais)
const contractsCollection = collection(db, 'contracts');
const SPINNER_ID = 'contractsSpinner'; const TABLE_ID = 'editableTable'; const SAVE_BTN_ID = 'saveTableBtn';
const ADD_ROW_BTN_ID = 'addRowBtn'; const REMOVE_ROW_BTN_ID = 'removeRowBtn';
let contractsSnapshotUnsubscribe = null; let tableHasChanges = false;

// Funções Auxiliares (applyStyleToSelection, apply*, markTableAsChanged, resetTableChangeState, formatDateForInput - mantidas iguais)
function applyStyleToSelection(command, value = null) { /* ... */ const selection = window.getSelection(); if (!selection || selection.rangeCount === 0) return; const range = selection.getRangeAt(0); const parentCell = range.commonAncestorContainer.parentElement?.closest('td[contenteditable="true"]'); if (!parentCell || !document.getElementById(TABLE_ID)?.contains(parentCell)) { showNotification('Selecione texto na tabela.', 'warning'); return; } document.execCommand(command, false, value); markTableAsChanged(); }
window.applyBold = () => applyStyleToSelection('bold'); window.applyRed = () => applyStyleToSelection('foreColor', 'red'); window.applyBlue = () => applyStyleToSelection('foreColor', 'blue'); window.applyBlack = () => applyStyleToSelection('foreColor', 'black'); window.applyHighlight = () => applyStyleToSelection('hiliteColor', 'yellow'); window.removeFormatting = () => applyStyleToSelection('removeFormat');
function markTableAsChanged() { if (!tableHasChanges) { const saveBtn = document.getElementById(SAVE_BTN_ID); if (saveBtn) saveBtn.style.display = 'inline-block'; tableHasChanges = true; } }
function resetTableChangeState() { const saveBtn = document.getElementById(SAVE_BTN_ID); if (saveBtn) saveBtn.style.display = 'none'; tableHasChanges = false; }
function formatDateForInput(date) { /* ... */ if (!date) return ''; try { const d = (date instanceof Date) ? date : (date?.seconds ? new Date(date.seconds * 1000) : new Date(date + 'T00:00:00')); if (isNaN(d.getTime())) return ''; const year = d.getFullYear(); const month = `${d.getMonth() + 1}`.padStart(2, '0'); const day = `${d.getDate()}`.padStart(2, '0'); return `${year}-${month}-${day}`; } catch (e) { console.warn("Erro formatar data:", date, e); return ''; } }

// --- Funções CRUD ---
async function addRow() { /* ... (lógica mantida igual) ... */ const table = document.getElementById(TABLE_ID); const tbody = table?.querySelector('tbody'); if (!tbody) return; const newContractData = { sei: '', contrato: '', empresa: '', prorrogacao: null, pendencias: '', createdAt: serverTimestamp(), prorrogacaoEventId: null }; showSpinner(SPINNER_ID); let newRowElement = null; try { const docRef = await addDoc(contractsCollection, newContractData); newRowElement = createTableRow(docRef.id, newContractData, tbody.rows.length); tbody.appendChild(newRowElement); showNotification('Nova linha adicionada.', 'info'); markTableAsChanged(); newRowElement.querySelector('td[contenteditable="true"]')?.focus(); } catch (error) { console.error('Erro add linha:', error); showNotification(`Erro: ${error.message}`, 'error'); if (newRowElement?.parentElement) newRowElement.remove(); } finally { hideSpinner(SPINNER_ID); } }

async function removeRow(rowElement = null) {
    const table = document.getElementById(TABLE_ID); const tbody = table?.querySelector('tbody');
    if (!tbody || tbody.rows.length === 0) return;
    const rowToRemove = rowElement || tbody.rows[tbody.rows.length - 1];
    const contractId = rowToRemove.dataset.id;
    const contratoText = rowToRemove.cells[1]?.textContent || 'a última linha';
    if (!confirm(`Remover ${contratoText}?`)) return;

    showSpinner(SPINNER_ID);
    try {
        let eventIdToDelete = null;
        // CORRIGIDO: Lê o documento do Firestore PRIMEIRO para pegar o eventId
        if (contractId) {
            console.log(`Lendo contrato ${contractId} antes de deletar...`);
            try {
                const docSnap = await getDoc(doc(db, 'contracts', contractId));
                if (docSnap.exists()) {
                    eventIdToDelete = docSnap.data().prorrogacaoEventId || null;
                    console.log(`Encontrado eventId ${eventIdToDelete} no Firestore.`);
                } else { console.warn(`Contrato ${contractId} não encontrado para verificar eventId.`); }
            } catch (readError) { console.error(`Erro ao ler contrato ${contractId} antes de deletar:`, readError); }

            // Tenta deletar evento do calendário SE encontrou ID
            if (eventIdToDelete && typeof window.deleteCalendarEvent === 'function') {
                console.log(`Chamando deleteCalendarEvent para ${eventIdToDelete}`);
                try { await window.deleteCalendarEvent(eventIdToDelete, false); }
                catch (calendarError) { console.error(`Erro ao deletar evento ${eventIdToDelete}:`, calendarError); showNotification('Aviso: Falha ao remover evento no calendário.', 'warning'); }
            } else if (eventIdToDelete) { console.warn('Função deleteCalendarEvent não disponível.'); }
            else { console.log('Nenhum eventId encontrado no Firestore para remover do calendário.'); }

            // Deleta o contrato do Firestore
            console.log(`Deletando contrato ${contractId}...`);
            await deleteDoc(doc(db, 'contracts', contractId));
        } else { console.log("Removendo linha apenas do DOM."); }

        rowToRemove.remove(); // Remove do DOM
        showNotification('Linha removida.', 'success');

    } catch (error) { console.error('Erro ao remover linha/contrato:', error); showNotification(`Erro: ${error.message}`, 'error'); }
    finally { hideSpinner(SPINNER_ID); }
}

async function saveTableData() {
    const table = document.getElementById(TABLE_ID); const tbody = table?.querySelector('tbody');
    if (!tbody || !tableHasChanges) { showNotification('Nenhuma alteração.', 'info'); return; }

    showSpinner(SPINNER_ID);
    const contractBatch = writeBatch(db); // Batch APENAS para dados dos contratos
    let contractsToSaveCount = 0;
    const calendarOps = []; // { contractId, row, newDate, savedEventId, action: 'add'/'update'/'delete'/'none' }

    try {
        // 1. Ler estado atual e preparar batch de contratos + lista de ops calendário
        for (const row of tbody.rows) {
            const contractId = row.dataset.id; if (!contractId) continue;
            const cells = row.querySelectorAll('td');
            const prorrogacaoInput = cells[3]?.querySelector('input.prorroga-input');
            const newProrrogacaoValue = prorrogacaoInput?.value || null;
            const domEventId = row.dataset.eventId || null; // Event ID que *está* no DOM

            // Prepara dados do contrato (sem eventId ainda)
            const contractDataForFirestore = {
                sei: cells[0]?.innerHTML || '', contrato: cells[1]?.innerHTML || '', empresa: cells[2]?.innerHTML || '',
                prorrogacao: newProrrogacaoValue, pendencias: cells[4]?.innerHTML || '', updatedAt: serverTimestamp()
            };
            const contractDocRef = doc(db, 'contracts', contractId);
            contractBatch.set(contractDocRef, contractDataForFirestore, { merge: true });
            contractsToSaveCount++;

            // Lê o Firestore para pegar o eventId *salvo* atualmente
            let savedEventId = null;
            try {
                const docSnap = await getDoc(contractDocRef);
                savedEventId = docSnap.exists() ? (docSnap.data().prorrogacaoEventId || null) : null;
            } catch (e) { console.error(`Erro lendo contrato ${contractId}:`, e); } // Continua mesmo se falhar a leitura

            // Determina ação do calendário
            const newEventDate = newProrrogacaoValue ? new Date(newProrrogacaoValue + 'T00:00:00') : null;
            let action = 'none';
            if (newEventDate) { // Se tem data nova
                action = savedEventId ? 'update' : 'add'; // Update se já tinha evento salvo, Add se não
            } else { // Se não tem data nova
                action = savedEventId ? 'delete' : 'none'; // Delete se tinha evento salvo, None se não
            }

            // Guarda operação necessária (mesmo que seja 'none')
            calendarOps.push({ contractId, row, newDate: newEventDate, savedEventId, domEventId, action });

        } // Fim loop for rows

        // 2. Executa Batch de Contratos (sem eventId atualizado ainda)
        if (contractsToSaveCount > 0) {
            console.log(`Salvando ${contractsToSaveCount} contratos...`);
            await contractBatch.commit();
            console.log("Contratos salvos.");
        } else { console.log("Nenhum contrato para salvar."); }

        // 3. Executa Operações do Calendário e atualiza eventId no Firestore individualmente
        console.log(`Executando ${calendarOps.length} verificações/operações de calendário...`);
        const updatePromises = [];

        for (const op of calendarOps) {
            const eventTitle = `Prorrogação: ${op.row.cells[1]?.textContent.trim() || '?'} (${op.row.cells[2]?.textContent.trim() || '?'})`;
            const contractDocRef = doc(db, 'contracts', op.contractId); // Ref para update do eventId

            try {
                if (op.action === 'add' && typeof window.addCalendarEvent === 'function') {
                    const eventData = { title: eventTitle, start: op.newDate, allDay: true, extendedProps: { contractId: op.contractId } };
                    console.log(`ADD event para contrato ${op.contractId}`);
                    const newEvent = await window.addCalendarEvent(eventData);
                    if (newEvent?.id) {
                        console.log(`-> Evento ${newEvent.id} adicionado. Atualizando contrato ${op.contractId}...`);
                        op.row.dataset.eventId = newEvent.id; // Atualiza DOM
                        updatePromises.push(updateDoc(contractDocRef, { prorrogacaoEventId: newEvent.id })); // Update individual
                    }
                } else if (op.action === 'update' && typeof window.updateCalendarEvent === 'function') {
                    const eventData = { id: op.savedEventId, title: eventTitle, start: op.newDate, allDay: true, extendedProps: { contractId: op.contractId } };
                    console.log(`UPDATE event ${op.savedEventId} para contrato ${op.contractId}`);
                    await window.updateCalendarEvent(eventData);
                    // Garante que DOM tem o ID correto (normalmente já terá)
                    if (op.row.dataset.eventId !== op.savedEventId) op.row.dataset.eventId = op.savedEventId;
                } else if (op.action === 'delete' && typeof window.deleteCalendarEvent === 'function') {
                    console.log(`DELETE event ${op.savedEventId} para contrato ${op.contractId}`);
                    await window.deleteCalendarEvent(op.savedEventId, false);
                    delete op.row.dataset.eventId; // Remove do DOM
                    updatePromises.push(updateDoc(contractDocRef, { prorrogacaoEventId: null })); // Update individual
                }
                // Se action === 'none', não faz nada no calendário
            } catch (calendarError) {
                console.error(`Erro calendário (${op.action}) contrato ${op.contractId}:`, calendarError);
                showNotification(`Erro ao ${op.action} evento no calendário.`, 'warning');
            }
        }

        // 4. Aguarda todas as atualizações individuais de prorrogacaoEventId
        if (updatePromises.length > 0) {
             console.log(`Aguardando ${updatePromises.length} atualizações de prorrogacaoEventId...`);
             await Promise.all(updatePromises);
             console.log("Atualizações de prorrogacaoEventId concluídas.");
        }

        showNotification(`Dados salvos e calendário sincronizado!`, 'success');
        resetTableChangeState();

    } catch (error) {
        console.error('Erro GERAL ao salvar:', error); showNotification(`Erro GERAL: ${error.message}`, 'error');
    } finally { hideSpinner(SPINNER_ID); }
}

// createTableRow, loadContracts, initContracts, handleTableShortcuts, cleanup listener (mantidos iguais à resposta anterior)
function createTableRow(id, contract, rowIndex) { const tr = document.createElement('tr'); tr.dataset.id = id; if (contract.prorrogacaoEventId) tr.dataset.eventId = contract.prorrogacaoEventId; const createCell = (content, isEditable = false, allowHTML = false) => { const td = document.createElement('td'); if (isEditable) { td.setAttribute('contenteditable', 'true'); if (allowHTML) td.innerHTML = content || ''; else td.textContent = content || ''; td.addEventListener('input', markTableAsChanged); } else td.innerHTML = content || ''; return td; }; const tdSei = createCell(contract.sei, true, true); const tdContrato = createCell(contract.contrato, true, true); const tdEmpresa = createCell(contract.empresa, true, true); const tdProrrogacao = createCell('', false); const inputDate = document.createElement('input'); inputDate.type = 'date'; inputDate.className = 'prorroga-input'; inputDate.value = formatDateForInput(contract.prorrogacao); inputDate.addEventListener('change', markTableAsChanged); tdProrrogacao.appendChild(inputDate); const tdPendencias = createCell(contract.pendencias, true, true); const tdAcoes = createCell('', false); const btnDelete = document.createElement('button'); btnDelete.innerHTML = '<i class="fas fa-trash"></i>'; btnDelete.className = 'delete-row-btn btn btn-danger btn-small'; btnDelete.title = 'Remover'; btnDelete.addEventListener('click', () => removeRow(tr)); tdAcoes.appendChild(btnDelete); tr.append(tdSei, tdContrato, tdEmpresa, tdProrrogacao, tdPendencias, tdAcoes); return tr; }
function loadContracts() { const table = document.getElementById(TABLE_ID); const tbody = table?.querySelector('tbody'); if (!tbody) { console.error('TBODY não encontrado!'); return; } showSpinner(SPINNER_ID); if (contractsSnapshotUnsubscribe) contractsSnapshotUnsubscribe(); const q = query(contractsCollection, orderBy("createdAt", "desc")); contractsSnapshotUnsubscribe = onSnapshot(q, (snapshot) => { tbody.innerHTML = ''; if (snapshot.empty) tbody.innerHTML = `<tr><td colspan="6" class="empty-message">Nenhum contrato.</td></tr>`; else snapshot.docs.forEach((docSnap, index) => tbody.appendChild(createTableRow(docSnap.id, docSnap.data(), index))); resetTableChangeState(); hideSpinner(SPINNER_ID); }, (error) => { console.error('Erro ao carregar:', error); showNotification(`Erro: ${error.message}`, 'error'); tbody.innerHTML = `<tr><td colspan="6" class="error-message">Erro ao carregar.</td></tr>`; resetTableChangeState(); hideSpinner(SPINNER_ID); }); }
export function initContracts() { const addBtn = document.getElementById(ADD_ROW_BTN_ID); const removeLastBtn = document.getElementById(REMOVE_ROW_BTN_ID); const saveBtn = document.getElementById(SAVE_BTN_ID); const table = document.getElementById(TABLE_ID); const formatBtns = { formatBoldBtn: window.applyBold, formatRedBtn: window.applyRed, formatBlueBtn: window.applyBlue, formatBlackBtn: window.applyBlack, formatHighlightBtn: window.applyHighlight }; if (!addBtn || !removeLastBtn || !saveBtn || !table) { console.error('Elementos contratos não encontrados.'); return; } addBtn.addEventListener('click', addRow); removeLastBtn.addEventListener('click', () => removeRow()); saveBtn.addEventListener('click', saveTableData); Object.entries(formatBtns).forEach(([id, func]) => { document.getElementById(id)?.addEventListener('click', func); }); document.addEventListener('keydown', handleTableShortcuts); window.addEventListener('beforeunload', (event) => { if (tableHasChanges) { event.preventDefault(); event.returnValue = ''; } }); loadContracts(); console.log('Módulo Contratos inicializado.'); }
function handleTableShortcuts(e) { if (!document.activeElement?.closest(`#${TABLE_ID} td[contenteditable="true"]`)) return; if (e.ctrlKey || e.metaKey) { let handled = true; switch (e.key.toLowerCase()) { case 'b': window.applyBold(); break; case 'r': window.applyRed(); break; case 'k': window.applyBlack(); break; default: handled = false; } if (handled) e.preventDefault(); } }
window.addEventListener('beforeunload', () => { if (contractsSnapshotUnsubscribe) contractsSnapshotUnsubscribe(); });