// js/subitems.js

// Importa a instância do Firestore do arquivo firebase.js
import { db } from './firebase.js';

// Importa funções específicas do Firestore para manipulação de documentos
import { collection, addDoc, deleteDoc, onSnapshot, doc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Define a referência para a coleção 'subitems' no Firestore
const subitemsCollection = collection(db, 'subitems');

// Objeto para controle de listeners ativos
const activeListeners = {};

// Objeto para gerenciar notificações
const notification = {
  show: (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
};

/**
 * Mostra um indicador de carregamento
 */
function showLoading(container, show = true) {
  const loaderId = `loader-${container.dataset.subitemId}`;
  if (show) {
    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'loader';
    loader.innerHTML = '<div class="spinner" aria-hidden="true"></div><span class="sr-only">Carregando...</span>';
    container.appendChild(loader);
  } else {
    const loader = document.getElementById(loaderId);
    if (loader) loader.remove();
  }
}

/**
 * Adiciona um novo subitem para uma categoria no Firestore.
 */
window.addSubitem = async function addSubitem(categoryId, name, link) {
  // Validação básica dos inputs
  if (!name || !link) {
    notification.show('Nome e link são obrigatórios', 'error');
    return;
  }

  // Garante que o link tenha protocolo
  if (!/^https?:\/\//i.test(link)) {
    link = "http://" + link;
  }
  
  try {
    // Adiciona novo documento na coleção subitems
    await addDoc(subitemsCollection, {
      categoryId,
      name,
      link,
      createdAt: new Date() // Adiciona timestamp para ordenação
    });
    notification.show('Subitem adicionado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao adicionar subitem:', error);
    notification.show('Erro ao adicionar subitem', 'error');
  }
};

/**
 * Remove um subitem do Firestore com confirmação.
 */
window.removeSubitem = async function removeSubitem(subitemId, subitemName) {
  // Confirmação antes de remover
  if (!confirm(`Tem certeza que deseja remover "${subitemName}"?`)) {
    return;
  }

  try {
    await deleteDoc(doc(db, 'subitems', subitemId));
    notification.show('Subitem removido com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao remover subitem:', error);
    notification.show('Erro ao remover subitem', 'error');
  }
};

/**
 * Renderiza os subitens de uma categoria no elemento UL.
 */
window.renderSubitems = function renderSubitems(categoryId, ulElement) {
  // Remove listener anterior se existir
  if (activeListeners[categoryId]) {
    activeListeners[categoryId]();
  }

  // Mostra estado de carregamento
  showLoading(ulElement.parentElement, true);

  // Configura novo listener
  activeListeners[categoryId] = onSnapshot(subitemsCollection, (snapshot) => {
    ulElement.innerHTML = '';
    
    // Converte para array e ordena por data de criação
    const sortedItems = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => item.categoryId === categoryId)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    if (sortedItems.length === 0) {
      const emptyMsg = document.createElement('li');
      emptyMsg.textContent = 'Nenhum subitem encontrado';
      emptyMsg.className = 'empty-message';
      ulElement.appendChild(emptyMsg);
    } else {
      sortedItems.forEach(item => {
        const li = document.createElement('li');
        li.setAttribute('aria-label', `Subitem: ${item.name}`);
        
        // Garante que o link seja absoluto
        let link = item.link;
        if (!/^https?:\/\//i.test(link)) {
          link = "http://" + link;
        }
        
        li.innerHTML = `
          <a href="${link}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${item.name}">
            ${item.name}
          </a>
          <button class="remove-subitem" data-id="${item.id}" data-name="${item.name}" 
                  aria-label="Remover ${item.name}" title="Remover subitem">
            <span aria-hidden="true">×</span>
          </button>
        `;
        ulElement.appendChild(li);
      });
    }

    // Esconde estado de carregamento
    showLoading(ulElement.parentElement, false);
  }, error => {
    console.error('Erro ao carregar subitens:', error);
    notification.show('Erro ao carregar subitens', 'error');
    showLoading(ulElement.parentElement, false);
  });
};

/**
 * Inicializa a funcionalidade de subitens para todas as categorias.
 */
window.initSubitemsAll = function initSubitemsAll() {
  const containers = document.querySelectorAll('.subitems-list');
  
  containers.forEach(container => {
    const categoryId = container.dataset.subitemId;
    const addBtn = container.closest('.category').querySelector('.add-subitem-btn');
    const ul = document.createElement('ul');
    ul.className = 'subitems-ul';
    container.appendChild(ul);

    // Renderiza subitens para esta categoria
    window.renderSubitems(categoryId, ul);

    // Adiciona listener para o botão de adicionar
    addBtn.addEventListener('click', () => {
      const name = prompt('Nome do subitem:')?.trim();
      const link = prompt('Endereço (URL):')?.trim();
      if (!name || !link) {
        notification.show('Nome e URL são obrigatórios', 'warning');
        return;
      }
      window.addSubitem(categoryId, name, link);
    });

    // Delegation de eventos para os botões de remover
    container.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.remove-subitem');
      if (removeBtn) {
        const subitemId = removeBtn.dataset.id;
        const subitemName = removeBtn.dataset.name;
        window.removeSubitem(subitemId, subitemName);
      }
    });
  });
};

/**
 * Limpa todos os listeners quando a página é descarregada
 */
window.addEventListener('beforeunload', () => {
  Object.values(activeListeners).forEach(unsubscribe => unsubscribe());
});