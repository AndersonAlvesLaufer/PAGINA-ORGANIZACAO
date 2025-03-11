function toggleTheme() {
  const themes = ['light', 'dark', 'blue'];
  let currentTheme = localStorage.getItem('theme') || 'light';
  const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
  currentTheme = themes[nextIndex];
  document.body.classList.remove(...themes);
  document.body.classList.add(currentTheme);
  localStorage.setItem('theme', currentTheme);
}

let cardOrder = [];
let pinnedItems = [];
let subitemsData = [];

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.classList.add(savedTheme);

  const savedNotes = localStorage.getItem('quickNotes');
  if (savedNotes) document.getElementById('quickNotes').value = savedNotes;

  loadTasks();
  cardOrder = JSON.parse(localStorage.getItem('cardOrder') || '[]');
  pinnedItems = JSON.parse(localStorage.getItem('pinnedItems') || '[]');
  subitemsData = JSON.parse(localStorage.getItem('subitemsData') || '{}');

  initCards();
  reorderCards();
  initSubitemsAll();
  initCalendar();
  loadTable(); // Certifique-se de que loadTable está sendo chamado

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('quickNotes').addEventListener('input', () => {
    localStorage.setItem('quickNotes', document.getElementById('quickNotes').value);
  });
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      localStorage.setItem('quickNotes', document.getElementById('quickNotes').value);
      alert('Anotações salvas!');
    }
  });

  const taskInput = document.getElementById('taskInput');
  const tasksList = document.getElementById('tasksList');
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
  });
  tasksList.addEventListener('click', (e) => {
    if (e.target.closest('.remove-task')) {
      e.target.closest('li').remove();
      saveTasks();
    }
  });

  document.getElementById('backToTop').addEventListener('click', scrollToTop);
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initCards() {
  const categories = document.querySelectorAll('.category');
  categories.forEach(category => {
    category.addEventListener('dragstart', () => category.classList.add('dragging'));
    category.addEventListener('dragend', () => {
      category.classList.remove('dragging');
      updateCardOrderArray();
      saveCardOrder();
    });
    const pinBtn = category.querySelector('.pin-btn');
    pinBtn.addEventListener('click', () => togglePin(category));
  });

  const container = document.getElementById('buttonContainer');
  container.addEventListener('dragover', e => {
    e.preventDefault();
    const draggedItem = document.querySelector('.dragging');
    if (!draggedItem) return;
    const afterElement = getDragAfterElement(container, e.clientY);
    if (!afterElement) container.appendChild(draggedItem);
    else container.insertBefore(draggedItem, afterElement);
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.category:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function togglePin(card) {
  const cardId = card.dataset.id;
  const isPinned = card.classList.toggle('pinned');
  if (isPinned) {
    removeIdFromArray(cardId, cardOrder);
    pinnedItems.push(cardId);
  } else {
    removeIdFromArray(cardId, pinnedItems);
    cardOrder.push(cardId);
    reorderCards();
  }
  saveCardOrder();
  savePinnedItems();
}

function reorderCards() {
  const container = document.getElementById('buttonContainer');
  const allCards = Array.from(document.querySelectorAll('.category'));
  cardOrder.forEach(id => {
    const card = allCards.find(c => c.dataset.id === id);
    if (card) container.appendChild(card);
  });
}

function updateCardOrderArray() {
  const container = document.getElementById('buttonContainer');
  const cards = container.querySelectorAll('.category');
  cardOrder = Array.from(cards).map(card => card.dataset.id);
}

function saveCardOrder() { localStorage.setItem('cardOrder', JSON.stringify(cardOrder)); }
function savePinnedItems() { localStorage.setItem('pinnedItems', JSON.stringify(pinnedItems)); }
function removeIdFromArray(id, arr) {
  const index = arr.indexOf(id);
  if (index !== -1) arr.splice(index, 1);
}

function addTask() {
  const taskInput = document.getElementById('taskInput');
  const tasksList = document.getElementById('tasksList');
  const taskValue = taskInput.value.trim();
  if (!taskValue) return;
  const li = document.createElement('li');
  li.innerHTML = `<span>${taskValue}</span><button class="remove-task"><i class="fas fa-trash"></i></button>`;
  tasksList.appendChild(li);
  taskInput.value = '';
  saveTasks();
}

function saveTasks() {
  const tasksList = document.getElementById('tasksList');
  const tasks = Array.from(tasksList.querySelectorAll('li')).map(li => li.querySelector('span').innerText);
  localStorage.setItem('tasksList', JSON.stringify(tasks));
}

function loadTasks() {
  const tasksList = document.getElementById('tasksList');
  if (!tasksList) return;
  const savedTasks = JSON.parse(localStorage.getItem('tasksList') || '[]');
  savedTasks.forEach(task => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${task}</span><button class="remove-task"><i class="fas fa-trash"></i></button>`;
    tasksList.appendChild(li);
  });
}

function initSubitemsAll() {
  const containers = document.querySelectorAll('.subitems-container');
  containers.forEach(container => {
    const catId = container.dataset.subitemId;
    const addBtn = container.querySelector('.add-subitem-btn');
    const ul = container.querySelector('ul');
    renderSubitems(catId, ul);

    addBtn.addEventListener('click', () => {
      const subitemName = prompt('Nome do subitem:')?.trim();
      if (!subitemName || (subitemsData[catId] && subitemsData[catId].includes(subitemName))) return;
      if (!subitemsData[catId]) subitemsData[catId] = [];
      subitemsData[catId].push(subitemName);
      saveSubitemsData();
      renderSubitems(catId, ul);
    });

    ul.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.remove-subitem');
      if (removeBtn) {
        const index = removeBtn.dataset.index;
        if (subitemsData[catId]) {
          subitemsData[catId].splice(index, 1);
          saveSubitemsData();
          renderSubitems(catId, ul);
        }
      }
    });
  });
}

function renderSubitems(catId, ul) {
  ul.innerHTML = '';
  const items = subitemsData[catId] || [];
  items.forEach((item, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item}</span><button class="remove-subitem" data-index="${idx}"><i class="fas fa-times"></i></button>`;
    ul.appendChild(li);
  });
}

function loadTable() {
  const tableContainer = document.getElementById('tableContainer');
  if (!tableContainer) return;

  // Carrega o conteúdo de tabela.html
  fetch('tabela.html')
    .then(response => {
      if (!response.ok) throw new Error('Erro ao carregar tabela.html');
      return response.text();
    })
    .then(html => {
      tableContainer.innerHTML = html; // Insere a tabela no contêiner
      initEditableTable(); // Inicializa a funcionalidade de edição
    })
    .catch(error => {
      console.error('Erro ao carregar a tabela:', error);
      tableContainer.innerHTML = '<p>Erro ao carregar a tabela. Verifique o arquivo tabela.html.</p>';
    });
}

function initEditableTable() {
  const table = document.getElementById('editableTable');
  if (!table) return;

  // Carrega dados salvos do localStorage
  const savedData = JSON.parse(localStorage.getItem('tableData') || '[]');
  if (savedData.length > 0) {
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = ''; // Limpa as linhas atuais
    savedData.forEach(row => {
      const tr = document.createElement('tr');
      row.forEach(cell => {
        const td = document.createElement('td');
        td.setAttribute('contenteditable', 'true');
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  // Salva as alterações no localStorage ao editar
  table.addEventListener('input', () => {
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const data = rows.map(row => Array.from(row.querySelectorAll('td')).map(td => td.textContent));
    localStorage.setItem('tableData', JSON.stringify(data));
  });
}

function saveSubitemsData() { localStorage.setItem('subitemsData', JSON.stringify(subitemsData)); }

function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: '300px',
    headerToolbar: {
      left: 'prev,next',
      center: 'title',
      right: ''
    },
    events: []
  });
  calendar.render();
}

let iaAbas = {};

function mostrarIA(nomeIA) {
  const urls = {
    'chatgpt': "https://chatgpt.com/",
    'gemini': "https://gemini.google.com",
    'perplexity': "https://www.perplexity.ai/",
    'copilot': "https://m365.cloud.microsoft/chat?auth=2",
    'deepseek': "https://chat.deepseek.com/",
    'claude': "https://claude.ai/new/",
    'grok': "https://grok.ai",
    'lechat': "https://lechat.ai",
    'sabia': "https://sabi.ai",
    'qwenchat': "https://chat.qwen.ai/",
    'iadod': "https://iadod.com.br/"
  };

  const url = urls[nomeIA];
  if (!url) return console.error("IA não reconhecida:", nomeIA);

  if (nomeIA === 'perplexity') {
    const iframesContainer = document.getElementById('iframesContainer');
    let iframe = Array.from(iframesContainer.querySelectorAll('iframe')).find(f => f.title.toLowerCase() === 'perplexity');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.title = 'Perplexity';
      iframe.setAttribute('loading', 'lazy');
      iframesContainer.appendChild(iframe);
    }
    iframesContainer.querySelectorAll('iframe').forEach(f => f.style.display = f === iframe ? 'block' : 'none');
    atualizarBotaoAtivo(nomeIA, true);
    return;
  }

  if (nomeIA === 'qwenchat') {
    const iframesContainer = document.getElementById('iframesContainer');
    let iframe = Array.from(iframesContainer.querySelectorAll('iframe')).find(f => f.title.toLowerCase() === 'qwen');
    if (!iframe) {
      console.warn("Iframe do Qwen não encontrado, criando um novo.");
      iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.title = 'Qwen';
      iframe.setAttribute('loading', 'lazy');
      iframesContainer.appendChild(iframe);
    }
    iframesContainer.querySelectorAll('iframe').forEach(f => f.style.display = f === iframe ? 'block' : 'none');
    atualizarBotaoAtivo(nomeIA, true);
    return;
  }

  const windowName = `iaWindow_${nomeIA}`;
  let iaWindow = window.open('', windowName);
  if (iaWindow && iaWindow.location.href === 'about:blank') {
    iaWindow.location.href = url;
  } else if (iaWindow && !iaWindow.closed) {
    iaWindow.focus();
    atualizarBotaoAtivo(nomeIA, true);
    iaAbas[nomeIA] = iaWindow;
    return;
  }

  iaWindow = window.open(url, windowName, `width=800,height=600,left=${window.screenX + 50},top=${window.screenY + 50}`);
  if (iaWindow) {
    iaAbas[nomeIA] = iaWindow;
    atualizarBotaoAtivo(nomeIA, true);
    const checkInterval = setInterval(() => {
      if (iaAbas[nomeIA]?.closed) {
        clearInterval(checkInterval);
        delete iaAbas[nomeIA];
        atualizarBotaoAtivo(nomeIA, false);
      }
    }, 1000);
  }
}

// Função para atualizar o estado ativo dos botões (adicionada para evitar erros)
function atualizarBotaoAtivo(nomeIA, ativo) {
  const botao = document.querySelector(`.btnIA[onclick*="mostrarIA('${nomeIA}')"]`);
  if (botao) {
    botao.classList.toggle('active', ativo);
  }
}