// js/utils.js

import { db } from './firebase.js';

// --- Notificações, Spinners, Modals (mantidos iguais à resposta anterior) ---
const notificationContainer = document.getElementById('notificationContainer');
export function showNotification(message, type = 'info', duration = 3000) { /* ... (código completo igual) ... */ if (!notificationContainer) { console.error('Container notificações não encontrado!'); return; } const validType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info'; const notification = document.createElement('div'); notification.className = `notification notification-${validType}`; notification.setAttribute('role', 'alert'); let iconClass = 'fa-solid fa-circle-info'; if (validType === 'success') iconClass = 'fa-solid fa-check-circle'; if (validType === 'error') iconClass = 'fa-solid fa-times-circle'; if (validType === 'warning') iconClass = 'fa-solid fa-exclamation-triangle'; notification.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i><span>${message}</span>`; const closeButton = document.createElement('button'); closeButton.innerHTML = '&times;'; closeButton.className = 'notification-close-btn'; closeButton.setAttribute('aria-label', 'Fechar notificação'); notification.appendChild(closeButton); notificationContainer.appendChild(notification); void notification.offsetWidth; notification.classList.add('show'); const timeoutId = setTimeout(() => { if (notification.parentNode === notificationContainer) { notification.classList.remove('show'); notification.classList.add('fade-out'); notification.addEventListener('transitionend', () => { if (notification.parentNode === notificationContainer) notification.remove(); }, { once: true }); } }, duration); closeButton.onclick = () => { clearTimeout(timeoutId); if (notification.parentNode === notificationContainer) { notification.classList.remove('show'); notification.classList.add('fade-out'); notification.addEventListener('transitionend', () => { if (notification.parentNode === notificationContainer) notification.remove(); }, { once: true }); } }; }
export function showSpinner(containerId) { const container = document.getElementById(containerId); if (container) container.style.display = 'flex'; }
export function hideSpinner(containerId) { const container = document.getElementById(containerId); if (container) container.style.display = 'none'; }
export function openModal(modalId) { const modalOverlay = document.getElementById(modalId); if (modalOverlay) { modalOverlay.style.display = 'block'; const focusableElement = modalOverlay.querySelector('input:not([type="hidden"]), textarea, button:not([disabled])'); if (focusableElement) setTimeout(() => focusableElement.focus(), 50); document.addEventListener('keydown', handleEscKey); } else console.error(`Modal ID "${modalId}" não encontrado.`); }
export function closeModal(modalId) { const modalOverlay = document.getElementById(modalId); if (modalOverlay) { modalOverlay.style.display = 'none'; const anyModalOpen = document.querySelector('.modal-overlay[style*="display: block"]'); if (!anyModalOpen) document.removeEventListener('keydown', handleEscKey); } }
function handleEscKey(event) { if (event.key === 'Escape') { const openModals = document.querySelectorAll('.modal-overlay[style*="display: block"]'); if (openModals.length > 0) closeModal(openModals[openModals.length - 1].id); } }

// --- Seções Recolhíveis (Listener SÓ no botão) ---
function setupCollapsibleSections() {
  const collapseButtons = document.querySelectorAll('.collapse-btn'); // Seleciona SÓ os botões
  const sectionStates = JSON.parse(localStorage.getItem('sectionStates') || '{}');
  collapseButtons.forEach(button => {
      const controlsId = button.getAttribute('aria-controls');
      const sectionContent = controlsId ? document.getElementById(controlsId) : null;
      const sectionKey = button.closest('.section-container')?.id || button.closest('.outlook-calendar-wrapper')?.id || controlsId;
      if (!sectionContent || !sectionKey) { console.warn('Botão recolher sem conteúdo/chave:', button); return; }

      // Restaura estado
      const isCollapsed = sectionStates[sectionKey] === 'collapsed';
      sectionContent.classList.toggle('collapsed', isCollapsed);
      button.setAttribute('aria-expanded', !isCollapsed);
      const icon = button.querySelector('i');
      if (icon) icon.className = `fas fa-chevron-${isCollapsed ? 'down' : 'up'}`; // Define classe correta

      // Listener APENAS no botão
      button.addEventListener('click', (e) => {
          e.stopPropagation();
          const isCurrentlyExpanded = button.getAttribute('aria-expanded') === 'true';
          sectionContent.classList.toggle('collapsed', isCurrentlyExpanded);
          button.setAttribute('aria-expanded', !isCurrentlyExpanded);
          const icon = button.querySelector('i');
          if (icon) icon.className = `fas fa-chevron-${isCurrentlyExpanded ? 'down' : 'up'}`; // Troca ícone
          sectionStates[sectionKey] = isCurrentlyExpanded ? 'collapsed' : 'expanded';
          try { localStorage.setItem('sectionStates', JSON.stringify(sectionStates)); }
          catch (err) { console.error("Erro salvar estado seções:", err); }
      });
  });
}

// --- Inicialização (Com try...catch por módulo) ---
export async function initializeApp() {
  console.log('Iniciando aplicação...');
  try {
      await import('./theme.js').then(m => m.initTheme && m.initTheme()).catch(e => console.error("Erro inicializando Tema:", e));
      await import('./notes.js').then(m => m.initNotes && m.initNotes()).catch(e => console.error("Erro inicializando Notas:", e));
      await import('./tasks.js').then(m => m.initTasks && m.initTasks()).catch(e => console.error("Erro inicializando Tarefas:", e));
      // Subitems é importado mas inicializado por Categories
      await import('./subitems.js').catch(e => console.error("Erro importando Subitems:", e));
      await import('./categories.js').then(m => m.initCategories && m.initCategories()).catch(e => console.error("Erro inicializando Categorias:", e));
      await import('./contracts.js').then(m => m.initContracts && m.initContracts()).catch(e => console.error("Erro inicializando Contratos:", e));
      await import('./calendar.js').then(m => m.initCalendar && m.initCalendar()).catch(e => console.error("Erro inicializando Calendário:", e));
      await import('./ia.js').then(m => m.initIA && m.initIA()).catch(e => console.error("Erro inicializando IA:", e));

      // Setup final após todos carregarem (ou tentarem carregar)
      setupCollapsibleSections();
      console.log('Inicialização concluída (verificar erros acima).');

  } catch (error) {
    // Erro mais geral durante o processo de importação/inicialização
    console.error('Erro fatal durante configuração inicial:', error);
    showNotification('Erro crítico ao configurar a aplicação.', 'error', 10000);
  }
}
// Listener DOMContentLoaded mantido
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initializeApp); } else { initializeApp(); }