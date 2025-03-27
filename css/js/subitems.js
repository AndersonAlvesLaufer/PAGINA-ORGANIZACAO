// js/subitems.js

import { db } from './firebase.js';
import {
    collection, addDoc, deleteDoc, onSnapshot, query, where, orderBy, writeBatch, getDocs, doc, serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { showNotification, showSpinner, hideSpinner, openModal, closeModal } from './utils.js';

// Referências
const subitemsCollection = collection(db, 'subitems');
const SUBITEM_MODAL_ID = 'subitemModal';

// Estado
const activeSubitemListeners = {};

// --- Funções Auxiliares ---
function createSubitemElement(item) {
    const li = document.createElement('li');
    li.dataset.id = item.id;
    li.dataset.categoryId = item.categoryId;

    let link = item.link;
    if (link && !/^https?:\/\//i.test(link) && !link.startsWith('onedrive://')) {
        link = "https://" + link;
    }

    li.innerHTML = `
      <a href="${link || '#'}" target="_blank" rel="noopener noreferrer" title="Abrir ${item.name || 'link'} em nova aba">
         <i class="fas fa-link fa-xs" aria-hidden="true"></i>
         <span class="subitem-name">${item.name || '(Sem Nome)'}</span>
      </a>
      <div class="subitem-actions">
          <button class="edit-subitem-btn btn btn-secondary btn-small" title="Editar subitem" aria-label="Editar ${item.name || ''}">
              <i class="fas fa-pencil-alt fa-xs"></i>
          </button>
          <button class="remove-subitem-btn btn btn-danger btn-small" data-name="${item.name || ''}" title="Remover subitem" aria-label="Remover ${item.name || ''}">
            <i class="fas fa-times fa-xs"></i>
          </button>
      </div>
    `;

    li.querySelector('.remove-subitem-btn')?.addEventListener('click', (e) => {
        e.stopPropagation(); removeSubitem(item.id, item.name, item.categoryId);
    });
    li.querySelector('.edit-subitem-btn')?.addEventListener('click', (e) => {
        e.stopPropagation(); openSubitemModal(item.categoryId, item);
    });
    return li;
}

function getSpinnerIdForCategory(categoryId) { const listDiv = document.querySelector(`.subitems-list[data-category-id="${categoryId}"]`); const spinner = listDiv?.querySelector('.subitem-spinner'); return spinner?.id || null; }

// --- Funções de Manipulação de Dados ---
export function openSubitemModal(categoryId, subitemData = null) {
    const modal = document.getElementById(SUBITEM_MODAL_ID); if (!modal || !categoryId) { console.error("Modal ou CategoryId ausente."); return; }
    const nameInput = modal.querySelector('#subitemNameInput');
    const urlInput = modal.querySelector('#subitemUrlInput');

    console.log("Abrindo modal para:", { categoryId, subitemData }); // LOGGING

    modal.querySelector('#subitemCategoryId').value = categoryId;
    modal.querySelector('#subitemId').value = subitemData?.id || '';
    if (nameInput) nameInput.value = subitemData?.name || ''; // Preenche input
    if (urlInput) urlInput.value = subitemData?.link || ''; // Preenche input
    modal.querySelector('#subitemModalTitle').textContent = subitemData ? 'Editar Subitem' : 'Adicionar Subitem';
    openModal(SUBITEM_MODAL_ID);
}

async function saveSubitem() {
    const modal = document.getElementById(SUBITEM_MODAL_ID); if (!modal) return;
    const categoryId = modal.querySelector('#subitemCategoryId').value;
    const subitemId = modal.querySelector('#subitemId').value;
    const nameInput = modal.querySelector('#subitemNameInput');
    const urlInput = modal.querySelector('#subitemUrlInput');
    const name = nameInput?.value.trim();
    let link = urlInput?.value.trim();

    console.log("Tentando salvar subitem com valores do modal:", { categoryId, subitemId, name, link }); // LOGGING

    if (!name || !link) { showNotification('Nome e URL obrigatórios.', 'warning'); return; }
    if (!categoryId) { showNotification('Erro: ID categoria não encontrado.', 'error'); return; }

    try {
        if (!link.startsWith('onedrive://') && !/^https?:\/\//i.test(link)) link = 'https://' + link;
        if (!link.startsWith('onedrive://')) new URL(link); // Valida
        console.log("URL final validada/corrigida:", link); // LOGGING
    } catch (_) { showNotification('URL inválida.', 'warning'); return; }

    const spinnerId = 'subitemModalSpinner'; showSpinner(spinnerId);
    const subitemData = { categoryId, name, link, updatedAt: serverTimestamp() }; // Objeto a ser salvo
    console.log("Dados FINAIS para Firestore:", subitemData); // LOGGING

    try {
        if (subitemId) { // UPDATE
            console.log("Executando UPDATE no subitem:", subitemId);
            await updateDoc(doc(db, 'subitems', subitemId), subitemData);
            showNotification('Subitem atualizado!', 'success');
        } else { // ADD
            console.log("Executando ADD no subitem");
            await addDoc(subitemsCollection, { ...subitemData, createdAt: serverTimestamp() });
            showNotification('Subitem adicionado!', 'success');
        }
        closeModal(SUBITEM_MODAL_ID);
    } catch (error) {
        console.error('Erro ao salvar subitem:', error); showNotification(`Erro: ${error.message}`, 'error');
    } finally { hideSpinner(spinnerId); }
}

async function removeSubitem(subitemId, subitemName, categoryId) { /* ... (lógica mantida igual) ... */ if (!subitemId) return; if (!confirm(`Remover "${subitemName}"?`)) return; const spinnerId = getSpinnerIdForCategory(categoryId); if (spinnerId) showSpinner(spinnerId); try { await deleteDoc(doc(db, 'subitems', subitemId)); showNotification('Subitem removido.', 'success'); } catch (error) { console.error('Erro remover subitem:', error); showNotification(`Erro: ${error.message}`, 'error'); } finally { if (spinnerId) hideSpinner(spinnerId); } }
export async function removeSubitemsForCategory(categoryId) { /* ... (lógica mantida igual) ... */ if (!categoryId) return; console.log(`Removendo subitens para ${categoryId}`); try { const q = query(subitemsCollection, where("categoryId", "==", categoryId)); const snapshot = await getDocs(q); if (!snapshot.empty) { const batch = writeBatch(db); snapshot.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit(); console.log(`${snapshot.size} subitem(s) removidos.`); } else { console.log('Nenhum subitem a remover.'); } } catch (error) { console.error(`Erro remover subitens da cat ${categoryId}:`, error); throw new Error(`Falha remover subitens: ${error.message}`); } }

// --- Renderização e Listeners ---
export function initSubitemsForCategory(categoryId) {
    const subitemsListDiv = document.querySelector(`.subitems-list[data-category-id="${categoryId}"]`); if (!subitemsListDiv) return;
    const ulElement = subitemsListDiv.querySelector('.subitems-ul');
    const spinnerElement = subitemsListDiv.querySelector('.subitem-spinner');
    if (!ulElement || !spinnerElement) { console.error(`Estrutura subitens inválida ${categoryId}`); return; }
    if (!spinnerElement.id) spinnerElement.id = `subitem-spinner-${categoryId}`;
    const spinnerId = spinnerElement.id;

    if (activeSubitemListeners[categoryId]) { activeSubitemListeners[categoryId](); delete activeSubitemListeners[categoryId]; }
    showSpinner(spinnerId); ulElement.innerHTML = '';

    // A query que causa o erro de índice
    const q = query(subitemsCollection, where("categoryId", "==", categoryId), orderBy("createdAt", "desc"));

    activeSubitemListeners[categoryId] = onSnapshot(q, (snapshot) => {
        hideSpinner(spinnerId); ulElement.innerHTML = '';
        if (snapshot.empty) {
            ulElement.innerHTML = '<li class="empty-message">Nenhum subitem.</li>';
        } else {
            snapshot.forEach((docSnap) => ulElement.appendChild(
                // Passa categoryId para createSubitemElement explicitamente
                createSubitemElement({ id: docSnap.id, ...docSnap.data(), categoryId: categoryId })
            ));
        }
    }, (error) => {
        hideSpinner(spinnerId);
        // O erro de índice aparecerá aqui primeiro
        console.error(`Erro carregar subitens ${categoryId}:`, error); // LOGGING
        // Mostra o erro específico do Firestore se for o caso
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
             ulElement.innerHTML = `<li class="error-message">Erro: Índice do Firestore necessário. Veja console (F12).</li>`;
             showNotification("Erro ao carregar subitens: Índice do banco de dados ausente. Veja o console (F12) para o link de criação.", "error", 15000);
        } else {
             ulElement.innerHTML = '<li class="error-message">Erro ao carregar.</li>';
             showNotification(`Erro ao carregar subitens: ${error.message}`, 'error');
        }
    });
}
function initSubitems() { /* ... (lógica mantida igual) ... */ const subitemModal = document.getElementById(SUBITEM_MODAL_ID); if (!subitemModal) { console.error('Modal subitem não encontrado!'); return; } subitemModal.querySelector('#saveSubitemBtn')?.addEventListener('click', saveSubitem); subitemModal.querySelector('#cancelSubitemBtn')?.addEventListener('click', () => closeModal(SUBITEM_MODAL_ID)); subitemModal.querySelector('#closeSubitemModal')?.addEventListener('click', () => closeModal(SUBITEM_MODAL_ID)); subitemModal.addEventListener('click', (event) => { if (event.target === subitemModal) closeModal(SUBITEM_MODAL_ID); }); window.openSubitemModal = openSubitemModal; console.log('Módulo Subitens (Modal) inicializado.'); }
document.addEventListener('DOMContentLoaded', initSubitems);
window.addEventListener('beforeunload', () => { Object.values(activeSubitemListeners).forEach(unsub => unsub && unsub()); });