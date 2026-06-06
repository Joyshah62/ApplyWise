const DEFAULT_API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
  const apiInput    = document.getElementById('api-url-input');
  const saveBtn     = document.getElementById('save-api-btn');
  const saveStatus  = document.getElementById('api-save-status');
  const dashLink    = document.getElementById('dashboard-link');

  // Load saved API URL
  chrome.storage.local.get(['apiUrl'], (result) => {
    const saved = result.apiUrl || '';
    apiInput.value = saved;
    updateDashLink(saved || DEFAULT_API_URL);
  });

  saveBtn.addEventListener('click', () => {
    const raw   = apiInput.value.trim();
    const value = raw || null; // null = use default

    const store = value ? { apiUrl: value } : {};
    chrome.storage.local.remove('apiUrl', () => {
      if (value) {
        chrome.storage.local.set({ apiUrl: value }, () => showStatus('Saved!'));
      } else {
        showStatus('Reset to default (localhost)');
      }
      updateDashLink(value || DEFAULT_API_URL);
    });
  });

  function updateDashLink(apiUrl) {
    try {
      const base = apiUrl.replace(/\/api\/?$/, '');
      dashLink.href = base;
    } catch {
      dashLink.href = 'http://localhost:5173';
    }
  }

  function showStatus(msg) {
    saveStatus.textContent = msg;
    saveStatus.classList.add('show');
    setTimeout(() => saveStatus.classList.remove('show'), 3000);
  }
});
