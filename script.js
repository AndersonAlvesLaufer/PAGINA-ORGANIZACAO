// Função de login
function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const storedHash = localStorage.getItem('authHash');
  const hash = btoa(username + ':' + password);

  if (!storedHash) {
    if (username === 'admin' && password === 'segura123') {
      localStorage.setItem('authHash', hash);
      showMainContent();
    } else {
      alert('Usuário ou senha incorretos na primeira configuração!');
    }
  } else if (storedHash === hash) {
    showMainContent();
  } else {
    alert('Usuário ou senha incorretos!');
  }
}

// Dados de exemplo – esses dados podem ser carregados de uma API ou arquivo JSON futuramente
const contratos = [
  { sei: "0060404-14.2018.8.16.6000", contrato: "369/2019 (Digitalização)", empresa: "UNILEHU", prorrogacao: "", pendencias: "Aguardar providências arquivamento" },
  { sei: "0032440-07.2022.8.16.6000", contrato: "140/2022 (Telefonista, Recepcionista e Copeiragem)", empresa: "CENTRALLIMP", prorrogacao: "2026-02-03", pendencias: "" },
  { sei: "0072326-81.2020.8.16.6000", contrato: "249/2020 – Correios", empresa: "Correios", prorrogacao: "2025-11-01", pendencias: "" }
  // ... adicione os demais registros conforme necessário
];

function renderTabelaContratos() {
  // Obtém o container onde a tabela será injetada (verifique que no index.html você substituiu a tabela fixa por <div id="tabelaContainer"></div>)
  const container = document.getElementById('tabelaContainer');

  let html = `
    <table id="editableTable">
      <thead>
        <tr>
          <th>SEI</th>
          <th>CONTRATO</th>
          <th>EMPRESA</th>
          <th>PRORROGAÇÃO</th>
          <th>PENDÊNCIAS</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Para cada contrato, adiciona uma linha na tabela
  contratos.forEach(item => {
    html += `
      <tr>
        <td contenteditable="true"><strong>${item.sei}</strong></td>
        <td contenteditable="true">${item.contrato}</td>
        <td contenteditable="true">${item.empresa}</td>
        <td><input type="date" class="prorrogacao-date" value="${item.prorrogacao}" /></td>
        <td contenteditable="true">${item.pendencias}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  // Injeta o HTML gerado no container
  container.innerHTML = html;

  // Chama a função que adiciona os eventos necessários na tabela (caso já implementados)
  initEditableTable();
}

function showMainContent() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
  initializeApp();
}

function initializeApp() {
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
  renderTabelaContratos();
  initEditableTable();

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('quickNotes').addEventListener('input', () => {
    localStorage.setItem('quickNotes', document.getElementById('quickNotes').value);
  });
  document.addEventListener('keydown', handleShortcuts);

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
  checkProrrogacaoWarnings();
  checkTodayEvents();
}

window.onload = function() {
  if (!localStorage.getItem('authHash')) {
    document.getElementById('loginScreen').style.display = 'block';
  } else {
    showMainContent();
  }
};

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
let subitemsData = {};

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
    if (!afterElement) {
      container.appendChild(draggedItem);
    } else {
      container.insertBefore(draggedItem, afterElement);
    }
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.category:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    }
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

function saveCardOrder() {
  localStorage.setItem('cardOrder', JSON.stringify(cardOrder));
}
function savePinnedItems() {
  localStorage.setItem('pinnedItems', JSON.stringify(pinnedItems));
}
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
  tasksList.innerHTML = '';
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
      const subitemLink = prompt('Link do subitem (ex.: onedrive://caminho):')?.trim();
      if (!subitemName || !subitemLink || (subitemsData[catId] && subitemsData[catId].some(item => item.name === subitemName))) return;
      if (!subitemsData[catId]) subitemsData[catId] = [];
      subitemsData[catId].push({ name: subitemName, link: subitemLink });
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
    li.innerHTML = `<a href="${item.link}" target="_blank">${item.name}</a><button class="remove-subitem" data-index="${idx}"><i class="fas fa-times"></i></button>`;
    ul.appendChild(li);
  });
}

function initEditableTable() {
  const table = document.getElementById('editableTable');
  if (!table) return;

  const savedData = JSON.parse(localStorage.getItem('tableData') || '[]');
  if (savedData.length > 0) {
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    savedData.forEach(row => {
      const tr = document.createElement('tr');
      row.forEach((cell, idx) => {
        const td = document.createElement('td');
        if (idx === 3) { // Coluna Prorrogação
          const dateInput = document.createElement('input');
          dateInput.type = 'date';
          dateInput.className = 'prorrogacao-date';
          dateInput.value = (typeof cell === 'object' && cell.text)
            ? cell.text.match(/\d{4}-\d{2}-\d{2}/)?.[0] || ''
            : cell || '';
          td.appendChild(dateInput);
        } else {
          td.setAttribute('contenteditable', idx !== 3 ? 'true' : 'false');
          if (typeof cell === 'object' && cell.text) {
            td.innerHTML = cell.text;
            if (cell.bold) td.querySelector('span').style.fontWeight = 'bold';
            if (cell.color) td.querySelector('span').style.color = cell.color;
          } else {
            td.textContent = cell;
          }
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  table.addEventListener('input', () => {
    document.getElementById('updateTableBtn').style.display = 'inline-block';
  });

  table.querySelectorAll('.prorrogacao-date').forEach(input => {
    input.addEventListener('change', () => {
      document.getElementById('updateTableBtn').style.display = 'inline-block';
      syncProrrogacaoToCalendar(input.value, input.closest('tr').rowIndex - 1);
    });
  });

  table.addEventListener('click', () => updateSelection());
  table.addEventListener('keyup', () => updateSelection());
}

function updateSelection() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const editable = range.commonAncestorContainer.parentElement.closest('[contenteditable="true"]');
    if (editable) {
      document.getElementById('tableFormattingTools').dataset.activeCell = editable;
    }
  }
}

function applyBold() {
  const activeCell = document.querySelector('#tableFormattingTools').dataset.activeCell;
  if (activeCell) {
    const cell = document.querySelector(activeCell);
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.extractContents();
      const span = document.createElement('span');
      span.style.fontWeight = 'bold';
      span.appendChild(selectedText);
      range.insertNode(span);
      document.getElementById('updateTableBtn').style.display = 'inline-block';
    }
  }
}

function applyRed() {
  const activeCell = document.querySelector('#tableFormattingTools').dataset.activeCell;
  if (activeCell) {
    const cell = document.querySelector(activeCell);
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.extractContents();
      const span = document.createElement('span');
      span.style.color = 'red';
      span.appendChild(selectedText);
      range.insertNode(span);
      document.getElementById('updateTableBtn').style.display = 'inline-block';
    }
  }
}

function applyBlue() {
  const activeCell = document.querySelector('#tableFormattingTools').dataset.activeCell;
  if (activeCell) {
    const cell = document.querySelector(activeCell);
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.extractContents();
      const span = document.createElement('span');
      span.style.color = 'blue';
      span.appendChild(selectedText);
      range.insertNode(span);
      document.getElementById('updateTableBtn').style.display = 'inline-block';
    }
  }
}

function markImportant() {
  const activeCell = document.querySelector('#tableFormattingTools').dataset.activeCell;
  if (activeCell) {
    const cell = document.querySelector(activeCell);
    cell.style.backgroundColor = cell.style.backgroundColor === 'yellow' ? '' : 'yellow';
    document.getElementById('updateTableBtn').style.display = 'inline-block';
  }
}

function handleShortcuts(e) {
  if (e.target.closest('#editableTable')) {
    if (e.ctrlKey) {
      if (e.key === 'b') {
        e.preventDefault();
        applyBold();
      } else if (e.key === 'r') {
        e.preventDefault();
        applyRed();
      } else if (e.key === 'l') {
        e.preventDefault();
        applyBlue();
      }
    }
  }
}

function addRow() {
  const table = document.getElementById('editableTable');
  const tbody = table.querySelector('tbody');
  const newRow = document.createElement('tr');
  const colCount = table.querySelector('thead tr').cells.length;
  for (let i = 0; i < colCount; i++) {
    const td = document.createElement('td');
    if (i === 3) { // Coluna Prorrogação
      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      dateInput.className = 'prorrogacao-date';
      dateInput.value = '';
      td.appendChild(dateInput);
      dateInput.addEventListener('change', () => {
        document.getElementById('updateTableBtn').style.display = 'inline-block';
        syncProrrogacaoToCalendar(dateInput.value, tbody.rows.length);
      });
    } else {
      td.setAttribute('contenteditable', i !== 3 ? 'true' : 'false');
      td.textContent = '';
    }
    newRow.appendChild(td);
  }
  tbody.appendChild(newRow);
  document.getElementById('updateTableBtn').style.display = 'inline-block';
}

function removeRow() {
  const table = document.getElementById('editableTable');
  const tbody = table.querySelector('tbody');
  if (tbody.rows.length > 0) {
    tbody.deleteRow(-1);
    document.getElementById('updateTableBtn').style.display = 'inline-block';
  }
}

function addColumn() {
  const table = document.getElementById('editableTable');
  const thead = table.querySelector('thead tr');
  const tbody = table.querySelector('tbody');

  const th = document.createElement('th');
  th.textContent = `Nova Coluna ${thead.cells.length + 1}`;
  th.style.padding = '12px';
  th.style.border = '1px solid #ddd';
  thead.appendChild(th);

  Array.from(tbody.rows).forEach(row => {
    const td = document.createElement('td');
    td.setAttribute('contenteditable', true);
    td.textContent = '';
    td.style.padding = '10px';
    td.style.border = '1px solid #ddd';
    row.appendChild(td);
  });

  document.getElementById('updateTableBtn').style.display = 'inline-block';
}

function removeColumn() {
  const table = document.getElementById('editableTable');
  const thead = table.querySelector('thead tr');
  const tbody = table.querySelector('tbody');

  if (thead.cells.length > 1) {
    thead.deleteCell(-1);
    Array.from(tbody.rows).forEach(row => row.deleteCell(-1));
    document.getElementById('updateTableBtn').style.display = 'inline-block';
  }
}

function saveTableData() {
  const table = document.getElementById('editableTable');
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const data = rows.map(row => {
    return Array.from(row.querySelectorAll('td')).map((td, idx) => {
      if (idx === 3) { // Coluna Prorrogação
        const dateInput = td.querySelector('.prorrogacao-date');
        return dateInput ? dateInput.value : '';
      }
      const spans = td.querySelectorAll('span');
      if (spans.length > 0) {
        return {
          text: td.innerHTML,
          bold: spans[0].style.fontWeight === 'bold',
          color: spans[0].style.color || '',
          background: td.style.backgroundColor || ''
        };
      }
      return td.textContent;
    });
  });
  localStorage.setItem('tableData', JSON.stringify(data));
  document.getElementById('updateTableBtn').style.display = 'none';
  syncAllProrrogacoesToCalendar();
}

function saveSubitemsData() {
  localStorage.setItem('subitemsData', JSON.stringify(subitemsData));
}

function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    editable: true,
    selectable: true,
    select: function(info) {
      const title = prompt('Digite o título do evento:');
      if (title) {
        calendar.addEvent({
          id: Date.now().toString(),
          title: title,
          start: info.start,
          end: info.end || info.start,
          allDay: info.allDay
        });
        saveCalendarEvents();
      }
    },
    eventClick: function(info) {
      openEventPopup(info.event);
    },
    eventDrop: function(info) {
      saveCalendarEvents();
    },
    eventResize: function(info) {
      saveCalendarEvents();
    },
    events: JSON.parse(localStorage.getItem('calendarEvents') || '[]')
  });
  calendar.render();
  // Armazena o calendário no DOM para acesso pelas funções (por exemplo, __calendar)
  document.querySelector('#calendar').__calendar = calendar;
}

function openEventPopup(event) {
  const popup = document.getElementById('eventPopup');
  const overlay = document.getElementById('overlay');
  const eventTitle = document.getElementById('eventTitle');
  const eventInput = document.getElementById('eventInput');
  const eventStart = document.getElementById('eventStart');
  const eventEnd = document.getElementById('eventEnd');
  const eventDescription = document.getElementById('eventDescription');

  eventTitle.textContent = event.title;
  eventInput.value = event.title;
  eventStart.value = event.start.toISOString().slice(0, 16);
  eventEnd.value = event.end ? event.end.toISOString().slice(0, 16) : event.start.toISOString().slice(0, 16);
  eventDescription.value = event.extendedProps.description || '';

  popup.dataset.eventId = event.id;
  popup.style.display = 'block';
  overlay.style.display = 'block';
}

function saveEvent() {
  const popup = document.getElementById('eventPopup');
  const calendar = document.querySelector('#calendar').__calendar;
  const eventId = popup.dataset.eventId;
  const eventInput = document.getElementById('eventInput').value;
  const eventStart = new Date(document.getElementById('eventStart').value);
  const eventEnd = new Date(document.getElementById('eventEnd').value);
  const eventDescription = document.getElementById('eventDescription').value;

  let event = calendar.getEventById(eventId);
  if (event) {
    event.setProp('title', eventInput);
    event.setStart(eventStart);
    event.setEnd(eventEnd);
    event.setExtendedProp('description', eventDescription);
  } else {
    calendar.addEvent({
      id: Date.now().toString(),
      title: eventInput,
      start: eventStart,
      end: eventEnd,
      allDay: !eventEnd || eventStart.toDateString() === eventEnd.toDateString(),
      description: eventDescription
    });
  }
  closePopup();
  saveCalendarEvents();
}

function deleteEvent() {
  const popup = document.getElementById('eventPopup');
  const calendar = document.querySelector('#calendar').__calendar;
  const eventId = popup.dataset.eventId;
  const event = calendar.getEventById(eventId);
  if (event) {
    event.remove();
    saveCalendarEvents();
  }
  closePopup();
}

function closePopup() {
  const popup = document.getElementById('eventPopup');
  const overlay = document.getElementById('overlay');
  popup.style.display = 'none';
  overlay.style.display = 'none';
  popup.dataset.eventId = '';
}

function saveCalendarEvents() {
  const calendar = document.querySelector('#calendar').__calendar;
  const events = calendar.getEvents().map(event => ({
    id: event.id,
    title: event.title,
    start: event.start.toISOString(),
    end: event.end ? event.end.toISOString() : null,
    allDay: event.allDay,
    description: event.extendedProp('description') || ''
  }));
  localStorage.setItem('calendarEvents', JSON.stringify(events));
}

function addCategory() {
  const name = prompt('Nome da nova categoria:');
  const tags = prompt('Tags (separadas por vírgula):');
  const link = prompt('Link (ex.: onedrive://caminho):');
  if (!name || !link) return;

  const container = document.getElementById('buttonContainer');
  const category = document.createElement('div');
  category.className = 'category';
  category.dataset.id = `card-${name.toLowerCase().replace(/\s+/g, '-')}`;
  category.dataset.tags = tags || '';
  category.draggable = true;
  category.innerHTML = `
    <button class="pin-btn" title="Fixar categoria"><i class="fas fa-thumbtack"></i></button>
    <h3>${name}</h3>
    <p>${name} descrição</p>
    <a href="${link}" target="_blank">${name}</a>
    <div class="subitems-container" data-subitem-id="card-${name.toLowerCase().replace(/\s+/g, '-')}">
      <ul></ul>
      <button class="add-subitem-btn">+ Subitem</button>
    </div>
  `;
  container.appendChild(category);
  initCards();
  saveCardOrder();
}

function removeCategory() {
  const container = document.getElementById('buttonContainer');
  const categories = container.querySelectorAll('.category');
  if (categories.length > 0) {
    const lastCategory = categories[categories.length - 1];
    const confirmRemove = confirm(`Deseja remover a categoria "${lastCategory.querySelector('h3').textContent}"?`);
    if (confirmRemove) {
      const cardId = lastCategory.dataset.id;
      removeIdFromArray(cardId, cardOrder);
      removeIdFromArray(cardId, pinnedItems);
      lastCategory.remove();
      saveCardOrder();
      savePinnedItems();
      delete subitemsData[cardId];
      saveSubitemsData();
    }
  }
}

function syncProrrogacaoToCalendar(date, rowIndex) {
  const calendar = document.querySelector('#calendar').__calendar;
  if (date) {
    const eventId = `prorrogacao-${rowIndex}`;
    let event = calendar.getEventById(eventId);
    if (event) event.remove();
    calendar.addEvent({
      id: eventId,
      title: `Prorrogação - Linha ${rowIndex + 1}`,
      start: date,
      allDay: true
    });
    saveCalendarEvents();
  }
}

function syncAllProrrogacoesToCalendar() {
  const table = document.getElementById('editableTable');
  const prorrogacoes = table.querySelectorAll('.prorrogacao-date');
  const calendar = document.querySelector('#calendar').__calendar;
  calendar.getEvents().forEach(event => {
    if (event.id.startsWith('prorrogacao-')) event.remove();
  });
  prorrogacoes.forEach((input, index) => {
    if (input.value) {
      calendar.addEvent({
        id: `prorrogacao-${index}`,
        title: `Prorrogação - Linha ${index + 1}`,
        start: input.value,
        allDay: true
      });
    }
  });
  saveCalendarEvents();
}

function checkProrrogacaoWarnings() {
  const table = document.getElementById('editableTable');
  const prorrogacoes = table.querySelectorAll('.prorrogacao-date');
  const tasksList = document.getElementById('tasksList');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  prorrogacoes.forEach((input, index) => {
    if (input.value) {
      const prorrogacaoDate = new Date(input.value);
      const twoMonthsBefore = new Date(prorrogacaoDate);
      twoMonthsBefore.setMonth(twoMonthsBefore.getMonth() - 2);
      const oneMonthBefore = new Date(prorrogacaoDate);
      oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);

      if (today >= twoMonthsBefore && today < prorrogacaoDate) {
        addWarningTask(`Aviso: Prorrogação (Linha ${index + 1}) em 2 meses - ${prorrogacaoDate.toLocaleDateString()}`, true);
      } else if (today >= oneMonthBefore && today < prorrogacaoDate) {
        addWarningTask(`Aviso: Prorrogação (Linha ${index + 1}) em 1 mês - ${prorrogacaoDate.toLocaleDateString()}`, true);
      }
    }
  });
}

function checkTodayEvents() {
  const calendar = document.querySelector('#calendar').__calendar;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events = calendar.getEvents().filter(event => {
    const eventDate = new Date(event.start);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.toDateString() === today.toDateString();
  });

  events.forEach(event => {
    if (!event.id.startsWith('prorrogacao-')) {
      addWarningTask(`Evento Hoje: ${event.title}`, true);
    }
  });
}

function addWarningTask(text, isWarning) {
  const tasksList = document.getElementById('tasksList');
  const existingTasks = Array.from(tasksList.querySelectorAll('li')).map(li => li.querySelector('span').textContent);
  if (!existingTasks.includes(text)) {
    const li = document.createElement('li');
    li.innerHTML = `<span style="color: ${isWarning ? 'red' : 'black'}">${text}</span><button class="remove-task"><i class="fas fa-trash"></i></button>`;
    tasksList.appendChild(li);
    saveTasks();
  }
}

// ====================================================
// INTEGRAÇÃO COM INTELIGÊNCIA ARTIFICIAL (IA)
// ====================================================

// Variável global para armazenar janelas abertas de IA
let iaAbas = {};

// Função para exibir uma interface de IA (ex.: chatgpt, gemini, perplexity, etc.)
// Agora recebe também o elemento do botão (btn) para que possamos manipulá-lo.
function mostrarIA(nomeIA, btn) {
  // Se o botão já estiver desabilitado, não faz nada.
  if (btn.disabled) return;

  // DESABILITA o botão: torna-o transparente e inacessível
  btn.disabled = true;
  btn.classList.add('disabled'); // a classe 'disabled' será definida no CSS

  // CRIA um botão "restaurar" que, quando clicado, reativa o botão original
  var restoreBtn = document.createElement('button');
  restoreBtn.textContent = "Restaurar";
  restoreBtn.className = "btnRestaurar";
  restoreBtn.onclick = function() {
    // Reativa o botão original
    btn.disabled = false;
    btn.classList.remove('disabled');
    // Remove o botão "restaurar" do DOM
    restoreBtn.parentNode.removeChild(restoreBtn);
  };
  // Insere o botão "restaurar" imediatamente após o botão da IA
  btn.parentNode.insertBefore(restoreBtn, btn.nextSibling);

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

  // Tratamento especial para a IA 'perplexity' usando iframe
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
    iframesContainer.querySelectorAll('iframe').forEach(f => f.style.display = (f === iframe) ? 'block' : 'none');
    return;
  }

  // Tratamento especial para a IA 'qwenchat' usando iframe
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
    iframesContainer.querySelectorAll('iframe').forEach(f => f.style.display = (f === iframe) ? 'block' : 'none');
    return;
  }

  // Para outras IAs, abre em uma nova janela
  const windowName = `iaWindow_${nomeIA}`;
  let iaWindow = window.open('', windowName);
  if (iaWindow && iaWindow.location.href === 'about:blank') {
    iaWindow.location.href = url;
  } else if (iaWindow && !iaWindow.closed) {
    iaWindow.focus();
    iaAbas[nomeIA] = iaWindow;
    return;
  }
  iaWindow = window.open(url, windowName, `width=800,height=600,left=${window.screenX + 50},top=${window.screenY + 50}`);
  if (iaWindow) {
    iaAbas[nomeIA] = iaWindow;
    const checkInterval = setInterval(() => {
      if (iaAbas[nomeIA]?.closed) {
        clearInterval(checkInterval);
        delete iaAbas[nomeIA];
      }
    }, 1000);
  }
}
