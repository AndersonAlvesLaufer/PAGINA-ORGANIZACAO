// js/ia.js

/**
 * Configurações das ferramentas de IA
 * Formato: { [chave]: url }
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
 * Gerencia a exibição das ferramentas de IA
 * @param {string} ferramenta - Chave da ferramenta no objeto IA_FERRAMENTAS
 * @param {HTMLElement} botao - Elemento do botão clicado
 */
window.mostrarIA = function(ferramenta, botao) {
  // Impede múltiplos cliques
  if (botao.disabled) return;

  // Desativa o botão imediatamente
  botao.disabled = true;
  botao.classList.add('disabled');

  // Cria botão de restauração
  const botaoRestaurar = criarBotaoRestaurar(botao);

  // Tenta abrir a ferramenta
  try {
    const novaAba = window.open(IA_FERRAMENTAS[ferramenta], '_blank');
    
    // Se o navegador bloqueou a abertura
    if (!novaAba) {
      throw new Error('Popup bloqueado');
    }
  } catch (erro) {
    console.error('Falha ao abrir ferramenta:', erro);
    gerenciarErro(botao, botaoRestaurar);
  }
};

/**
 * Cria o botão de restauração com comportamento adequado
 */
function criarBotaoRestaurar(botaoOriginal) {
  const botao = document.createElement('button');
  botao.textContent = 'Restaurar';
  botao.className = 'btnRestaurar';
  
  botao.onclick = () => {
    botaoOriginal.disabled = false;
    botaoOriginal.classList.remove('disabled');
    botao.remove();
  };

  botaoOriginal.parentNode.insertBefore(botao, botaoOriginal.nextSibling);
  return botao;
}

/**
 * Trata erros de abertura de janela
 */
function gerenciarErro(botao, botaoRestaurar) {
  // Reverte o estado após breve delay para feedback visual
  setTimeout(() => {
    botao.disabled = false;
    botao.classList.remove('disabled');
    botaoRestaurar.remove();
  }, 1000);

  alert('Permita abertura de pop-ups para usar esta funcionalidade!');
}