document.addEventListener('DOMContentLoaded', () => {
  const apiInput    = document.getElementById('api-url-input');
  const saveBtn     = document.getElementById('save-api-btn');
  const saveStatus  = document.getElementById('api-save-status');
  const dashLink    = document.getElementById('dashboard-link');

  // Load saved API URL
  chrome.storage.local.get(['apiUrl'], (result) => {
    const saved = result.apiUrl || '';
    apiInput.value = saved;
    updateDashLink(saved || APPLYWISE_CONFIG.DEFAULT_API_URL);
  });

  saveBtn.addEventListener('click', () => {
    const raw   = apiInput.value.trim();
    const value = raw || null; // null = use default

    chrome.storage.local.remove('apiUrl', () => {
      if (value) {
        chrome.storage.local.set({ apiUrl: value }, () => showStatus('Saved!'));
      } else {
        showStatus('Reset to production default');
      }
      updateDashLink(value || APPLYWISE_CONFIG.DEFAULT_API_URL);
    });
  });

  function updateDashLink(apiUrl) {
    dashLink.href = getDashboardUrlFromApi(apiUrl);
  }

  function showStatus(msg) {
    saveStatus.textContent = msg;
    saveStatus.classList.add('show');
    setTimeout(() => saveStatus.classList.remove('show'), 3000);
  }
});
