const axios = require('axios');

const fbClient = axios.create({
  baseURL: 'https://graph.facebook.com/v19.0',
});

const getFbData = async (endpoint, accessToken) => {
  try {
    const response = await fbClient.get(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (error) {
    console.error('FB API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Error calling Facebook Graph API');
  }
};

module.exports = {
  getFbData,
};
