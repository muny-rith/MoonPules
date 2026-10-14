const axios = require('axios');
const env = require('../../config/env');

let cachedImsToken = env.IMS_AUTH_TOKEN || null;
let tokenExpiresAt = null;

// Primary and fallback IMS URLs
let activeBaseUrl = env.IMS_API_URL || 'https://ims-y8a6.onrender.com/api';
const fallbackBaseUrl = activeBaseUrl.includes('localhost')
  ? 'https://ims-y8a6.onrender.com/api'
  : 'http://localhost:50257/api';

const getActiveBaseUrl = () => activeBaseUrl;

const getImsToken = async (forceRefresh = false, targetBaseUrl = activeBaseUrl) => {
  if (!forceRefresh && cachedImsToken && (!tokenExpiresAt || Date.now() < tokenExpiresAt)) {
    return cachedImsToken;
  }

  // Attempt auto-login to Moon IMS
  try {
    const loginUrl = `${targetBaseUrl}/auth/login`;
    const response = await axios.post(
      loginUrl,
      {
        email: process.env.IMS_EMAIL || 'admin@moonims.com',
        password: process.env.IMS_PASSWORD || 'admin123',
      },
      { timeout: 15000 }
    );

    const token = response.data?.data?.token || response.data?.data?.accessToken;
    if (token) {
      cachedImsToken = token;
      // IMS tokens expire in 15 minutes; cache for 10 minutes to safely refresh before expiry
      tokenExpiresAt = Date.now() + 10 * 60 * 1000;
      return cachedImsToken;
    }
  } catch (err) {
    console.warn(`[ProductsClient] Moon IMS auto-login to ${targetBaseUrl} failed: ${err.message}`);
  }

  return cachedImsToken || env.IMS_AUTH_TOKEN || null;
};

/**
 * Executes an HTTP request to IMS with:
 * 1. Automatic Bearer auth injection
 * 2. 401 Unauthorized handling (token refresh + automatic single retry)
 * 3. Connection error fallback (e.g. localhost <-> Render)
 */
const requestWithAuth = async (path, options = {}) => {
  const execute = async (token, baseUrl) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    // 1. Professional Machine-to-Machine API Key
    if (env.IMS_SERVICE_KEY) {
      headers['X-API-Key'] = env.IMS_SERVICE_KEY;
    }

    // 2. Backward compatibility Bearer token
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    return axios({
      url: `${baseUrl}${path}`,
      method: options.method || 'GET',
      headers,
      data: options.data,
      params: options.params,
      timeout: options.timeout || 25000,
    });
  };

  let token = await getImsToken();
  let currentBase = activeBaseUrl;

  try {
    const response = await execute(token, currentBase);
    return response.data;
  } catch (err) {
    // 1. If 401 Unauthorized (expired token), refresh token and retry once
    if (err.response?.status === 401) {
      console.warn(`[ProductsClient] Token rejected (401) from ${currentBase}${path}. Refreshing token...`);
      token = await getImsToken(true, currentBase);
      const retryResponse = await execute(token, currentBase);
      return retryResponse.data;
    }

    // 2. If Network error (ECONNREFUSED / timeout) and fallback is available, try fallback
    const isNetworkError = !err.response || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT';
    if (isNetworkError && fallbackBaseUrl && currentBase !== fallbackBaseUrl) {
      console.warn(`[ProductsClient] ${currentBase} unreachable (${err.message}). Trying fallback ${fallbackBaseUrl}...`);
      try {
        const fallbackToken = await getImsToken(false, fallbackBaseUrl);
        const fbRes = await execute(fallbackToken, fallbackBaseUrl);
        activeBaseUrl = fallbackBaseUrl; // switch active base URL
        return fbRes.data;
      } catch (fbErr) {
        if (fbErr.response?.status === 401) {
          const freshToken = await getImsToken(true, fallbackBaseUrl);
          const fbRetry = await execute(freshToken, fallbackBaseUrl);
          activeBaseUrl = fallbackBaseUrl;
          return fbRetry.data;
        }
        throw fbErr;
      }
    }

    throw err;
  }
};

const getProductsFromIms = async () => {
  return requestWithAuth('/products');
};

const getProductByIdFromIms = async (id) => {
  return requestWithAuth(`/products/${id}`);
};

const getBrandsFromIms = async () => {
  return requestWithAuth('/brands');
};

const getSalesFromIms = async () => {
  return requestWithAuth('/sales');
};

const getCategoriesFromIms = async () => {
  return requestWithAuth('/categories');
};

module.exports = {
  getProductsFromIms,
  getProductByIdFromIms,
  getBrandsFromIms,
  getSalesFromIms,
  getCategoriesFromIms,
  getImsToken,
  getActiveBaseUrl,
};


