const axios = require('axios');

const fbClient = axios.create({
  baseURL: 'https://graph.facebook.com/v26.0',
});

const getFbData = async (endpoint, accessToken) => {
  try {
    const response = await fbClient.get(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (error) {
    const fbError = error.response?.data?.error;
    console.error('FB API Error:', fbError || error.message);

    if (fbError?.code === 190) {
      const err = new Error('Facebook access token is invalid or expired — this Page needs to be reconnected.');
      err.isTokenExpired = true;
      throw err;
    }

    throw new Error(fbError?.message || 'Error calling Facebook Graph API');
  }
};

module.exports = {
  getFbData,
};