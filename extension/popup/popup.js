const API_URL = 'http://localhost:5000/api';
let authToken = null;

document.addEventListener('DOMContentLoaded', async () => {
  const loginView   = document.getElementById('login-view');
  const formView    = document.getElementById('form-view');
  const loadingView = document.getElementById('loading-view');

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
      const res  = await fetch(`${API_URL}/auth/login`, {
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
      const response = await fetch(`${API_URL}/applications`, {
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
    const res = await fetch(`${API_URL}/resumes`, {
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
      const response = await fetch(`${API_URL}/applications/analyze`, {
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
