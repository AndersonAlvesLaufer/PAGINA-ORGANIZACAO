// js/subitems.js

import { db } from './firebase.js';
import { collection, addDoc, deleteDoc, onSnapshot, doc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const subitemsCollection = collection(db, 'subitems');

/**
 * Adiciona um novo subitem para uma categoria no Firestore.
 */
window.addSubitem = async function addSubitem(categoryId, name, link) {
  // Verifica se o link começa com "http://" ou "https://". Se não, adiciona "http://"
  if (!/^https?:\/\//i.test(link)) {
    link = "http://" + link;
  }
  
  try {
    await addDoc(subitemsCollection, {
      categoryId,
      name,
      link
    });
    console.log('Subitem adicionado no Firestore!');
  } catch (error) {
    console.error('Erro ao adicionar subitem:', error);
    alert('Erro ao adicionar subitem. Tente novamente.');
  }
};

/**
 * Remove um subitem do Firestore.
 */
window.removeSubitem = async function removeSubitem(subitemId) {
  try {
    await deleteDoc(doc(db, 'subitems', subitemId));
    console.log('Subitem removido!');
  } catch (error) {
    console.error('Erro ao remover subitem:', error);
    alert('Erro ao remover subitem. Tente novamente.');
  }
};

/**
 * Renderiza os subitens de uma categoria no elemento UL.
 */
window.renderSubitems = function renderSubitems(categoryId, ulElement) {
  onSnapshot(subitemsCollection, (snapshot) => {
    ulElement.innerHTML = '';
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.categoryId === categoryId) {
        // Garante que o link seja absoluto
        let link = data.link;
        if (!/^https?:\/\//i.test(link)) {
          link = "http://" + link;
        }
        const li = document.createElement('li');
        li.innerHTML = `<a href="${link}" target="_blank">${data.name}</a>
          <button class="remove-subitem" data-id="${docSnap.id}" style="background: transparent; border: none; color: red; font-size: 12px;">X</button>`;
        ulElement.appendChild(li);
      }
    });
  }, error => {
    console.error('Erro ao carregar subitens:', error);
  });
};

/**
 * Inicializa a funcionalidade de subitens para todas as categorias.
 */
window.initSubitemsAll = function initSubitemsAll() {
  const containers = document.querySelectorAll('.subitems-container');
  containers.forEach(container => {
    const categoryId = container.dataset.subitemId;
    const addBtn = container.querySelector('.add-subitem-btn');
    const ul = container.querySelector('ul');
    window.renderSubitems(categoryId, ul);

    addBtn.addEventListener('click', () => {
      const name = prompt('Informe o nome do subitem:')?.trim();
      const link = prompt('Informe o endereço (URL ou caminho local) do subitem:')?.trim();
      if (!name || !link) return;
      window.addSubitem(categoryId, name, link);
    });

    ul.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.remove-subitem');
      if (removeBtn) {
        const subitemId = removeBtn.dataset.id;
        window.removeSubitem(subitemId);
      }
    });
  });
};