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

const deleteFbData = async (endpoint, accessToken) => {
  try {
    const response = await fbClient.delete(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data;
  } catch (error) {
    const fbError = error.response?.data?.error;
    console.error('FB API Error on DELETE:', fbError || error.message);

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

    const message = fbError?.error_user_msg || fbError?.message || error.message || 'Error deleting from Facebook Graph API';
    const err = new Error(message);
    err.fbError = fbError;
    throw err;
  }
};

const postFbBatch = async (batchArray, accessToken) => {
  if (!batchArray || batchArray.length === 0) return [];
  try {
    const params = new URLSearchParams({
      access_token: accessToken,
      batch: JSON.stringify(batchArray),
    });
    const response = await fbClient.post('/', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return (response.data || []).map((item) => {
      let parsedBody = null;
      try {
        parsedBody = item?.body ? JSON.parse(item.body) : null;
      } catch (_) {
        parsedBody = item?.body;
      }
      return {
        code: item.code,
        headers: item.headers,
        data: parsedBody,
      };
    });
  } catch (error) {
    const fbError = error.response?.data?.error;
    console.error('FB API Error on Batch:', fbError || error.message);
    if (fbError?.code === 190) {
      const err = new Error('Facebook access token is invalid or expired — this Page needs to be reconnected.');
      err.isTokenExpired = true;
      throw err;
    }
    const message = fbError?.error_user_msg || fbError?.message || error.message || 'Error executing Facebook Graph API Batch';
    const err = new Error(message);
    err.fbError = fbError;
    throw err;
  }
};

module.exports = {
  getFbData,
  postFbData,
  deleteFbData,
  postFbBatch,
};