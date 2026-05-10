// Content script that listens for messages from popup

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extract_job_info") {
    try {
      const data = detectAndExtract();
      sendResponse({ success: true, data: data });
    } catch (error) {
      console.error('ApplyWise extraction error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

// ─── Quick Links Sidebar ──────────────────────────────────────────────────────

function initSidebar() {
  if (document.getElementById('applywise-sidebar-root')) return;

  const container = document.createElement('div');
  container.id = 'applywise-sidebar-root';
  
  // Create a container outside the normal document flow
  container.style.position = 'fixed';
  container.style.right = '0';
  container.style.top = '50%';
  container.style.transform = 'translateY(-50%)';
  container.style.zIndex = '2147483647'; // Maximum z-index
  container.style.pointerEvents = 'none'; // Let clicks pass through the container

  const shadow = container.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    * { 
      box-sizing: border-box; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
      line-height: 1.5;
      text-indent: 0;
      letter-spacing: normal;
      word-spacing: normal;
      text-align: left;
      text-transform: none;
      visibility: visible;
      opacity: 1;
    }
    
    .applywise-wrapper {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: auto; /* Re-enable pointer events for the UI */
      display: flex;
      align-items: center;
    }

    /* Floating Toggle Button */
    .toggle-btn {
      width: 44px;
      height: 48px;
      background: #4F46E5;
      color: white;
      border: none;
      border-radius: 8px 0 0 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: -2px 0 8px rgba(0,0,0,0.15);
      transition: all 0.2s ease;
      z-index: 2;
    }
    
    .toggle-btn:hover {
      background: #4338CA;
      width: 48px;
    }
    
    .toggle-btn svg {
      width: 20px;
      height: 20px;
    }

    /* Sidebar Panel */
    .panel {
      width: 280px;
      background: #ffffff;
      border: 1px solid #E5E7EB;
      border-right: none;
      border-radius: 12px 0 0 12px;
      box-shadow: -4px 0 15px rgba(0,0,0,0.1);
      position: absolute;
      right: -280px; /* Hidden by default */
      top: 50%;
      transform: translateY(-50%);
      transition: right 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      z-index: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .panel.open {
      right: 44px; /* Slide out next to the button */
    }

    .panel-header {
      padding: 16px;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #F9FAFB;
    }

    .panel-header h3 {
      margin: 0;
      font-size: 14px;
      color: #111827;
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .settings-link {
      color: #6B7280;
      text-decoration: none;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: color 0.15s ease;
    }

    .settings-link:hover {
      color: #4F46E5;
    }

    .dismiss-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #9CA3AF;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2px;
      border-radius: 4px;
      transition: color 0.15s ease, background 0.15s ease;
    }

    .dismiss-btn:hover {
      color: #EF4444;
      background: #FEF2F2;
    }

    .links-list {
      padding: 12px;
      max-height: 400px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .link-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: #F3F4F6;
      border-radius: 8px;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }

    .link-item:hover {
      border-color: #E5E7EB;
      background: #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .link-title {
      display: block;
      font-size: 13px;
      line-height: 1.5;
      color: #374151 !important;
      font-weight: 500;
      text-decoration: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex-grow: 1;
      min-width: 0;
      margin-right: 8px;
      visibility: visible;
    }

    .link-title:hover {
      color: #4F46E5;
    }

    .copy-btn {
      background: #E5E7EB;
      border: none;
      border-radius: 4px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #4B5563;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .copy-btn:hover {
      background: #D1D5DB;
      color: #111827;
    }

    .copy-btn.copied {
      background: #10B981;
      color: white;
    }

    .empty-state {
      padding: 20px 16px;
      text-align: center;
      color: #6B7280;
      font-size: 13px;
    }

    .empty-state a {
      color: #4F46E5;
      text-decoration: none;
      font-weight: 500;
    }
  `;
  shadow.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.className = 'applywise-wrapper';

  const panel = document.createElement('div');
  panel.className = 'panel';
  
  const dashboardSettingsUrl = 'http://localhost:5173/settings';

  panel.innerHTML = `
    <div class="panel-header">
      <h3>Quick Links</h3>
      <div class="header-actions">
        <a href="${dashboardSettingsUrl}" target="_blank" class="settings-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          Edit
        </a>
        <button class="dismiss-btn" id="dismiss-btn" title="Hide sidebar">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>
    <div class="links-list" id="links-list">
      <!-- Links will go here -->
    </div>
  `;

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'toggle-btn';
  toggleBtn.title = "ApplyWise Quick Links";
  // SVG Icon (ApplyWise logo)
  toggleBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
    </svg>
  `;

  wrapper.appendChild(panel);
  wrapper.appendChild(toggleBtn);
  shadow.appendChild(wrapper);
  document.body.appendChild(container);

  let isOpen = false;

  toggleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    if (isOpen) {
      panel.classList.add('open');
      loadLinks();
    } else {
      panel.classList.remove('open');
    }
  });

  panel.querySelector('#dismiss-btn').addEventListener('click', () => {
    container.style.display = 'none';
  });

  // Close panel if clicked outside
  document.addEventListener('click', (e) => {
    if (isOpen && e.target !== container) {
      isOpen = false;
      panel.classList.remove('open');
    }
  });
  
  // Prevent clicks inside the shadow DOM from propagating to the document and closing the panel immediately
  wrapper.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  function loadLinks() {
    const linksList = panel.querySelector('#links-list');
    const dashboardSettingsUrl = 'http://localhost:5173/settings'; // Link to React dashboard
    
    chrome.runtime.sendMessage({ action: 'get_quick_links' }, (response) => {
      const links = response?.success ? (response.links || []) : [];
      
      if (links.length === 0) {
        linksList.innerHTML = `
          <div class="empty-state">
            No quick links found.<br>
            <a href="${dashboardSettingsUrl}" target="_blank">Add links in Dashboard</a>
          </div>
        `;
        return;
      }

      linksList.innerHTML = '';
      
      links.forEach(link => {
        if (!link.url || !link.title) return;
        
        const item = document.createElement('div');
        item.className = 'link-item';
        
        const linkEl = document.createElement('a');
        linkEl.className = 'link-title';
        linkEl.href = link.url.startsWith('http') ? link.url : 'https://' + link.url;
        linkEl.target = '_blank';
        linkEl.textContent = link.title;
        linkEl.title = link.url;
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.title = "Copy to clipboard";
        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        
        copyBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            await navigator.clipboard.writeText(link.url);
            
            // Show copied state
            const originalHtml = copyBtn.innerHTML;
            copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
              copyBtn.innerHTML = originalHtml;
              copyBtn.classList.remove('copied');
            }, 2000);
          } catch (err) {
            console.error('Failed to copy text: ', err);
          }
        });

        item.appendChild(linkEl);
        item.appendChild(copyBtn);
        linksList.appendChild(item);
      });
    });
  }
}

// Initialize when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebar);
} else {
  initSidebar();
}
