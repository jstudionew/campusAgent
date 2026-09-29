export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  TOKEN_STORAGE: import.meta.env.VITE_TOKEN_STORAGE || 'session', // 'session' | 'local'
  REQUEST_TIMEOUT_MS: Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || 15000),
  ENABLE_DEMO_AUTH: String(import.meta.env.VITE_ENABLE_DEMO_AUTH || 'false') === 'true',
};

export const getApiBaseUrl = () => {
  const electronBase =
    (typeof window !== 'undefined' && window.ELECTRON_CONFIG && window.ELECTRON_CONFIG.API_BASE_URL) ||
    (typeof window !== 'undefined' && window.__API_BASE_URL);
  const rawBaseUrl = electronBase || config.API_BASE_URL;

  if (!rawBaseUrl) {
    throw new Error('API base URL is not configured. Set VITE_API_BASE_URL.');
  }

  const baseUrl = String(rawBaseUrl).replace(/\/+$/, '');
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

export default config;
