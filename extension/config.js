const APPLYWISE_CONFIG = {
  DEFAULT_API_URL: 'https://applywise-q8d2.onrender.com/api',
  DEFAULT_DASHBOARD_URL: 'https://apply-wise-gamma.vercel.app',
};

function getDashboardUrlFromApi(apiUrl) {
  try {
    return apiUrl.replace(/\/api\/?$/, '');
  } catch {
    return APPLYWISE_CONFIG.DEFAULT_DASHBOARD_URL;
  }
}

function getSettingsUrlFromApi(apiUrl) {
  return getDashboardUrlFromApi(apiUrl) + '/settings';
}
