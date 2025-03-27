// js/ia.js

import { showNotification } from './utils.js'; // Importa sistema de notificação

/**
 * Configurações das ferramentas de IA (mantido igual)
 */
const IA_FERRAMENTAS = {
  chatgpt: 'https://chat.openai.com/',
  gemini: 'https://gemini.google.com/',
  perplexity: 'https://www.perplexity.ai/',
  copilot: 'https://copilot.microsoft.com/',
  deepseek: 'https://chat.deepseek.com/',
  claude: 'https://claude.ai/chat',
  grok: 'https://grok.x.ai/',
  lechat: 'https://chat.mistral.ai/',
  sabia: 'https://chat.maritaca.ai/',
  qwenchat: 'https://chat.qwen.ai/',
  iadod: 'https://www.iadod.com.br/'
};

/**
 * Cria e insere o botão "Habilitar".
 * @param {HTMLElement} originalButton - O botão da IA que foi desabilitado.
 * @returns {HTMLElement | null} O botão "Habilitar" criado ou null em caso de erro.
 */
function createAndInsertEnableButton(originalButton) {
    console.log('[IA HABILITAR] Criando botão Habilitar para:', originalButton.id);
    if (!originalButton || !originalButton.parentNode) {
        console.error('[IA HABILITAR] Botão original ou pai não encontrado!');
        return null;
    }

    // Remove qualquer botão "Habilitar" existente para este target (precaução)
    const existingEnableButton = originalButton.parentNode.querySelector(`.btnEnableIa[data-target="${originalButton.id}"]`);
    existingEnableButton?.remove();

    const enableButton = document.createElement('button');
    enableButton.textContent = 'Habilitar';
    enableButton.className = 'btnEnableIa btn btn-danger btn-small'; // Vermelho
    enableButton.style.marginLeft = '5px';
    enableButton.dataset.target = originalButton.id;

    // Ação do botão "Habilitar" (quando o *usuário* clicar)
    enableButton.onclick = (e) => {
        e.stopPropagation();
        console.log(`[IA HABILITAR] Botão Habilitar (USER CLICK) para target: ${enableButton.dataset.target}`);
        const targetButton = document.getElementById(enableButton.dataset.target);
        if (targetButton) {
            console.log('[IA HABILITAR] Re-habilitando botão original:', targetButton.id);
            targetButton.disabled = false; // Reabilita
            targetButton.classList.remove('disabled');
        } else {
            console.error('[IA HABILITAR] Botão original NÃO encontrado ID:', enableButton.dataset.target);
        }
        console.log('[IA HABILITAR] Removendo botão Habilitar.');
        enableButton.remove(); // Remove a si mesmo
    };

    try {
        originalButton.insertAdjacentElement('afterend', enableButton);
        console.log('[IA HABILITAR] Botão Habilitar inserido após:', originalButton.id);
        return enableButton;
    } catch (insertError) {
        console.error('[IA HABILITAR] Erro ao inserir botão Habilitar:', insertError);
        return null;
    }
}

/**
 * Manipulador de evento para clique nos botões de IA (Desabilitar/Habilitar).
 * @param {Event} event - O evento de clique.
 */
function handleIaButtonClickDisable(event) {
    const button = event.currentTarget;
    const url = button.dataset.url;
    console.log(`[IA HABILITAR] Botão clicado: ${button.id || button.textContent}, URL: ${url}`);

    if (!button.id) {
        button.id = `iaBtn-${url.replace(/[^a-zA-Z0-9]/g, '') || Math.random().toString(16).slice(2)}`;
    }

    // Sai se não tem URL ou se JÁ ESTÁ DESABILITADO
    if (!url || button.disabled) {
        console.log(`[IA HABILITAR] Ação ignorada: URL=${!!url}, disabled=${button.disabled}`);
        return;
    }

    // 1. Desabilita o botão original
    button.disabled = true;
    button.classList.add('disabled');
    console.log(`[IA HABILITAR] Botão ${button.id} desabilitado.`);

    // 2. Cria e insere o botão "Habilitar"
    const enableButton = createAndInsertEnableButton(button);
    if (!enableButton) {
        // Se falhou ao criar/inserir, reabilita o botão original como fallback
        console.error("[IA HABILITAR] Falha ao criar/inserir botão Habilitar. Revertendo.");
        button.disabled = false;
        button.classList.remove('disabled');
        return;
    }

    // 3. Tenta abrir a nova aba
    try {
        console.log(`[IA HABILITAR] Tentando abrir URL: ${url}`);
        const newTab = window.open(url, '_blank', 'noopener,noreferrer');

        if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
            // Popup bloqueado
            console.warn("[IA HABILITAR] Popup bloqueado.");
            showNotification('Abertura de pop-up bloqueada! Clique em "Habilitar" para tentar novamente.', 'warning', 7000); // Mensagem atualizada
            // **NÃO reverte mais automaticamente** - O botão "Habilitar" permanece visível.
        } else {
            // Abriu com sucesso
            console.log(`[IA HABILITAR] URL ${url} aberta.`);
            // O botão "Habilitar" permanece visível, permitindo ao usuário reabilitar o original se desejar.
        }
    } catch (error) {
        console.error(`[IA HABILITAR] Erro ao abrir ${url}:`, error);
        showNotification(`Erro ao abrir: ${error.message}`, 'error');
        // **NÃO reverte mais automaticamente em caso de erro** - deixa o botão Habilitar
        // Se desejar reverter em caso de erro (exceto popup), descomente a linha abaixo:
        // if (enableButton) enableButton.click();
    }
}

/**
 * Inicializa a seção de Ferramentas de IA.
 */
export function initIA() {
    // ... (lógica mantida igual - apenas adiciona o listener handleIaButtonClickDisable) ...
    console.log("[IA HABILITAR] Iniciando initIA...");
    const iaButtonsContainer = document.querySelector('.ia-buttons');
    if (!iaButtonsContainer) { console.error('[IA HABILITAR] Container .ia-buttons não encontrado.'); return; }
    const buttons = iaButtonsContainer.querySelectorAll('.btnIA');
    console.log(`[IA HABILITAR] ${buttons.length} botões .btnIA encontrados.`);
    buttons.forEach((button, index) => {
        const url = button.dataset.url;
        if (url) {
            if (!button.id) button.id = `iaBtn-init-${index}`;
            console.log(`[IA HABILITAR] Adicionando listener ao botão: ${button.id}`);
            button.removeEventListener('click', handleIaButtonClickDisable); // Limpa anterior
            button.addEventListener('click', handleIaButtonClickDisable); // Adiciona novo
        } else {
            console.warn('[IA HABILITAR] Botão IA sem data-url, desabilitando:', button);
            button.disabled = true; button.title = 'URL não configurada';
        }
    });
    console.log('[IA HABILITAR] Módulo de IA inicializado (Lógica Habilitar Persistente).');
}