document.addEventListener('DOMContentLoaded', () => {
  const linksContainer = document.getElementById('links-container');
  const addLinkBtn = document.getElementById('add-link-btn');
  const saveBtn = document.getElementById('save-btn');
  const saveStatus = document.getElementById('save-status');
  const template = document.getElementById('link-row-template');

  // Default links to show if none are saved
  const DEFAULT_LINKS = [
    { title: 'LinkedIn', url: '' },
    { title: 'GitHub', url: '' },
    { title: 'Portfolio', url: '' }
  ];

  // Load saved links
  chrome.storage.sync.get(['quickLinks'], (result) => {
    let links = result.quickLinks;
    if (!links || links.length === 0) {
      links = DEFAULT_LINKS;
    }
    
    links.forEach(link => addLinkRow(link));
  });

  // Add new link row
  addLinkBtn.addEventListener('click', () => {
    addLinkRow({ title: '', url: '' });
  });

  // Save links
  saveBtn.addEventListener('click', () => {
    const rows = linksContainer.querySelectorAll('.link-row');
    const newLinks = [];
    
    rows.forEach(row => {
      const title = row.querySelector('.link-title').value.trim();
      const url = row.querySelector('.link-url').value.trim();
      
      if (title || url) { // Save even if one is empty, user might be filling it
        newLinks.push({ title, url });
      }
    });

    chrome.storage.sync.set({ quickLinks: newLinks }, () => {
      saveStatus.textContent = 'Changes saved successfully!';
      saveStatus.classList.add('show');
      
      setTimeout(() => {
        saveStatus.classList.remove('show');
      }, 3000);
    });
  });

  function addLinkRow(link) {
    const clone = template.content.cloneNode(true);
    const row = clone.querySelector('.link-row');
    const titleInput = clone.querySelector('.link-title');
    const urlInput = clone.querySelector('.link-url');
    const removeBtn = clone.querySelector('.remove-btn');

    titleInput.value = link.title || '';
    urlInput.value = link.url || '';

    removeBtn.addEventListener('click', () => {
      row.remove();
    });

    linksContainer.appendChild(clone);
  }
});
