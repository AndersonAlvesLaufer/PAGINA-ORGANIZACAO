// js/auth.js (Atualizado - CORRIGIDO ERRO FIREBASE DUPLICADO)

// REMOVIDO: import { initializeApp } from "...";
// Importa APENAS as funções de autenticação necessárias
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Importa a instância 'app' ou 'db' já inicializada de firebase.js
// Se firebase.js exporta 'app':
// import { app } from './firebase.js';
// Se firebase.js exporta 'db':
import { db } from './firebase.js'; // Assumindo que db é exportado, mas precisamos do auth
// Melhor: Modificar firebase.js para exportar 'app' ou criar e exportar 'auth' lá.

// ***** Alternativa SIMPLES se firebase.js SÓ exporta 'db' *****
// Vamos pegar a instância 'auth' associada ao 'db' (que usa o app [DEFAULT])
const auth = getAuth(db.app); // Pega o 'auth' do app padrão já inicializado pelo Firestore
// ***************************************************************


// --- Elementos do DOM ---
// É mais seguro buscar os elementos mais perto de onde são usados ou garantir
// que o script rode após DOMContentLoaded, mas vamos manter aqui por enquanto
// e REFORÇAR a verificação dos IDs no HTML.
const loginScreen = document.getElementById("loginScreen");
const mainContent = document.getElementById("mainContent");
const loginMessage = document.getElementById("loginMessage");
const loginButton = document.getElementById("loginButton"); // PRECISA TER ESSE ID NO HTML
const emailInput = document.getElementById("email");       // PRECISA TER ESSE ID NO HTML
const passwordInput = document.getElementById("password"); // PRECISA TER ESSE ID NO HTML


// --- Gerenciar estado de autenticação ---
// (Sem alterações nesta parte, ela está correta)
onAuthStateChanged(auth, (user) => {
  if (user) {
    if(loginScreen) loginScreen.style.display = "none";
    if(mainContent) mainContent.style.display = "block";
    if(loginMessage) loginMessage.textContent = "";
  } else {
    if(loginScreen) loginScreen.style.display = "block";
    if(mainContent) mainContent.style.display = "none";
  }
});

// --- Função de login ---
async function login() {
   // RE-VERIFICAÇÃO: Garante que os elementos existem ANTES de usar os valores
   if (!emailInput || !passwordInput || !loginMessage || !loginButton) {
      console.error("Elementos de login não encontrados no DOM! Verifique os IDs no HTML: email, password, loginMessage, loginButton.");
      if (loginMessage) {
          loginMessage.textContent = "Erro interno: Falha ao carregar interface de login.";
          loginMessage.style.color = "red";
      }
      return; // Sai da função se os elementos não existem
   }

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // Validações (mantidas)
  if (!email) {
    loginMessage.textContent = "Por favor, insira seu email.";
    loginMessage.style.color = "red";
    emailInput.focus();
    return;
  }
  if (!password) {
    loginMessage.textContent = "Por favor, insira sua senha.";
    loginMessage.style.color = "red";
    passwordInput.focus();
    return;
  }

  loginMessage.textContent = "Entrando...";
  loginMessage.style.color = "gray";

  try {
    loginButton.disabled = true;
    await signInWithEmailAndPassword(auth, email, password);
    // Sucesso: onAuthStateChanged cuida da UI
  } catch (error) {
    console.error("Erro de autenticação:", error);
    // Mensagens de erro (mantidas - ajuste conforme necessidade)
    const errorMessages = {
      "auth/invalid-credential": "Email ou senha incorretos.",
      "auth/too-many-requests": "Muitas tentativas. Conta bloqueada temporariamente.",
      "auth/network-request-failed": "Erro de rede. Verifique sua conexão."
    };
    loginMessage.textContent = errorMessages[error.code] || "Erro no login.";
    loginMessage.style.color = "red";
  } finally {
    setTimeout(() => {
        if (loginButton) loginButton.disabled = false;
        if (loginMessage.style.color === "red") {
           // Mantém erro
        } else if (loginMessage.style.color === "gray") {
           loginMessage.textContent = ""; // Limpa "Entrando..."
        }
    }, 300);
  }
}

// --- Adicionar Eventos ---
// (Sem alterações, mas depende dos IDs corretos no HTML)
if (loginButton) {
    loginButton.addEventListener("click", login);
} else {
    // Este log agora apareceria se o botão não for encontrado logo no início
    console.error("Botão de login (ID: loginButton) não encontrado ao carregar a página.");
}
if (emailInput && passwordInput) {
    [emailInput, passwordInput].forEach(input => {
        input.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                login();
            }
        });
    });
}

// --- Função de Logout (Exportada Globalmente) ---
// (Sem alterações)
window.logout = async () => {
  console.log("Tentando fazer logout...");
  try {
    await signOut(auth);
    if (loginMessage) {
         loginMessage.textContent = "Você saiu com sucesso.";
         loginMessage.style.color = "green";
    }
    console.log("Logout realizado com sucesso.");
  } catch (error) {
    console.error("Erro ao sair:", error);
    if (loginMessage) {
        loginMessage.textContent = "Erro ao tentar sair.";
        loginMessage.style.color = "red";
    }
  }
};

// --- Inicialização do Módulo ---
console.log("Módulo Auth (v2) inicializado.");