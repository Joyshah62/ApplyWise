// Background service worker
importScripts('../config.js');

function getApiUrl() {
  return new Promise(resolve => {
    chrome.storage.local.get(['apiUrl'], r => resolve(r.apiUrl || APPLYWISE_CONFIG.DEFAULT_API_URL));
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('ApplyWise Extension installed.');
});

// Cache for quick links
let quickLinksCache = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get_quick_links') {
    const now = Date.now();
    
    // Return cache if valid
    if (quickLinksCache && (now - lastFetchTime) < CACHE_DURATION_MS) {
      sendResponse({ success: true, links: quickLinksCache });
      return true;
    }

    // Fetch from API
    chrome.storage.local.get(['token'], async (result) => {
      const token = result.token;
      if (!token) {
        sendResponse({ success: false, error: 'Not logged in' });
        return;
      }

      const apiUrl = await getApiUrl();
      fetch(`${apiUrl}/quick-links`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        quickLinksCache = data;
        lastFetchTime = Date.now();
        sendResponse({ success: true, links: data });
      })
      .catch(err => {
        console.error('ApplyWise: Failed to fetch quick links', err);
        if (quickLinksCache) {
          sendResponse({ success: true, links: quickLinksCache });
        } else {
          sendResponse({ success: false, error: err.message });
        }
      });
    });

    return true; // Keep message channel open for async response
  }
});
