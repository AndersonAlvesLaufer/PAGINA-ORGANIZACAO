// js/categories.js

import { db } from './firebase.js';
import { collection, addDoc, doc, onSnapshot, deleteDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const categoriesCollection = collection(db, 'categories');

// Lista local das categorias fixas (sempre exibidas e não removíveis)
const fixedCategories = [
  {
    id: 'card-direito',
    name: 'Direito',
    description: 'Documentos jurídicos e pareceres',
    link: 'onedrive://documentos_juridicos',
    fixed: true,
    order: 0
  },
  {
    id: 'card-pessoal',
    name: 'Pessoal',
    description: 'Documentos e fotos pessoais',
    link: 'onedrive://fotos_e_documentos',
    fixed: true,
    order: 1
  },
  {
    id: 'card-economia',
    name: 'Economia/Investimentos',
    description: 'Recursos financeiros',
    link: 'onedrive://indice_de_economia',
    fixed: true,
    order: 2
  },
  {
    id: 'card-trabalho-tj',
    name: 'Trabalho-TJ',
    description: 'Documentos do Tribunal de Justiça',
    link: 'onedrive://trabalho_tj',
    fixed: true,
    order: 3
  },
  {
    id: 'card-ferramentas',
    name: 'Ferramentas',
    description: 'Ferramentas e utilitários',
    link: 'onedrive://ferramentas',
    fixed: true,
    order: 4
  }
];

/**
 * Adiciona uma nova categoria dinâmica ao Firestore.
 */
window.addCategory = async function addCategory(name, fixed = false) {
  try {
    await addDoc(categoriesCollection, {
      name: name || 'Nova Categoria',
      description: '',
      link: '',
      fixed: fixed,
      pinned: false,
      order: Date.now()
    });
    console.log('Categoria adicionada no Firestore!');
    alert('Categoria adicionada com sucesso!');
  } catch (error) {
    console.error('Erro ao adicionar categoria:', error);
    alert('Erro ao adicionar categoria. Tente novamente.');
  }
};

/**
 * Remove uma categoria dinâmica do Firestore.
 * Categorias fixas (presentes no array fixedCategories) não podem ser removidas.
 */
window.removeCategory = async function removeCategory(categoryId) {
  if (!categoryId) {
    alert('Informe o ID da categoria a remover.');
    return;
  }
  const isFixed = fixedCategories.find(cat => cat.id === categoryId);
  if (isFixed) {
    alert('Esta categoria é fixa e não pode ser removida.');
    return;
  }
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
    console.log('Categoria removida do Firestore!');
    alert('Categoria removida com sucesso!');
  } catch (error) {
    console.error('Erro ao remover categoria:', error);
    alert('Erro ao remover categoria. Tente novamente.');
  }
};

/**
 * Renderiza as categorias fixas (do array local) e as dinâmicas (do Firestore) no container.
 * As fixas são sempre exibidas e não removíveis nem arrastáveis.
 */
window.loadCategories = function loadCategories() {
  const container = document.getElementById('buttonContainer');
  if (!container) {
    console.log('Container de categorias não encontrado!');
    return;
  }
  
  // Função para renderizar categorias fixas (HTML estático)
  function renderFixedCategories() {
    let html = '';
    fixedCategories.forEach(cat => {
      html += `
        <div class="category" data-id="${cat.id}" draggable="false">
          <!-- Botão de remover não exibido para fixas -->
          <button class="remove-category-btn" style="display: none;"></button>
          <button class="pin-btn" title="Fixado" disabled><i class="fas fa-thumbtack"></i></button>
          <h3>${cat.name}</h3>
          <p>${cat.description}</p>
          <a href="${cat.link}" target="_blank">Documentos</a>
          <div class="subitems-container" data-subitem-id="${cat.id}">
            <ul></ul>
            <button class="add-subitem-btn">Adicionar Subitem</button>
          </div>
        </div>
      `;
    });
    return html;
  }
  
  // Ouve as categorias dinâmicas do Firestore (somente aquelas com fixed == false)
  onSnapshot(categoriesCollection, (snapshot) => {
    let dynamicCategories = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (!data.fixed) {
        data.id = docSnap.id;
        dynamicCategories.push(data);
      }
    });
    // Ordena as dinâmicas por "order"
    dynamicCategories.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    let dynamicHTML = '';
    dynamicCategories.forEach(cat => {
      dynamicHTML += `
        <div class="category" data-id="${cat.id}" draggable="true">
          <!-- Pequeno "X" vermelho no canto superior direito para remover -->
          <button class="remove-category-btn" title="Remover categoria" onclick="removeCategory('${cat.id}')" style="position: absolute; top: 5px; right: 5px; background: transparent; border: none; color: red; font-size: 12px;">X</button>
          <button class="pin-btn" title="Fixar categoria"><i class="fas fa-thumbtack"></i></button>
          <h3>${cat.name}</h3>
          <p>${cat.description || ''}</p>
          <a href="${cat.link || '#'}" target="_blank">${cat.link ? 'Documentos' : ''}</a>
          <div class="subitems-container" data-subitem-id="${cat.id}">
            <ul></ul>
            <button class="add-subitem-btn">Adicionar Subitem</button>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = `
      <button id="addCategoryBtn" class="small-add-category-btn" onclick="addCategoryPrompt()" title="Adicionar categoria">
        <i class="fas fa-plus"></i>
      </button>
      ${renderFixedCategories()}
      ${dynamicHTML}
    `;
    
    if (typeof window.initCards === 'function') window.initCards();
    if (typeof window.initSubitemsAll === 'function') window.initSubitemsAll();
  }, error => {
    console.error('Erro ao carregar categorias:', error);
  });
};

/**
 * Exibe um prompt para adicionar uma nova categoria dinâmica.
 */
window.addCategoryPrompt = function addCategoryPrompt() {
  const name = prompt('Nome da nova categoria:')?.trim();
  if (name) {
    window.addCategory(name, false);
  }
};

/**
 * Inicializa os eventos de drag-and-drop e de "pin" para categorias dinâmicas.
 * Categorias fixas (draggable="false") não recebem esses eventos.
 */
window.initCards = function initCards() {
  const categories = document.querySelectorAll('.category[draggable="true"]');
  categories.forEach(category => {
    category.addEventListener('dragstart', () => category.classList.add('dragging'));
    category.addEventListener('dragend', async () => {
      category.classList.remove('dragging');
      await updateCardOrder();
    });
    const pinBtn = category.querySelector('.pin-btn');
    if (pinBtn) {
      pinBtn.addEventListener('click', () => togglePin(category));
    }
  });
  
  const container = document.getElementById('buttonContainer');
  container.addEventListener('dragover', e => {
    e.preventDefault();
    const dragging = document.querySelector('.dragging');
    if (!dragging) return;
    const afterElement = getDragAfterElement(container, e.clientY);
    if (!afterElement) {
      container.appendChild(dragging);
    } else {
      container.insertBefore(dragging, afterElement);
    }
  });
};

// Helper para determinar a posição de inserção no drag-and-drop (somente para categorias dinâmicas)
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.category[draggable="true"]:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * Atualiza a ordem (campo "order") das categorias dinâmicas no Firestore.
 */
async function updateCardOrder() {
  const container = document.getElementById('buttonContainer');
  const cards = container.querySelectorAll('.category[draggable="true"]');
  let updates = [];
  cards.forEach((card, index) => {
    const id = card.dataset.id;
    updates.push(updateDoc(doc(db, 'categories', id), { order: index }));
  });
  try {
    await Promise.all(updates);
    console.log('Ordem de categorias dinâmicas atualizada.');
  } catch (error) {
    console.error('Erro ao atualizar ordem de categorias:', error);
  }
}

/**
 * Alterna o status "pinned" de uma categoria dinâmica.
 */
function togglePin(card) {
  const cardId = card.dataset.id;
  const newStatus = !card.classList.contains('pinned');
  card.classList.toggle('pinned', newStatus);
  updateDoc(doc(db, 'categories', cardId), { pinned: newStatus })
    .then(() => console.log(`Categoria ${cardId} pin: ${newStatus}`))
    .catch(error => console.error('Erro ao atualizar pin:', error));
}
