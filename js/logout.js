import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

const auth = getAuth();

window.logout = async function () {
  try {
    await signOut(auth);
    document.getElementById("loginMessage").textContent = "Você saiu com sucesso.";
    document.getElementById("loginScreen").style.display = "block";
  } catch (error) {
    console.error("Erro ao sair:", error);
    document.getElementById("loginMessage").textContent = "Erro ao sair.";
  }
};