// js/auth.js

// Importa a instância do Firestore do arquivo firebase.js
import { db } from './firebase.js';

// Importa funções específicas do Firestore para trabalhar com coleções
import { collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Cria referência para a coleção 'users' no Firestore
const usersCollection = collection(db, 'users');

/* 
 * Função de login que:
 * 1. Verifica se o usuário já existe (se existir, checa a senha)
 * 2. Se não existir, cadastra novo usuário
 */
window.login = async function login() {

  // Obtém o valor do campo de usuário
  const username = document.getElementById('username').value.trim();

  // Obtém o valor do campo de senha
  const password = document.getElementById('password').value.trim();

  // Verifica se os campos estão vazios
  if (!username || !password) {
    // Exibe alerta se campos estiverem vazios
    alert('Preencha usuário e senha!');
    return;
  }

  // Cria query para buscar usuário no Firestore
  const q = query(usersCollection, where("username", "==", username));

  // Executa a query e obtém os resultados
  const querySnapshot = await getDocs(q);

  // Verifica se encontrou algum usuário
  if (!querySnapshot.empty) {
    // Obtém o primeiro documento encontrado
    const userDoc = querySnapshot.docs[0];
    
    // Obtém os dados do documento
    const userData = userDoc.data();

    // Compara a senha armazenada com a fornecida
    if (userData.password === password) {
      // Exibe mensagem de sucesso
      alert('Login bem-sucedido!');
      
      // Oculta a tela de login
      document.getElementById('loginScreen').style.display = 'none';
    } else {
      // Exibe mensagem de erro
      alert('Senha incorreta! Tente novamente.');
    }
    return;
  }

  // Bloco try-catch para tratamento de erros
  try {
    // Adiciona novo usuário ao Firestore
    await addDoc(usersCollection, { username, password });
    
    // Exibe mensagem de sucesso
    alert('Cadastro realizado! Logado no sistema.');
    
    // Oculta a tela de login
    document.getElementById('loginScreen').style.display = 'none';
  } catch (error) {
    // Loga erro no console
    console.error('Erro ao salvar login:', error);
    
    // Exibe mensagem de erro
    alert('Erro ao salvar login. Tente novamente.');
  }
};