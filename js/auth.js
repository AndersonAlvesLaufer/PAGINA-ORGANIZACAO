// js/auth.js

import { db } from './firebase.js';
import { collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

const usersCollection = collection(db, 'users');

/**
 * Função de login que:
 * 1. Verifica se o usuário já existe (se existir, checa a senha).
 * 2. Se não existir, cadastra um novo usuário com a senha fornecida.
 */
window.login = async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    alert('Preencha usuário e senha!');
    return;
  }

  const q = query(usersCollection, where("username", "==", username));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    // Usuário existe, valida a senha
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    if (userData.password === password) {
      alert('Login bem-sucedido!');
      document.getElementById('loginScreen').style.display = 'none';
    } else {
      alert('Senha incorreta! Tente novamente.');
    }
    return;
  }

  // Se não existe, cadastra novo usuário
  try {
    await addDoc(usersCollection, { username, password });
    alert('Cadastro realizado! Logado no sistema.');
    document.getElementById('loginScreen').style.display = 'none';
  } catch (error) {
    console.error('Erro ao salvar login:', error);
    alert('Erro ao salvar login. Tente novamente.');
  }
};
