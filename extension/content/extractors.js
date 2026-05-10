// Extraction functions for different job portals

// Try JSON-LD structured data (Schema.org JobPosting) — most reliable signal across sites
function extractJsonLd() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const raw = JSON.parse(script.textContent);
      const items = Array.isArray(raw) ? raw : [raw];
      for (const item of items) {
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        if (!types.includes('JobPosting')) continue;

        let locationStr = '';
        const loc = item.jobLocation;
        if (loc) {
          const locItem = Array.isArray(loc) ? loc[0] : loc;
          const addr = locItem?.address;
          if (typeof addr === 'string') {
            locationStr = addr;
          } else if (addr) {
            locationStr = [addr.addressLocality, addr.addressRegion, addr.addressCountry]
              .filter(Boolean).join(', ');
          } else if (locItem?.name) {
            locationStr = locItem.name;
          }
        }

        const title = item.title || '';
        const company = item.hiringOrganization?.name || '';
        const description = item.description || '';
        if (title || company) {
          return {
            job_title: title.trim(),
            company_name: company.trim(),
            location: locationStr.trim(),
            job_description: description.trim()
          };
        }
      }
    } catch (e) { /* malformed JSON-LD — skip */ }
  }
  return null;
}

// Return the first non-empty text from a list of CSS selectors
function first(...selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    const text = (el?.innerText || el?.textContent || el?.getAttribute('alt') || '').trim();
    if (text) return text;
  }
  return '';
}

// Convert a URL slug / subdomain to readable title case ("my-company" → "My Company")
function toTitleCase(str) {
  return str.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Portal extractors ────────────────────────────────────────────────────────

function extractGreenhouseData() {
  const ld = extractJsonLd();

  const subdomain = window.location.hostname.split('.')[0];
  const companyFallback = (subdomain && subdomain !== 'boards') ? toTitleCase(subdomain) : '';

  return {
    job_title: ld?.job_title || first(
      '[data-qa="job-title"]',
      '.app-title',
      'h1.app-title',
      'h1'
    ),
    company_name: ld?.company_name ||
      first('.company-name') ||
      document.querySelector('meta[property="og:site_name"]')?.content ||
      companyFallback,
    location: ld?.location || first('[data-qa="location"]', '.location', '.offices', '.location-city'),
    job_description: ld?.job_description || first('#content', '.job-description', '#job-description'),
    job_url: window.location.href,
    portal: 'Greenhouse'
  };
}

function extractLeverData() {
  const ld = extractJsonLd();

  // jobs.lever.co/COMPANY/posting-id — company is the first path segment
  const pathSegs = window.location.pathname.split('/').filter(Boolean);
  const companyFromUrl = pathSegs[0] ? toTitleCase(pathSegs[0]) : '';

  const logoEl = document.querySelector('.main-header-logo img, header img[alt]');
  const logoAlt = logoEl?.alt || '';
  const companyFromLogo = (logoAlt && logoAlt.toLowerCase() !== 'logo') ? logoAlt : '';

  return {
    job_title: ld?.job_title || first(
      '.posting-headline h2',
      '[data-qa="posting-name"]',
      'h2.posting-title',
      'h2'
    ),
    company_name: ld?.company_name || companyFromLogo || companyFromUrl,
    // 'sort-by-time' is the posted date; '.posting-categories .location' is the actual location
    location: ld?.location || first(
      '.posting-categories .location',
      '.sort-by-loc',
      '[data-qa="posting-location"]',
      '.posting-category.location'
    ),
    job_description: ld?.job_description || first('.section-wrapper', '.posting-requirements', '[data-qa="job-description"]'),
    job_url: window.location.href,
    portal: 'Lever'
  };
}

function extractLinkedInData() {
  // LinkedIn redesigns its CSS classes regularly; use a broad fallback chain
  return {
    job_title: first(
      'h1.job-details-jobs-unified-top-card__job-title',
      '.job-details-jobs-unified-top-card__job-title h1',
      'h1[class*="job-title"]',
      'h1.t-24.t-bold',
      'h1.topcard__title'
    ),
    company_name: first(
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.topcard__flavor--company a',
      '.topcard__flavor--company'
    ),
    location: first(
      '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
      '.jobs-unified-top-card__bullet',
      '.topcard__flavor--bullet'
    ),
    job_description: first('.jobs-description__content', '.show-more-less-html__markup', '#job-details'),
    job_url: window.location.href.split('?')[0],
    portal: 'LinkedIn'
  };
}

function extractIndeedData() {
  const ld = extractJsonLd();
  return {
    job_title: ld?.job_title || first(
      'h1.jobsearch-JobInfoHeader-title',
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      'h1[class*="jobTitle"]',
      'h1'
    ),
    company_name: ld?.company_name || first(
      '[data-testid="inlineHeader-companyName"] a',
      '[data-testid="inlineHeader-companyName"]',
      '[class*="companyName"] a',
      '[class*="companyName"]'
    ),
    location: ld?.location || first(
      '[data-testid="job-location"]',
      '[class*="jobLocation"]',
      '[class*="companyLocation"]'
    ),
    job_description: ld?.job_description || first('#jobDescriptionText', '.jobsearch-jobDescriptionText'),
    job_url: window.location.href,
    portal: 'Indeed'
  };
}

function extractGlassdoorData() {
  const ld = extractJsonLd();
  return {
    job_title: ld?.job_title || first(
      'h1[data-test="job-title"]',
      '[class*="JobTitle"]',
      'h1'
    ),
    company_name: ld?.company_name || first(
      '[data-test="employer-name"]',
      '[class*="EmployerName"]',
      '[class*="employer-name"]'
    ),
    location: ld?.location || first(
      '[data-test="location"]',
      '[class*="Location"]'
    ),
    job_description: ld?.job_description || first('.jobDescriptionContent', '#JobDescriptionContainer'),
    job_url: window.location.href,
    portal: 'Glassdoor'
  };
}

function extractWorkdayData() {
  const ld = extractJsonLd();
  return {
    job_title: ld?.job_title || first(
      '[data-automation-id="jobPostingHeader"]',
      'h2[class*="css-14z5m36"]',
      'h1[class*="heading"]',
      'h1',
      'h2'
    ),
    company_name: ld?.company_name ||
      document.querySelector('meta[property="og:site_name"]')?.content ||
      first('[data-automation-id="company-name"]') ||
      '',
    location: ld?.location || first(
      '[data-automation-id="locations"]',
      '[class*="location"]'
    ),
    job_description: ld?.job_description || first('[data-automation-id="jobPostingDescription"]', '.job-description'),
    job_url: window.location.href,
    portal: 'Workday'
  };
}

function extractAshbyData() {
  const ld = extractJsonLd();

  const hostname = window.location.hostname;
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const companySlug = hostname.includes('boards.ashby.io') || hostname.includes('jobs.ashby.io')
    ? pathParts[0]
    : (hostname.split('.')[0] !== 'www' ? hostname.split('.')[0] : '');

  return {
    job_title: ld?.job_title || first(
      'h1.ashby-job-posting-heading',
      '[class*="JobTitle"]',
      'h1'
    ),
    company_name: ld?.company_name ||
      document.querySelector('meta[property="og:site_name"]')?.content ||
      first('[class*="CompanyName"]') ||
      (companySlug ? toTitleCase(companySlug) : ''),
    location: ld?.location || first(
      '.ashby-job-posting-heading-list-item',
      '[class*="Location"]',
      '[class*="Workplace"]'
    ),
    job_description: ld?.job_description || first('.ashby-job-posting-description', '[class*="JobDescription"]'),
    job_url: window.location.href,
    portal: 'Ashby'
  };
}

function extractSmartRecruitersData() {
  const ld = extractJsonLd();
  return {
    job_title: ld?.job_title || first('[class*="job-title"] h1', 'h1[class*="JobTitle"]', 'h1'),
    company_name: ld?.company_name ||
      document.querySelector('meta[property="og:site_name"]')?.content ||
      first('.company-name', '[class*="CompanyName"]') ||
      '',
    location: ld?.location || first('[class*="location"]', '[class*="Location"]'),
    job_description: ld?.job_description || first('.job-sections', '.job-description'),
    job_url: window.location.href,
    portal: 'SmartRecruiters'
  };
}

// ─── Generic fallback ─────────────────────────────────────────────────────────

function extractGenericData() {
  const url = window.location.href;

  // 1. JSON-LD is the most reliable — try it first
  const ld = extractJsonLd();
  if (ld?.job_title) {
    return { ...ld, job_url: url, portal: 'Direct' };
  }

  // 2. Parse page title for common patterns: "Role at Company", "Role - Company", "Role | Company"
  const title = document.title;
  let jobTitle = '';
  let companyName = '';

  const atMatch = title.match(/^(.+?)\s+at\s+(.+?)(?:\s*[-|–].+)?$/i);
  const separatorMatch = title.match(/^(.+?)\s*[|–—-]\s*(.+?)(?:\s*[|–—-].+)?$/);

  if (atMatch) {
    [, jobTitle, companyName] = atMatch;
  } else if (separatorMatch) {
    [, jobTitle, companyName] = separatorMatch;
  }

  // 3. Override company with og:site_name when available (usually more accurate)
  const ogSiteName = document.querySelector('meta[property="og:site_name"]')?.content;
  if (ogSiteName) companyName = ogSiteName;

  // 4. Try og:title for job title if we still have nothing
  if (!jobTitle) {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    if (ogTitle) jobTitle = ogTitle.split(/\s+at\s+/i)[0] || ogTitle;
  }

  // 5. Last resort: first h1
  if (!jobTitle) jobTitle = first('h1') || title;

  return {
    job_title: jobTitle.trim(),
    company_name: companyName.trim(),
    location: '',
    job_description: ld?.job_description || first('main', 'article', '.job-description', 'body'),
    job_url: url,
    portal: 'Direct'
  };
}

// ─── Entry point ──────────────────────────────────────────────────────────────

function detectAndExtract() {
  const url = window.location.href;

  if (url.includes('greenhouse.io'))                                      return extractGreenhouseData();
  if (url.includes('lever.co'))                                           return extractLeverData();
  if (url.includes('linkedin.com/jobs'))                                  return extractLinkedInData();
  if (url.includes('indeed.com'))                                         return extractIndeedData();
  if (url.includes('glassdoor.com'))                                      return extractGlassdoorData();
  if (url.includes('workday.com') || url.includes('myworkdayjobs.com'))   return extractWorkdayData();
  if (url.includes('ashbyhq.com') || url.includes('ashby.io'))            return extractAshbyData();
  if (url.includes('smartrecruiters.com'))                                return extractSmartRecruitersData();

  return extractGenericData();
}
