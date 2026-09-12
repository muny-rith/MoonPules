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
    if (fbError?.code === 100 && fbError?.error_subcode === 33) {
      const err = new Error('This Facebook post no longer exists (deleted, or a Live video past its 30-day auto-removal).');
      err.isPostDeleted = true;
      throw err;
    }


    const message = fbError?.error_user_msg || fbError?.message || error.message || 'Error calling Facebook Graph API';
    const err = new Error(message);
    err.fbError = fbError;
    throw err;
  }
};

const postFbData = async (endpoint, accessToken, data, customHeaders = {}) => {
  try {
    const response = await fbClient.post(endpoint, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...customHeaders,
      },
    });
    return response.data;
  } catch (error) {
    const fbError = error.response?.data?.error;
    console.error('FB API Error on POST:', fbError || error.message);

    if (fbError?.code === 190) {
      const err = new Error('Facebook access token is invalid or expired — this Page needs to be reconnected.');
      err.isTokenExpired = true;
      throw err;
    }
    if (fbError?.code === 100 && fbError?.error_subcode === 33) {
      const err = new Error('This Facebook post no longer exists (deleted, or a Live video past its 30-day auto-removal).');
      err.isPostDeleted = true;
      throw err;
    }

    const message = fbError?.error_user_msg || fbError?.message || error.message || 'Error publishing to Facebook Graph API';
    const err = new Error(message);
    err.fbError = fbError;
    throw err;
  }
};

module.exports = {
  getFbData,
  postFbData,
};