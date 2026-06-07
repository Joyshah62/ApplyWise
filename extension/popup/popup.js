let apiUrl = APPLYWISE_CONFIG.DEFAULT_API_URL;
let authToken = null;

document.addEventListener('DOMContentLoaded', async () => {
  const loginView   = document.getElementById('login-view');
  const formView    = document.getElementById('form-view');
  const loadingView = document.getElementById('loading-view');

  // Load API URL from options before doing anything
  await new Promise(resolve => {
    chrome.storage.local.get(['apiUrl'], r => {
      if (r.apiUrl) apiUrl = r.apiUrl;
      resolve();
    });
  });

  chrome.storage.local.get(['token'], (result) => {
    if (result.token) {
      authToken = result.token;
      startExtraction();
    } else {
      loadingView.classList.add('hidden');
      loginView.classList.remove('hidden');
    }
  });

  // ── Login ──────────────────────────────────────────────────────────────────
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login_email').value;
    const password = document.getElementById('login_password').value;
    const errorDiv = document.getElementById('login-error');
    const btn      = e.target.querySelector('button');

    btn.disabled  = true;
    btn.innerText = 'Signing in…';

    try {
      const res  = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok) {
        authToken = data.access_token;
        chrome.storage.local.set({ token: authToken });
        loginView.classList.add('hidden');
        loadingView.classList.remove('hidden');
        startExtraction();
      } else {
        showMessage(errorDiv, data.error || 'Login failed', 'error');
      }
    } catch (err) {
      showMessage(errorDiv, 'Cannot reach server — is the backend running?', 'error');
    } finally {
      btn.disabled  = false;
      btn.innerText = 'Sign In';
    }
  });

  // ── Form submit ────────────────────────────────────────────────────────────
  document.getElementById('app-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn       = document.getElementById('save-btn');
    const statusMsg = document.getElementById('status-message');

    btn.disabled  = true;
    btn.innerText = 'Saving…';
    statusMsg.innerText = '';
    statusMsg.className = 'message';

    const resumeId = document.getElementById('resume_version_id').value;

    const payload = {
      company_name:      document.getElementById('company_name').value,
      job_title:         document.getElementById('job_title').value,
      location:          document.getElementById('location').value,
      portal:            document.getElementById('portal').value,
      status:            document.getElementById('status').value,
      job_url:           document.getElementById('job_url').value,
      resume_version_id: resumeId ? parseInt(resumeId) : null,
      job_description:   window.extractedJobDescription || '',
      date_applied:      new Date().toISOString().split('T')[0]
    };

    try {
      const response = await fetch(`${apiUrl}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showMessage(statusMsg, '✓ Application saved!', 'success');
        btn.innerText = 'Saved!';
        setTimeout(() => window.close(), 1400);
      } else {
        if (response.status === 401 || response.status === 422) {
          handleLogout();
          throw new Error('Session expired — please sign in again.');
        }
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save.');
      }
    } catch (error) {
      showMessage(statusMsg, error.message, 'error');
      btn.disabled  = false;
      btn.innerText = 'Save Application';
    }
  });

  document.getElementById('cancel-btn').addEventListener('click', () => window.close());
  document.getElementById('signout-btn').addEventListener('click', (e) => {
    e.preventDefault();
    handleLogout();
  });
});

// ── Auth ───────────────────────────────────────────────────────────────────────
function handleLogout() {
  chrome.storage.local.remove('token');
  authToken = null;
  document.getElementById('form-view').classList.add('hidden');
  document.getElementById('login-view').classList.remove('hidden');
  document.getElementById('signout-btn').classList.add('hidden');
}

// ── Resumes ────────────────────────────────────────────────────────────────────
async function fetchResumes() {
  try {
    const res = await fetch(`${apiUrl}/resumes`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (!res.ok) return;

    const resumes = await res.json();
    const select  = document.getElementById('resume_version_id');

    while (select.options.length > 1) select.remove(1);

    resumes.forEach(resume => {
      const opt   = document.createElement('option');
      opt.value   = resume.id;
      opt.text    = resume.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('ApplyWise: failed to fetch resumes', err);
  }
}

// ── Extraction ─────────────────────────────────────────────────────────────────
function startExtraction() {
  document.getElementById('signout-btn').classList.remove('hidden');
  fetchResumes();

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentUrl = tabs[0]?.url || '';

    chrome.tabs.sendMessage(tabs[0].id, { action: 'extract_job_info' }, (response) => {
      document.getElementById('loading-view').classList.add('hidden');

      if (response && response.success) {
        const data = response.data;

        setField('company_name', data.company_name, 'company-badge');
        setField('job_title',    data.job_title,    'title-badge');
        setField('location',     data.location,     'location-badge');

        // Store job description globally for analysis
        window.extractedJobDescription = data.job_description || '';

        // Portal: set select value (falls back to current selection if not found)
        if (data.portal) {
          document.getElementById('portal').value = data.portal;
        }

        const finalUrl = data.job_url || currentUrl;
        document.getElementById('job_url').value = finalUrl;
        setUrlDisplay(finalUrl);
        showDetectionBanner(data);
      } else {
        document.getElementById('job_url').value = currentUrl;
        window.extractedJobDescription = '';
        setUrlDisplay(currentUrl);
        showDetectionBanner({});
      }

      document.getElementById('form-view').classList.remove('hidden');
      setupAnalyzeButton();
      setupCoverLetterButton();
    });
  });
}

// ── AI Analysis ────────────────────────────────────────────────────────────────
function setupAnalyzeButton() {
  const analyzeBtn = document.getElementById('analyze-btn');
  const resultsDiv = document.getElementById('analysis-results');
  const contentDiv = document.getElementById('analysis-content');

  analyzeBtn.addEventListener('click', async () => {
    const resumeId = document.getElementById('resume_version_id').value;
    if (!resumeId) {
      alert("Please select a resume to analyze.");
      return;
    }
    
    if (!window.extractedJobDescription) {
      alert("No job description found on this page to analyze against.");
      return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.innerText = 'Analyzing...';
    resultsDiv.classList.remove('hidden');
    contentDiv.innerHTML = '<div style="display:flex;align-items:center;gap:8px;color:#6366f1;"><div class="loader" style="width:16px;height:16px;border-width:2px;border-top-color:#6366f1;"></div> Analyzing fit...</div>';

    try {
      const response = await fetch(`${apiUrl}/applications/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          job_description: window.extractedJobDescription,
          resume_id: parseInt(resumeId)
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to analyze');

      const matchedHtml = (data.matched_keywords || []).map(k => `<span style="background:#d1fae5;color:#065f46;padding:2px 6px;border-radius:4px;margin:2px;display:inline-block;">${k}</span>`).join('');
      const missingHtml = (data.missing_keywords || []).map(k => `<span style="background:#fee2e2;color:#991b1b;padding:2px 6px;border-radius:4px;margin:2px;display:inline-block;">${k}</span>`).join('');
      const suggestionsHtml = (data.suggestions || []).map(s => `<li style="margin-bottom:4px;">${s}</li>`).join('');

      contentDiv.innerHTML = `
        <div style="margin-bottom:8px;">
          <strong style="color:#1f2937;">Fit Score:</strong> 
          <span style="font-weight:bold;color:${data.fit_score >= 70 ? '#10b981' : (data.fit_score >= 40 ? '#f59e0b' : '#ef4444')}">${data.fit_score || 0}%</span>
        </div>
        <div style="margin-bottom:8px;">
          <strong style="display:block;margin-bottom:4px;color:#1f2937;">Matched Keywords:</strong>
          ${matchedHtml || '<span style="color:#6b7280;">None detected.</span>'}
        </div>
        <div style="margin-bottom:8px;">
          <strong style="display:block;margin-bottom:4px;color:#1f2937;">Missing Keywords:</strong>
          ${missingHtml || '<span style="color:#6b7280;">None missing!</span>'}
        </div>
        <div>
          <strong style="display:block;margin-bottom:4px;color:#1f2937;">Suggestions:</strong>
          <ul style="margin:0;padding-left:20px;color:#4b5563;">${suggestionsHtml || '<li>No suggestions.</li>'}</ul>
        </div>
      `;
    } catch (err) {
      contentDiv.innerHTML = `<span style="color:#ef4444;">Error: ${err.message}</span>`;
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerText = 'Analyze Fit';
    }
  });
}

// ── Cover Letter ───────────────────────────────────────────────────────────────
function setupCoverLetterButton() {
  const clBtn = document.getElementById('cover-letter-btn');
  const resultsDiv = document.getElementById('cover-letter-results');
  const contentDiv = document.getElementById('cover-letter-content');
  const copyBtn = document.getElementById('copy-cl-btn');
  const downloadBtn = document.getElementById('download-cl-btn');

  clBtn.addEventListener('click', async () => {
    const resumeId = document.getElementById('resume_version_id').value;
    if (!resumeId) {
      alert("Please select a resume to generate a cover letter.");
      return;
    }
    
    if (!window.extractedJobDescription) {
      alert("No job description found on this page.");
      return;
    }

    clBtn.disabled = true;
    clBtn.innerText = 'Generating...';
    downloadBtn.classList.add('hidden');
    resultsDiv.classList.remove('hidden');
    contentDiv.innerHTML = '<div style="display:flex;align-items:center;gap:8px;color:#6366f1;"><div class="loader" style="width:16px;height:16px;border-width:2px;border-top-color:#6366f1;"></div> Generating cover letter...</div>';

    try {
      const response = await fetch(`${apiUrl}/applications/cover-letter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          job_description: window.extractedJobDescription,
          resume_id: parseInt(resumeId),
          company_name: document.getElementById('company_name').value || '',
          job_title: document.getElementById('job_title').value || ''
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate');

      contentDiv.innerText = data.cover_letter;
      downloadBtn.classList.remove('hidden');
      document.getElementById('cl-chat').classList.remove('hidden');
    } catch (err) {
      contentDiv.innerHTML = `<span style="color:#ef4444;">Error: ${err.message}</span>`;
    } finally {
      clBtn.disabled = false;
      clBtn.innerText = 'Cover Letter';
    }
  });

  downloadBtn.addEventListener('click', async () => {
    const coverLetter = contentDiv.innerText.trim();
    if (!coverLetter || coverLetter === 'Generating cover letter...') return;

    downloadBtn.disabled = true;
    downloadBtn.innerText = 'Preparing...';

    try {
      const response = await fetch(`${apiUrl}/applications/cover-letter/docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          cover_letter: coverLetter,
          company_name: document.getElementById('company_name').value || '',
          job_title: document.getElementById('job_title').value || ''
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create Word file');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const filename = filenameMatch?.[1] || buildCoverLetterFilename();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.innerText = 'Download Word';
    }
  });

  copyBtn.addEventListener('click', () => {
    const text = contentDiv.innerText;
    if (text && text !== 'Generating cover letter...') {
      navigator.clipboard.writeText(text);
      copyBtn.innerText = 'Copied!';
      setTimeout(() => copyBtn.innerText = 'Copy', 2000);
    }
  });

  // ── Refine chat ──────────────────────────────────────────────────────────
  const chatInput  = document.getElementById('cl-chat-input');
  const chatSend   = document.getElementById('cl-chat-send');
  const chatHistory = document.getElementById('cl-chat-history');

  async function sendRefinement() {
    const instruction = chatInput.value.trim();
    if (!instruction) return;

    const currentLetter = contentDiv.innerText;
    if (!currentLetter) return;

    chatInput.value = '';
    chatSend.disabled = true;

    // Add user bubble
    const userMsg = document.createElement('div');
    userMsg.className = 'cl-chat-msg user';
    userMsg.textContent = instruction;
    chatHistory.appendChild(userMsg);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
      const response = await fetch(`${apiUrl}/applications/refine-cover-letter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          cover_letter: currentLetter,
          instruction,
          job_description: window.extractedJobDescription || '',
          company_name: document.getElementById('company_name').value || '',
          job_title: document.getElementById('job_title').value || ''
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Refinement failed');

      contentDiv.innerText = data.cover_letter;
      downloadBtn.classList.remove('hidden');

      const assistantMsg = document.createElement('div');
      assistantMsg.className = 'cl-chat-msg assistant';
      assistantMsg.textContent = '✓ Letter updated';
      chatHistory.appendChild(assistantMsg);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    } catch (err) {
      const errMsg = document.createElement('div');
      errMsg.className = 'cl-chat-msg assistant';
      errMsg.style.background = '#fef2f2';
      errMsg.style.color = '#991b1b';
      errMsg.textContent = `Error: ${err.message}`;
      chatHistory.appendChild(errMsg);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    } finally {
      chatSend.disabled = false;
      chatInput.focus();
    }
  }

  chatSend.addEventListener('click', sendRefinement);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendRefinement();
  });
}

function buildCoverLetterFilename() {
  const company = document.getElementById('company_name').value || 'company';
  const role = document.getElementById('job_title').value || 'role';
  const base = `${company}_${role}_cover_letter`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return `${base || 'cover_letter'}.docx`;
}

// Set an input value and show the "auto" badge when a value is present
function setField(inputId, value, badgeId) {
  if (value && value.trim()) {
    document.getElementById(inputId).value = value.trim();
    document.getElementById(badgeId)?.classList.remove('hidden');
  }
}

// Show a truncated, human-readable form of the job URL
function setUrlDisplay(url) {
  const el = document.getElementById('url-display');
  try {
    const u    = new URL(url);
    const path = u.pathname.length > 28 ? u.pathname.slice(0, 28) + '…' : u.pathname;
    el.textContent = u.hostname + path;
    el.title       = url;
  } catch (e) {
    el.textContent = url.slice(0, 50) + (url.length > 50 ? '…' : '');
    el.title       = url;
  }
}

// Show the top detection banner based on how much data was found
function showDetectionBanner(data) {
  const banner = document.getElementById('detection-banner');
  const icon   = document.getElementById('detection-icon');
  const text   = document.getElementById('detection-text');

  banner.classList.remove('hidden', 'banner-success', 'banner-partial', 'banner-manual');

  const hasTitle   = !!(data.job_title?.trim());
  const hasCompany = !!(data.company_name?.trim());
  const portal     = data.portal || '';

  if (hasTitle && hasCompany) {
    banner.classList.add('banner-success');
    icon.textContent = '✓';
    text.textContent = portal && portal !== 'Direct'
      ? `Detected from ${portal}`
      : 'Auto-detected from page';
  } else if (hasTitle || hasCompany) {
    banner.classList.add('banner-partial');
    icon.textContent = '◐';
    text.textContent = 'Partial data — please review the fields below';
  } else {
    banner.classList.add('banner-manual');
    icon.textContent = '✎';
    text.textContent = 'Could not detect — fill in the details manually';
  }
}

// Apply a style class to a message element
function showMessage(el, msg, type) {
  el.textContent = msg;
  el.className   = `message ${type}`;
}
