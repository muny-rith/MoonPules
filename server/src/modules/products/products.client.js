const axios = require('axios');
const env = require('../../config/env');

let cachedImsToken = env.IMS_AUTH_TOKEN || null;
let tokenExpiresAt = null;

const getImsToken = async () => {
  if (cachedImsToken && (!tokenExpiresAt || Date.now() < tokenExpiresAt)) {
    return cachedImsToken;
  }

  // Attempt auto-login to Moon IMS
  try {
    const loginUrl = `${env.IMS_API_URL}/auth/login`;
    const response = await axios.post(loginUrl, {
      email: process.env.IMS_EMAIL || 'admin@moonims.com',
      password: process.env.IMS_PASSWORD || 'admin123',
    }, { timeout: 5000 });

    if (response.data?.data?.token) {
      cachedImsToken = response.data.data.token;
      tokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      return cachedImsToken;
    }
  } catch (err) {
    console.warn(`[ProductsClient] Moon IMS auto-login failed: ${err.message}`);
  }

  return cachedImsToken || env.IMS_AUTH_TOKEN || null;
};

const getProductsFromIms = async (overrideToken) => {
  const token = overrideToken || (await getImsToken());
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  const response = await axios.get(`${env.IMS_API_URL}/products`, {
    headers,
    timeout: 6000,
  });

  return response.data;
};

const getProductByIdFromIms = async (id, overrideToken) => {
  const token = overrideToken || (await getImsToken());
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  const response = await axios.get(`${env.IMS_API_URL}/products/${id}`, {
    headers,
    timeout: 6000,
  });

  return response.data;
};

const getBrandsFromIms = async (overrideToken) => {
  const token = overrideToken || (await getImsToken());
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  const response = await axios.get(`${env.IMS_API_URL}/brands`, {
    headers,
    timeout: 6000,
  });

  return response.data;
};

const getSalesFromIms = async (overrideToken) => {
  const token = overrideToken || (await getImsToken());
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  const response = await axios.get(`${env.IMS_API_URL}/sales`, {
    headers,
    timeout: 6000,
  });

  return response.data;
};

module.exports = {
  getProductsFromIms,
  getProductByIdFromIms,
  getBrandsFromIms,
  getSalesFromIms,
  getImsToken,
};

