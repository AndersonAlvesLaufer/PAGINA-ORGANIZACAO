// js/ia.js

import { db } from './firebase.js';
import { collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const iaPreferences = collection(db, 'iaPreferences');
const iaAbas = {};

/**
 * Abre uma nova aba/janela para a ferramenta de IA escolhida,
 * desabilita o botão e oferece um botão de "Restaurar".
 */
window.mostrarIA = function mostrarIA(nomeIA, btn) {
  if (btn.disabled) return;

  btn.disabled = true;
  btn.classList.add('disabled');

  const restoreBtn = document.createElement('button');
  restoreBtn.textContent = "Restaurar";
  restoreBtn.className = "btnRestaurar";
  restoreBtn.onclick = function () {
    btn.disabled = false;
    btn.classList.remove('disabled');
    restoreBtn.remove();
  };
  btn.parentNode.insertBefore(restoreBtn, btn.nextSibling);

  // URLs das IAs
  const urls = {
    'chatgpt':    "https://chatgpt.com/",
    'gemini':     "https://gemini.google.com",
    'perplexity': "https://www.perplexity.ai/",
    'copilot':    "https://m365.cloud.microsoft/chat?auth=2",
    'deepseek':   "https://chat.deepseek.com/",
    'claude':     "https://claude.ai/new/",
    'grok':       "https://grok.com/?referrer=website",
    'lechat':     "https://chat.mistral.ai/chat",
    'sabia':      "https://chat.maritaca.ai/",
    'qwenchat':   "https://chat.qwen.ai/",
    'iadod':      "https://iadod.com.br/"
  };

  const url = urls[nomeIA];
  if (!url) {
    console.error("IA não reconhecida:", nomeIA);
    return;
  }

  const windowName = `iaWindow_${nomeIA}`;
  let iaWindow = window.open('', windowName);
  if (iaWindow && iaWindow.location.href === 'about:blank') {
    iaWindow.location.href = url;
  } else if (iaWindow && !iaWindow.closed) {
    iaWindow.focus();
    iaAbas[nomeIA] = iaWindow;
    return;
  } else {
    iaWindow = window.open(url, windowName,
      `width=800,height=600,left=${window.screenX + 50},top=${window.screenY + 50}`);
    if (iaWindow) {
      iaAbas[nomeIA] = iaWindow;
      // Opcional: salvar no Firestore a última IA usada
      // setDoc(doc(iaPreferences, 'userIA'), { lastUsedIA: nomeIA }, { merge: true });
    } else {
      console.error("Falha ao abrir a janela para", nomeIA);
      alert("Não foi possível abrir a ferramenta de IA. Verifique sua conexão ou permissões.");
    }
  }
};
