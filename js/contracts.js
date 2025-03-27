// js/contracts.js

import { db } from './firebase.js';
import { collection, addDoc, doc, onSnapshot, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const contractsCollection = collection(db, 'contracts');
let contractsSnapshotUnsubscribe = null;

const notification = {
  show: (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
};

// Função auxiliar para formatar data no formato YYYY-MM-DD
function formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function applyStyleToSelection(styleProp, value, defaultValue = '') {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  const selectedText = range.toString();
  if (!selectedText) return;

  const tempSpan = document.createElement('span');
  tempSpan.appendChild(range.extractContents());
  
  const existingStyle = tempSpan.style[styleProp];
  const shouldRemoveStyle = existingStyle === value;
  
  const cleanSpans = (element) => {
    if (element.nodeType === Node.ELEMENT_NODE && element.tagName === 'SPAN') {
      if (!element.getAttribute('style') && !element.attributes.length) {
        const parent = element.parentNode;
        while (element.firstChild) {
          parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
      } else if (element.style[styleProp] === defaultValue) {
        element.style[styleProp] = '';
        if (!element.getAttribute('style')) {
          element.removeAttribute('style');
        }
      }
    }
  };

  if (shouldRemoveStyle) {
    tempSpan.style[styleProp] = defaultValue;
    cleanSpans(tempSpan);
  } else {
    tempSpan.style[styleProp] = value;
  }

  Array.from(tempSpan.querySelectorAll('span')).forEach(cleanSpans);
  range.insertNode(tempSpan);
  selection.removeAllRanges();
}

function validateRowData(row) {
  const cells = row.querySelectorAll('td');
  return {
    isValid: cells[0].textContent.trim() !== '' || cells[1].textContent.trim() !== '',
    isEmpty: cells[0].textContent.trim() === '' && cells[1].textContent.trim() === ''
  };
}

function showLoading(show = true) {
  const loader = document.getElementById('table-loader') || document.createElement('div');
  if (show) {
    loader.id = 'table-loader';
    loader.className = 'loader';
    loader.innerHTML = '<div class="spinner"></div>';
    document.querySelector('.contracts-section').appendChild(loader);
  } else {
    loader.remove();
  }
}

window.applyBold = () => applyStyleToSelection('fontWeight', 'bold', 'normal');
window.applyRed = () => applyStyleToSelection('color', 'red', 'black');
window.applyBlue = () => applyStyleToSelection('color', 'blue', 'black');
window.applyBlack = () => applyStyleToSelection('color', 'black', 'black');
window.markImportant = () => applyStyleToSelection('backgroundColor', 'yellow', 'transparent');

window.addRow = async function addRow() {
  const table = document.getElementById('editableTable');
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  const colCount = 6;

  const newRow = document.createElement('tr');
  newRow.style.backgroundColor = (tbody.rows.length % 2 === 0) ? '#f9f9f9' : '#ffffff';

  for (let i = 0; i < colCount; i++) {
    const td = document.createElement('td');
    td.style.padding = '10px';
    td.style.border = '1px solid #ddd';
    td.style.backgroundColor = newRow.style.backgroundColor;
    
    if (i === 3) {
      const inputDate = document.createElement('input');
      inputDate.type = 'date';
      inputDate.className = 'prorroga-input';
      td.appendChild(inputDate);
    } else if (i === (colCount - 1)) {
      const btnDelete = document.createElement('button');
      btnDelete.innerText = 'Deletar';
      btnDelete.className = 'delete-btn';
      btnDelete.addEventListener('click', () => {
        const contractId = newRow.getAttribute('data-id');
        if (contractId) {
          deleteContract(contractId, newRow);
        } else {
          newRow.remove();
          notification.show('Linha removida localmente', 'info');
        }
      });
      td.appendChild(btnDelete);
    } else {
      td.setAttribute('contenteditable', 'true');
      td.innerHTML = i === 0 ? '<strong></strong>' : '';
    }
    newRow.appendChild(td);
  }
  tbody.appendChild(newRow);

  document.getElementById('updateTableBtn').style.display = 'inline-block';
  notification.show('Nova linha adicionada localmente', 'info');

  try {
    const docRef = await addDoc(contractsCollection, {
      sei: '',
      contrato: '',
      empresa: '',
      prorrogacao: '',
      pendencias: ''
    });
    newRow.setAttribute('data-id', docRef.id);
    notification.show('Linha salva no banco de dados', 'success');
  } catch (error) {
    console.error('Erro ao adicionar contrato:', error);
    notification.show('Erro ao salvar linha no banco de dados', 'error');
    newRow.remove();
  }
};

window.removeRow = async function removeRow(rowElement = null) {
  const table = document.getElementById('editableTable');
  if (!table) return;
  
  const tbody = table.querySelector('tbody');
  if (tbody.rows.length === 0) return;

  if (!rowElement) {
    const lastRow = tbody.rows[tbody.rows.length - 1];
    if (!confirm('Deseja remover a última linha da tabela?')) return;
    rowElement = lastRow;
  }

  const contractId = rowElement.getAttribute('data-id');
  if (contractId) {
    try {
      // Remove evento do calendário se existir
      const eventId = rowElement.getAttribute('data-event-id');
      if (eventId && window.removeEvent) {
        await window.removeEvent(eventId);
      }

      await deleteDoc(doc(db, 'contracts', contractId));
      rowElement.remove();
      notification.show('Linha removida com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao remover contrato:', error);
      notification.show('Erro ao remover linha', 'error');
    }
  } else {
    rowElement.remove();
    notification.show('Linha removida localmente', 'info');
  }
};

window.saveTableData = async function saveTableData() {
  const table = document.getElementById('editableTable');
  if (!table) return;
  
  const tbodyRows = table.querySelectorAll('tbody tr');
  let hasEmptyRows = false;
  let hasInvalidData = false;

  tbodyRows.forEach(row => {
    const { isValid, isEmpty } = validateRowData(row);
    if (!isEmpty && !isValid) {
      row.style.outline = '2px solid red';
      hasInvalidData = true;
    } else if (isEmpty) {
      hasEmptyRows = true;
    }
  });

  if (hasInvalidData) {
    notification.show('Corrija os dados destacados antes de salvar', 'error');
    return;
  }

  if (hasEmptyRows && !confirm('Algumas linhas estão vazias. Deseja salvar mesmo assim?')) {
    return;
  }

  showLoading(true);

  try {
    for (const row of tbodyRows) {
      const contractId = row.getAttribute('data-id');
      if (!contractId) continue;

      const cells = row.querySelectorAll('td');
      let prorrogacaoValue = '';
      const inputDate = cells[3].querySelector('input');
      if (inputDate) prorrogacaoValue = inputDate.value.trim();

      const updatedData = {
        sei: cells[0].innerText.trim(),
        contrato: cells[1].innerText.trim(),
        empresa: cells[2].innerText.trim(),
        prorrogacao: prorrogacaoValue,
        pendencias: cells[4].innerText.trim()
      };

      await setDoc(doc(db, 'contracts', contractId), updatedData, { merge: true });

      // Integração com o calendário - CORREÇÃO ADICIONADA AQUI
      if (prorrogacaoValue) {
        const eventDate = new Date(prorrogacaoValue + 'T00:00');
        const eventTitle = `Prorrogação: ${updatedData.contrato} (${updatedData.empresa})`;
        
        let eventId = row.getAttribute('data-event-id');
        if (eventId && window.updateEvent) {
          await window.updateEvent({ 
            id: eventId, 
            title: eventTitle, 
            start: eventDate,
            extendedProps: { contractId }
          });
        } else if (window.addEvent) {
          const newEventId = await window.addEvent({
            title: eventTitle,
            start: eventDate,
            allDay: true,
            extendedProps: { contractId }
          });
          
          if (newEventId) {
            row.setAttribute('data-event-id', newEventId);
            await setDoc(doc(db, 'contracts', contractId), { 
              prorrogacaoEventId: newEventId 
            }, { merge: true });
          }
        }
      } else {
        // Se a data foi removida, remove o evento do calendário
        const eventId = row.getAttribute('data-event-id');
        if (eventId && window.removeEvent) {
          await window.removeEvent(eventId);
          row.removeAttribute('data-event-id');
          await setDoc(doc(db, 'contracts', contractId), { 
            prorrogacaoEventId: null 
          }, { merge: true });
        }
      }
    }
    
    notification.show('Alterações salvas com sucesso!', 'success');
    document.getElementById('updateTableBtn').style.display = 'none';
  } catch (error) {
    console.error('Erro ao salvar contratos:', error);
    notification.show('Erro ao salvar alterações', 'error');
  } finally {
    showLoading(false);
  }
};

window.renderTabelaContratos = function renderTabelaContratos() {
  const table = document.getElementById('editableTable');
  if (!table) {
    console.log('Tabela de contratos não encontrada!');
    return;
  }

  if (contractsSnapshotUnsubscribe) {
    contractsSnapshotUnsubscribe();
  }

  const tbody = table.querySelector('tbody');
  showLoading(true);

  contractsSnapshotUnsubscribe = onSnapshot(contractsCollection, 
    (snapshot) => {
      tbody.innerHTML = '';
      snapshot.forEach(docSnap => {
        const contract = docSnap.data();
        const tr = document.createElement('tr');
        tr.style.backgroundColor = (tbody.rows.length % 2 === 0) ? '#f9f9f9' : '#ffffff';
        
        const tdSei = document.createElement('td');
        tdSei.setAttribute('contenteditable', 'true');
        tdSei.innerHTML = contract.sei ? `<strong>${contract.sei}</strong>` : '<strong></strong>';

        const tdContrato = document.createElement('td');
        tdContrato.setAttribute('contenteditable', 'true');
        tdContrato.textContent = contract.contrato || '';

        const tdEmpresa = document.createElement('td');
        tdEmpresa.setAttribute('contenteditable', 'true');
        tdEmpresa.textContent = contract.empresa || '';

        const tdProrrogacao = document.createElement('td');
        const inputDate = document.createElement('input');
        inputDate.type = 'date';
        inputDate.className = 'prorroga-input';
        inputDate.value = formatDateForInput(contract.prorrogacao);
        tdProrrogacao.appendChild(inputDate);

        const tdPendencias = document.createElement('td');
        tdPendencias.setAttribute('contenteditable', 'true');
        tdPendencias.textContent = contract.pendencias || '';

        const tdAcoes = document.createElement('td');
        const btnDelete = document.createElement('button');
        btnDelete.innerText = 'Deletar';
        btnDelete.className = 'delete-btn';
        btnDelete.addEventListener('click', () => removeRow(tr));
        tdAcoes.appendChild(btnDelete);

        [tdSei, tdContrato, tdEmpresa, tdProrrogacao, tdPendencias, tdAcoes].forEach(td => {
          td.style.padding = '10px';
          td.style.border = '1px solid #ddd';
          td.style.backgroundColor = tr.style.backgroundColor;
        });

        tr.append(tdSei, tdContrato, tdEmpresa, tdProrrogacao, tdPendencias, tdAcoes);
        tr.setAttribute('data-id', docSnap.id);
        
        // Restaura a referência ao evento do calendário se existir
        if (contract.prorrogacaoEventId) {
          tr.setAttribute('data-event-id', contract.prorrogacaoEventId);
        }
        
        tbody.appendChild(tr);
      });
      showLoading(false);
    },
    (error) => {
      console.error('Erro ao carregar contratos:', error);
      notification.show('Erro ao carregar dados', 'error');
      showLoading(false);
    }
  );
};

window.deleteContract = async function deleteContract(contractId, rowElement) {
  if (!confirm('Tem certeza que deseja deletar este contrato permanentemente?')) {
    return;
  }

  showLoading(true);
  try {
    // Remove evento associado se existir
    const eventId = rowElement.getAttribute('data-event-id');
    if (eventId && window.removeEvent) {
      await window.removeEvent(eventId);
    }

    await deleteDoc(doc(db, 'contracts', contractId));
    rowElement.remove();
    notification.show('Contrato deletado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao deletar contrato:', error);
    notification.show('Erro ao deletar contrato', 'error');
  } finally {
    showLoading(false);
  }
};

window.initEditableTable = function initEditableTable() {
  window.renderTabelaContratos();

  const table = document.getElementById('editableTable');
  if (!table) {
    console.log('Tabela de contratos não encontrada para edição!');
    return;
  }

  table.addEventListener('input', () => {
    document.getElementById('updateTableBtn').style.display = 'inline-block';
  });

  table.addEventListener('click', updateSelection);
  table.addEventListener('keyup', updateSelection);
};

function updateSelection() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const editable = range.commonAncestorContainer.parentElement.closest('[contenteditable="true"]');
    if (editable) {
      const tools = document.getElementById('tableFormattingTools');
      if (tools.dataset.activeCell !== editable) {
        tools.dataset.activeCell = editable;
      }
    }
  }
}

window.addEventListener('beforeunload', () => {
  if (contractsSnapshotUnsubscribe) {
    contractsSnapshotUnsubscribe();
  }
});

function handleShortcuts(e) {
  if (e.target.closest('#editableTable') && e.ctrlKey) {
    switch (e.key) {
      case 'b':
        e.preventDefault();
        applyBold();
        break;
      case 'r':
        e.preventDefault();
        applyRed();
        break;
      case 'l':
        e.preventDefault();
        applyBlue();
        break;
    }
  }
}
document.addEventListener('keydown', handleShortcuts);