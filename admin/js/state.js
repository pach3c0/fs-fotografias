/**
 * Estado global e funções compartilhadas do admin
 * Módulo separado para evitar dependências circulares
 */

export let appState = {
  authToken: localStorage.getItem('authToken') || '',
  appData: {},
  currentTab: 'hero'
};

export async function loadAppData() {
  try {
    const response = await fetch('/api/site-data', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });

    if (!response.ok) throw new Error('Erro ao carregar dados');

    appState.appData = await response.json();
    console.log('Dados carregados:', Object.keys(appState.appData));
  } catch (error) {
    console.error('Erro:', error.message);
    appState.appData = {};
  }
}

export async function saveAppData(section, data) {
  try {
    const payload = { ...appState.appData };
    payload[section] = data;

    const response = await fetch('/api/site-data', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appState.authToken}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Erro ao salvar dados');

    appState.appData = payload;
    alert('Salvo com sucesso!');
    return true;
  } catch (error) {
    alert('Erro: ' + error.message);
    return false;
  }
}
