/**
 * Aplicacao Admin CLIQUE·ZOOM
 */

import { appState, loadAppData, saveAppData } from './state.js';
import { resolveImagePath, copyToClipboard } from './utils/helpers.js';
import { uploadImage, showUploadProgress } from './utils/upload.js';
import { startNotificationPolling, stopNotificationPolling, toggleNotifications, markAllNotificationsRead, onNotifClick } from './utils/notifications.js';

const tabModules = {};

function setupNavigation() {
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.onclick = () => switchTab(tab.dataset.tab);
  });
}

async function initApp() {
  setupNavigation();

  if (!appState.authToken) {
    showLoginForm();
    return;
  }

  await loadAppData();
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'flex';
  startNotificationPolling();
  await switchTab('hero');
}

function showLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.style.display = 'flex';

  const loginBtn = loginForm.querySelector('button');
  const passwordInput = loginForm.querySelector('input[type="password"]');

  const doLogin = async () => {
    const password = passwordInput?.value;
    if (!password) { alert('Digite a senha'); return; }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!response.ok) throw new Error('Senha incorreta');

      const data = await response.json();
      appState.authToken = data.token;
      localStorage.setItem('authToken', data.token);

      loginForm.style.display = 'none';
      document.getElementById('adminPanel').style.display = 'flex';

      await loadAppData();
      startNotificationPolling();
      await switchTab('hero');
    } catch (error) {
      alert(error.message);
    }
  };

  if (loginBtn) loginBtn.onclick = doLogin;
  if (passwordInput) {
    passwordInput.onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
  }
}

async function switchTab(tabName) {
  appState.currentTab = tabName;
  const container = document.getElementById('tabContent');
  if (!container) return;

  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  container.innerHTML = '<p style="color:#9ca3af;">Carregando...</p>';

  if (!tabModules[tabName]) {
    try {
      tabModules[tabName] = await import(`./tabs/${tabName}.js`);
    } catch (error) {
      console.error(`Erro ao carregar tab ${tabName}:`, error);
      container.innerHTML = `<p style="color:#f87171;">Erro ao carregar aba: ${error.message}</p>`;
      return;
    }
  }

  if (appState.currentTab !== tabName) return;

  const mod = tabModules[tabName];
  const funcName = 'render' + tabName.charAt(0).toUpperCase() + tabName.slice(1);
  const renderFunc = mod[funcName];

  if (!renderFunc) {
    container.innerHTML = `<p style="color:#f87171;">Funcao ${funcName} nao encontrada</p>`;
    return;
  }

  try {
    await renderFunc(container);
  } catch (error) {
    console.error(`Erro ao renderizar ${tabName}:`, error);
    container.innerHTML = `<p style="color:#f87171;">Erro: ${error.message}</p>`;
  }
}

function logout() {
  stopNotificationPolling();
  appState.authToken = '';
  appState.appData = {};
  localStorage.removeItem('authToken');
  document.getElementById('adminPanel').style.display = 'none';
  showLoginForm();
}

window.appState = appState;
window.switchTab = switchTab;
window.logout = logout;
window.saveAppData = saveAppData;
window.loadAppData = loadAppData;
window.resolveImagePath = resolveImagePath;
window.copyToClipboard = copyToClipboard;
window.uploadImage = uploadImage;
window.showUploadProgress = showUploadProgress;
window.toggleNotifications = toggleNotifications;
window.markAllNotificationsRead = markAllNotificationsRead;
window.onNotifClick = onNotifClick;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initApp());
} else {
  initApp();
}
