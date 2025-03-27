// js/categories.js

import { db } from './firebase.js';
import {
  collection, addDoc, doc, onSnapshot, deleteDoc, updateDoc, writeBatch, query, orderBy, getDocs, where, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { showNotification, showSpinner, hideSpinner, openModal, closeModal } from './utils.js';
import { initSubitemsForCategory, removeSubitemsForCategory } from './subitems.js';

// Referências e Estado (iguais)
const categoriesCollection = collection(db, 'categories');
const SPINNER_ID = 'categoriesSpinner';
const CATEGORY_MODAL_ID = 'categoryModal';
const CATEGORY_CONTAINER_ID = 'buttonContainer';
let unsubscribeCategories = null;
let draggedItem = null;

// Categorias fixas (iguais)
const fixedCategories = [
    { id: 'card-direito', name: 'Direito', description: 'Documentos jurídicos e pareceres', link: 'https://onedrive.live.com/?id=E8E795D714B72B1C%213194&cid=E8E795D714B72B1C', fixed: true, order: 0, icon: 'fas fa-gavel', color: null, staticSubitems: [ { name: 'Vade Mecum', url: 'https://www.planalto.gov.br/ccivil_03/leis/principal.htm' }, { name: 'Jurisprudência STF', url: 'https://jurisprudencia.stf.jus.br/pages/search' } ] },
    { id: 'card-pessoal', name: 'Pessoal', description: 'Documentos e fotos pessoais', link: 'onedrive://fotos_e_documentos', fixed: true, order: 1, icon: 'fas fa-user', color: null, staticSubitems: [ { name: 'Google Drive Pessoal', url: 'https://drive.google.com' }, { name: 'Fotos Familiares', url: 'onedrive://fotos_familiares' } ] },
    { id: 'card-economia', name: 'Economia/Investimentos', description: 'Recursos financeiros', link: 'onedrive://indice_de_economia', fixed: true, order: 2, icon: 'fas fa-chart-line', color: null, staticSubitems: [ { name: 'B3', url: 'https://www.b3.com.br' }, { name: 'Banco Central', url: 'https://www.bcb.gov.br' } ] },
    { id: 'card-trabalho-tj', name: 'Trabalho-TJ', description: 'Documentos do Tribunal de Justiça', link: 'onedrive://trabalho_tj', fixed: true, order: 3, icon: 'fas fa-briefcase', color: null, staticSubitems: [ { name: 'SEI', url: 'https://sei.tjpr.jus.br/sei/' }, { name: 'Boletim Interno', url: 'https://www.tjpr.jus.br/group/guest/boletim-interno' } ] },
    { id: 'card-ferramentas', name: 'Ferramentas', description: 'Ferramentas e utilitários', link: 'onedrive://ferramentas', fixed: true, order: 4, icon: 'fas fa-tools', color: null, staticSubitems: [ { name: 'Conversor PDF', url: 'https://www.ilovepdf.com/pt' }, { name: 'Tradutor DeepL', url: 'https://www.deepl.com/translator' } ] }
];

// --- Funções Auxiliares ---
function renderStaticSubitemsHTML(staticSubitems) {
    // Adiciona botão EDITAR (desabilitado) e REMOVER (oculto) para consistência visual, mas sem funcionalidade real
    if (!staticSubitems || staticSubitems.length === 0) return '<li class="empty-message">Nenhum subitem.</li>';
    return staticSubitems.map(item => `
      <li>
        <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="Abrir ${item.name} em nova aba">
          <i class="fas fa-link fa-xs" aria-hidden="true"></i> ${item.name}
        </a>
        <div class="subitem-actions">
             <button class="edit-subitem-btn btn btn-secondary btn-small" title="Subitens fixos não podem ser editados" disabled><i class="fas fa-pencil-alt fa-xs"></i></button>
             <button class="remove-subitem-btn btn btn-danger btn-small" data-id="static-${item.name}" title="Subitens fixos não podem ser removidos" disabled style="opacity:0.5;"><i class="fas fa-times fa-xs"></i></button>
        </div>
      </li>
    `).join('');
}

function createCategoryElement(cat) {
    // ... (Lógica de criação do HTML base igual, mas atenção ao botão addSubitemBtn) ...
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category';
    categoryDiv.dataset.id = cat.id;
    categoryDiv.draggable = !cat.fixed;
    if (cat.pinned && !cat.fixed) categoryDiv.classList.add('pinned');
    if (cat.color) categoryDiv.style.backgroundColor = cat.color;
    const mainLinkHTML = cat.link ? `<a href="${cat.link}" target="_blank" class="category-main-link" rel="noopener noreferrer">Acessar Documentos</a>` : '';
    const iconHTML = `<i class="${cat.icon || 'fas fa-folder'} category-icon" aria-hidden="true"></i>`;

    // Botão Adicionar Subitem com title claro e disabled se for fixa
    const addSubitemButtonHTML = `
      <button
        class="add-subitem-btn btn btn-secondary btn-small"
        title="${cat.fixed ? 'Subitens estáticos não podem ser adicionados ou editados aqui' : 'Adicionar subitem'}"
        aria-label="Adicionar subitem"
        ${cat.fixed ? 'disabled' : ''}>
         <i class="fas fa-plus"></i> Adicionar Subitem
      </button>`;

    categoryDiv.innerHTML = `
      <div class="category-header">
        <h3>${iconHTML} ${cat.name}</h3>
        <div class="category-actions">
           ${!cat.fixed ? `
             <button class="btn-pin btn btn-small" title="${cat.pinned ? 'Desafixar' : 'Fixar'} categoria" aria-label="${cat.pinned ? 'Desafixar' : 'Fixar'} categoria"><i class="fas fa-thumbtack"></i></button>
             <button class="btn-edit btn btn-small" title="Editar categoria" aria-label="Editar categoria"><i class="fas fa-pencil-alt"></i></button>
             <button class="btn-remove-category btn btn-small" title="Remover categoria" aria-label="Remover categoria"><i class="fas fa-times"></i></button>
             ` : ''}
        </div>
      </div>
      <p>${cat.description || 'Sem descrição'}</p>
      ${mainLinkHTML}
      <div class="subitems-list" data-category-id="${cat.id}">
        <ul class="subitems-ul">
           ${cat.fixed ? renderStaticSubitemsHTML(cat.staticSubitems) : '<li class="empty-message">Carregando...</li>'}
        </ul>
         <div class="spinner-container subitem-spinner" style="display: none;"><div class="spinner"></div></div>
      </div>
      ${addSubitemButtonHTML}
    `;

    // Adiciona Listeners (igual à versão anterior, garantindo que só adicione para !cat.fixed)
    if (!cat.fixed) {
        const pinBtn = categoryDiv.querySelector('.btn-pin');
        const editBtn = categoryDiv.querySelector('.btn-edit');
        const removeBtn = categoryDiv.querySelector('.btn-remove-category');
        const addSubitemBtn = categoryDiv.querySelector('.add-subitem-btn');

        if(pinBtn) pinBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePin(cat.id, categoryDiv); });
        if(editBtn) editBtn.addEventListener('click', (e) => { e.stopPropagation(); openCategoryModal(cat); });
        if(removeBtn) removeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeCategory(cat.id, cat.name); });
        if(addSubitemBtn && !addSubitemBtn.disabled) {
            addSubitemBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof window.openSubitemModal === 'function') {
                    window.openSubitemModal(cat.id);
                } else { showNotification('Erro: Função add subitem indisponível.', 'error'); }
            });
        }
        categoryDiv.addEventListener('dragstart', handleDragStart);
        categoryDiv.addEventListener('dragend', handleDragEnd);
    }
    return categoryDiv;
}

function renderCategories(dynamicCats = []) {
    // ... (lógica mantida igual) ...
    const container = document.getElementById(CATEGORY_CONTAINER_ID); if (!container) return; const addBtn = document.getElementById('addCategoryBtn'); container.innerHTML = ''; if (addBtn) container.appendChild(addBtn); fixedCategories.sort((a, b) => a.order - b.order); dynamicCats.sort((a, b) => { if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; return (a.order || 0) - (b.order || 0); }); const allCats = [...fixedCategories, ...dynamicCats]; allCats.forEach(cat => { const element = createCategoryElement(cat); container.appendChild(element); if (!cat.fixed && typeof initSubitemsForCategory === 'function') initSubitemsForCategory(cat.id); }); if (container.childElementCount <= 1) { const emptyMsg = document.createElement('p'); emptyMsg.textContent = "Nenhuma categoria dinâmica. Clique '+' para adicionar."; emptyMsg.className = 'empty-grid-message'; container.appendChild(emptyMsg); }
}

// --- Funções de Manipulação de Dados (Firestore) ---
function openCategoryModal(categoryData = null) {
    // ... (lógica mantida igual) ...
    const modal = document.getElementById(CATEGORY_MODAL_ID); if (!modal) return; modal.querySelector('#categoryId').value = categoryData?.id || ''; modal.querySelector('#categoryNameInput').value = categoryData?.name || ''; modal.querySelector('#categoryDescriptionInput').value = categoryData?.description || ''; modal.querySelector('#categoryLinkInput').value = categoryData?.link || ''; modal.querySelector('#categoryModalTitle').textContent = categoryData ? 'Editar Categoria' : 'Nova Categoria'; openModal(CATEGORY_MODAL_ID);
}

async function saveCategory() {
    const modal = document.getElementById(CATEGORY_MODAL_ID); if (!modal) return;
    const categoryId = modal.querySelector('#categoryId').value;
    const name = modal.querySelector('#categoryNameInput').value.trim();
    const description = modal.querySelector('#categoryDescriptionInput').value.trim();
    const link = modal.querySelector('#categoryLinkInput').value.trim(); // Leitura correta
    if (!name) { showNotification('Nome obrigatório.', 'warning'); return; }

    const spinnerId = 'categoryModalSpinner'; showSpinner(spinnerId);

    // CORRIGIDO: Garante que 'link' está no objeto
    const categoryData = {
        name, description, link: link || null, // Salva link ou null
        fixed: false, updatedAt: serverTimestamp()
    };
    console.log("Salvando categoria com dados:", categoryData); // LOGGING

    try {
        if (categoryId) {
            console.log("Atualizando doc:", categoryId);
            await updateDoc(doc(db, 'categories', categoryId), categoryData);
            showNotification('Categoria atualizada!', 'success');
        } else {
            console.log("Adicionando novo doc");
            const finalData = { ...categoryData, pinned: false, order: Date.now(), createdAt: serverTimestamp() };
            console.log("Dados finais para addDoc:", finalData);
            await addDoc(categoriesCollection, finalData);
            showNotification('Categoria adicionada!', 'success');
        }
        closeModal(CATEGORY_MODAL_ID);
    } catch (error) {
        console.error('Erro salvar categoria:', error); showNotification(`Erro: ${error.message}`, 'error');
    } finally { hideSpinner(spinnerId); }
}

async function removeCategory(categoryId, categoryName) { /* ... (lógica mantida igual) ... */ if (!categoryId || fixedCategories.some(cat => cat.id === categoryId)) return; if (!confirm(`Remover "${categoryName}" e subitens?`)) return; showSpinner(SPINNER_ID); try { await removeSubitemsForCategory(categoryId); await deleteDoc(doc(db, 'categories', categoryId)); showNotification('Categoria removida!', 'success'); } catch (error) { console.error('Erro remover categoria:', error); showNotification(`Erro: ${error.message}`, 'error'); } finally { hideSpinner(SPINNER_ID); } }
async function togglePin(categoryId, categoryElement) { /* ... (lógica mantida igual) ... */ if (!categoryId || !categoryElement) return; const isCurrentlyPinned = categoryElement.classList.contains('pinned'); const newPinnedStatus = !isCurrentlyPinned; categoryElement.classList.toggle('pinned', newPinnedStatus); const pinBtn = categoryElement.querySelector('.btn-pin'); if (pinBtn) { pinBtn.setAttribute('title', newPinnedStatus ? 'Desafixar' : 'Fixar'); pinBtn.querySelector('i')?.classList.toggle('pinned-icon', newPinnedStatus); } try { await updateDoc(doc(db, 'categories', categoryId), { pinned: newPinnedStatus }); showNotification(`Categoria ${newPinnedStatus ? 'fixada' : 'desafixada'}.`, 'info'); } catch (error) { console.error('Erro toggle pin:', error); showNotification('Erro.', 'error'); categoryElement.classList.toggle('pinned', isCurrentlyPinned); if (pinBtn) { pinBtn.setAttribute('title', isCurrentlyPinned ? 'Desafixar' : 'Fixar'); pinBtn.querySelector('i')?.classList.toggle('pinned-icon', isCurrentlyPinned); } } }

// --- Drag & Drop (Handlers mantidos iguais) ---
function handleDragStart(e) { /* ... */ if (e.target.classList.contains('category') && e.target.draggable) { draggedItem = e.target; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => e.target.classList.add('dragging'), 0); } else e.preventDefault(); }
function handleDragEnd() { /* ... */ if(draggedItem) { draggedItem.classList.remove('dragging'); draggedItem = null; updateCategoryOrder(); } }
function handleDragOver(e) { /* ... */ e.preventDefault(); e.dataTransfer.dropEffect = 'move'; const container = document.getElementById(CATEGORY_CONTAINER_ID); if (!draggedItem || !container || !container.contains(draggedItem)) return; const afterElement = getDragAfterElement(container, e.clientY); const currentElement = document.querySelector('.dragging'); if (currentElement) { if (afterElement == null) container.appendChild(currentElement); else container.insertBefore(currentElement, afterElement); } }
function getDragAfterElement(container, y) { /* ... */ const draggables = [...container.querySelectorAll('.category[draggable="true"]:not(.dragging)')]; return draggables.reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2; if (offset < 0 && offset > closest.offset) return { offset: offset, element: child }; else return closest; }, { offset: Number.NEGATIVE_INFINITY }).element; }
async function updateCategoryOrder() { /* ... (lógica mantida igual) ... */ const container = document.getElementById(CATEGORY_CONTAINER_ID); const dynamicCards = container.querySelectorAll('.category[draggable="true"]'); if (dynamicCards.length === 0) return; showSpinner(SPINNER_ID); try { const batch = writeBatch(db); let currentOrder = 0; container.childNodes.forEach(node => { if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('category') && node.draggable) { const id = node.dataset.id; if (id) { batch.update(doc(db, 'categories', id), { order: currentOrder }); currentOrder++; } } }); if (currentOrder > 0) await batch.commit(); console.log('Ordem atualizada.'); } catch (error) { console.error('Erro atualizar ordem:', error); showNotification('Erro salvar ordem.', 'error'); loadCategories(); } finally { hideSpinner(SPINNER_ID); } }

// --- Inicialização ---
function loadCategories() { /* ... (lógica mantida igual) ... */ const container = document.getElementById(CATEGORY_CONTAINER_ID); if (!container) { console.error('Container não encontrado!'); return; } showSpinner(SPINNER_ID); if (unsubscribeCategories) unsubscribeCategories(); const q = query(categoriesCollection, where("fixed", "==", false)); unsubscribeCategories = onSnapshot(q, (snapshot) => { const dynamicCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); renderCategories(dynamicCategories); hideSpinner(SPINNER_ID); }, (error) => { console.error('Erro carregar categorias:', error); showNotification(`Erro: ${error.message}`, 'error'); renderCategories([]); hideSpinner(SPINNER_ID); }); }
export function initCategories() { /* ... (lógica mantida igual) ... */ const addCategoryButton = document.getElementById('addCategoryBtn'); const categoryModal = document.getElementById(CATEGORY_MODAL_ID); const container = document.getElementById(CATEGORY_CONTAINER_ID); if (!addCategoryButton || !categoryModal || !container) { console.error('Elementos categorias não encontrados.'); return; } addCategoryButton.addEventListener('click', () => openCategoryModal()); categoryModal.querySelector('#saveCategoryBtn')?.addEventListener('click', saveCategory); categoryModal.querySelector('#cancelCategoryBtn')?.addEventListener('click', () => closeModal(CATEGORY_MODAL_ID)); categoryModal.querySelector('#closeCategoryModal')?.addEventListener('click', () => closeModal(CATEGORY_MODAL_ID)); categoryModal.addEventListener('click', (event) => { if (event.target === categoryModal) closeModal(CATEGORY_MODAL_ID); }); container.addEventListener('dragover', handleDragOver); loadCategories(); console.log('Módulo Categorias inicializado.'); }
window.addEventListener('beforeunload', () => { if (unsubscribeCategories) unsubscribeCategories(); });