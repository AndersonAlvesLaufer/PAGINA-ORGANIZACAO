// js/contracts.js

import { db } from './firebase.js';
import { collection, addDoc, doc, onSnapshot, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Coleção no Firestore para os contratos
const contractsCollection = collection(db, 'contracts');

/**
 * Função auxiliar para aplicar ou alternar um estilo (formatação) no texto selecionado.
 */
function applyStyleToSelection(styleProp, value, defaultValue = '') {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const selectedText = range.toString();
  if (!selectedText) return;

  // Verifica se já há um <span> com o estilo aplicado
  const parentSpan = range.commonAncestorContainer.parentElement;
  if (parentSpan && parentSpan.nodeName === 'SPAN' && parentSpan.style[styleProp]) {
    const currentValue = parentSpan.style[styleProp];
    if (currentValue === value) {
      parentSpan.style[styleProp] = defaultValue;
      if (!parentSpan.getAttribute('style')) {
        const textNode = document.createTextNode(parentSpan.textContent);
        parentSpan.parentNode.replaceChild(textNode, parentSpan);
      }
      selection.removeAllRanges();
      return;
    }
  }
  const span = document.createElement('span');
  span.style[styleProp] = value;
  span.appendChild(range.extractContents());
  range.insertNode(span);
  selection.removeAllRanges();
}

// Funções de formatação acionadas pelos botões
window.applyBold = () => applyStyleToSelection('fontWeight', 'bold', 'normal');
window.applyRed = () => applyStyleToSelection('color', 'red', 'black');
window.applyBlue = () => applyStyleToSelection('color', 'blue', 'black');
window.applyBlack = () => applyStyleToSelection('color', 'black', 'black');
window.markImportant = () => applyStyleToSelection('backgroundColor', 'yellow', 'transparent');

/**
 * Adiciona uma nova linha à tabela e cria um documento no Firestore.
 */
window.addRow = async function addRow() {
  const table = document.getElementById('editableTable');
  if (!table) return;
  const tbody = table.querySelector('tbody');
  const colCount = 5; // fixo para 5 colunas

  // Cria nova linha
  const newRow = document.createElement('tr');
  // Define fundo alternado: usar lógica simples (pode ser aprimorado)
  newRow.style.backgroundColor = (tbody.rows.length % 2 === 0) ? '#f9f9f9' : '#ffffff';

  // Cria 5 células para os campos
  for (let i = 0; i < colCount; i++) {
    const td = document.createElement('td');
    td.style.padding = '10px';
    td.style.border = '1px solid #ddd';
    // Para manter o padrão de fundo invertido entre as células, podemos definir individualmente
    td.style.backgroundColor = newRow.style.backgroundColor;
    td.setAttribute('contenteditable', 'true');
    // Valor padrão para nova linha: se for a coluna SEI, podemos colocar um <strong> vazio
    if (i === 0) {
      td.innerHTML = '<strong></strong>';
    } else {
      td.textContent = '';
    }
    newRow.appendChild(td);
  }
  tbody.appendChild(newRow);
  
  document.getElementById('updateTableBtn').style.display = 'inline-block';
  
  // Cria documento no Firestore com valores iniciais (vazios)
  try {
    const docRef = await addDoc(contractsCollection, {
      sei: '',
      contrato: '',
      empresa: '',
      prorrogacao: '',
      pendencias: ''
    });
    newRow.setAttribute('data-id', docRef.id);
    alert('Linha adicionada com sucesso!');
  } catch (error) {
    console.error('Erro ao adicionar contrato:', error);
    alert('Erro ao adicionar linha. Tente novamente.');
    newRow.remove();
  }
};

/**
 * Remove a última linha da tabela e exclui o documento correspondente no Firestore.
 */
window.removeRow = async function removeRow() {
  const table = document.getElementById('editableTable');
  if (!table) return;
  const tbody = table.querySelector('tbody');
  if (tbody.rows.length === 0) return;
  const lastRow = tbody.rows[tbody.rows.length - 1];
  const contractId = lastRow.getAttribute('data-id');
  if (contractId) {
    try {
      await deleteDoc(doc(db, 'contracts', contractId));
      lastRow.remove();
      alert('Linha removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover contrato:', error);
      alert('Erro ao remover linha. Tente novamente.');
    }
  } else {
    lastRow.remove();
  }
};

/**
 * Salva os dados da tabela no Firestore.
 */
window.saveTableData = function saveTableData() {
  const table = document.getElementById('editableTable');
  if (!table) return;
  const tbodyRows = table.querySelectorAll('tbody tr');
  
  tbodyRows.forEach(row => {
    const contractId = row.getAttribute('data-id');
    if (contractId) {
      const cells = row.querySelectorAll('td');
      const updatedData = {
        sei: cells[0].innerText.trim(),
        contrato: cells[1].innerText.trim(),
        empresa: cells[2].innerText.trim(),
        prorrogacao: cells[3].innerText.trim(),
        pendencias: cells[4].innerText.trim()
      };
      setDoc(doc(db, 'contracts', contractId), updatedData, { merge: true })
        .catch(error => {
          console.error('Erro ao atualizar contrato:', error);
          alert('Erro ao salvar alterações. Tente novamente.');
        });
    }
  });
  alert('Alterações salvas com sucesso!');
  document.getElementById('updateTableBtn').style.display = 'none';
};

/**
 * Monitora a coleção "contracts" em tempo real e renderiza a tabela.
 */
window.renderTabelaContratos = function renderTabelaContratos() {
  const table = document.getElementById('editableTable');
  if (!table) {
    console.log('Tabela de contratos não encontrada!');
    return;
  }
  const tbody = table.querySelector('tbody');

  onSnapshot(contractsCollection, (snapshot) => {
    tbody.innerHTML = '';
    snapshot.forEach(docSnap => {
      const contract = docSnap.data();
      const tr = document.createElement('tr');
      // Alterna fundo entre linhas para efeito de zebra (simples exemplo)
      tr.style.backgroundColor = (tbody.rows.length % 2 === 0) ? '#f9f9f9' : '#ffffff';
      
      // Cria as 5 células com os dados
      const tdSei = document.createElement('td');
      tdSei.style.padding = '10px';
      tdSei.style.border = '1px solid #ddd';
      tdSei.style.backgroundColor = tr.style.backgroundColor;
      tdSei.setAttribute('contenteditable', 'true');
      // Se o campo "sei" estiver preenchido, insere-o dentro de <strong>
      tdSei.innerHTML = contract.sei ? `<strong>${contract.sei}</strong>` : '<strong></strong>';

      const tdContrato = document.createElement('td');
      tdContrato.style.padding = '10px';
      tdContrato.style.border = '1px solid #ddd';
      tdContrato.style.backgroundColor = tr.style.backgroundColor;
      tdContrato.setAttribute('contenteditable', 'true');
      tdContrato.innerText = contract.contrato || '';

      const tdEmpresa = document.createElement('td');
      tdEmpresa.style.padding = '10px';
      tdEmpresa.style.border = '1px solid #ddd';
      tdEmpresa.style.backgroundColor = tr.style.backgroundColor;
      tdEmpresa.setAttribute('contenteditable', 'true');
      tdEmpresa.innerText = contract.empresa || '';

      const tdProrrogacao = document.createElement('td');
      tdProrrogacao.style.padding = '10px';
      tdProrrogacao.style.border = '1px solid #ddd';
      tdProrrogacao.style.backgroundColor = tr.style.backgroundColor;
      tdProrrogacao.setAttribute('contenteditable', 'true');
      tdProrrogacao.innerText = contract.prorrogacao || '';

      const tdPendencias = document.createElement('td');
      tdPendencias.style.padding = '10px';
      tdPendencias.style.border = '1px solid #ddd';
      tdPendencias.style.backgroundColor = tr.style.backgroundColor;
      tdPendencias.setAttribute('contenteditable', 'true');
      tdPendencias.innerText = contract.pendencias || '';

      tr.append(tdSei, tdContrato, tdEmpresa, tdProrrogacao, tdPendencias);
      tr.setAttribute('data-id', docSnap.id);
      tbody.appendChild(tr);
    });
  }, error => {
    console.error('Erro ao carregar contratos:', error);
  });
};

/**
 * Inicializa a tabela editável: renderiza os dados e configura o salvamento automático.
 */
window.initEditableTable = function initEditableTable() {
  window.renderTabelaContratos();

  const table = document.getElementById('editableTable');
  if (!table) {
    console.log('Tabela de contratos não encontrada para edição!');
    return;
  }

  // Quando o usuário editar uma célula, mostra o botão de salvar
  table.addEventListener('input', () => {
    document.getElementById('updateTableBtn').style.display = 'inline-block';
  });

  // Configura atalhos e seleção para formatação (opcional)
  table.addEventListener('click', () => updateSelection());
  table.addEventListener('keyup', () => updateSelection());
};

/**
 * Atualiza a célula ativa para formatação (usado pelos botões de formatação).
 */
function updateSelection() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const editable = range.commonAncestorContainer.parentElement.closest('[contenteditable="true"]');
    if (editable) {
      document.getElementById('tableFormattingTools').dataset.activeCell = '';
      // Para identificar a célula de forma única, pode-se definir um seletor ou armazenar uma referência
      // Exemplo: armazenando um atributo data-activeCell com um identificador exclusivo
      // Neste exemplo, usaremos a referência direta:
      document.getElementById('tableFormattingTools').dataset.activeCell = editable;
    }
  }
}

// Opcional: atalhos de teclado para formatação
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
document.addEventListener('keydown', handleShortcuts);
