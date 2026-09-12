const settingsService = require('./settings.service');

const getContactFooter = async (req, res, next) => {
  try {
    const setting = await settingsService.getContactFooter();
    res.json(setting);
  } catch (error) {
    next(error);
  }
};

const updateContactFooter = async (req, res, next) => {
  try {
    const { value } = req.body;
    const updated = await settingsService.updateContactFooter(value);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const getSavedHashtags = async (req, res, next) => {
  try {
    const setting = await settingsService.getSavedHashtags();
    const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
    res.json(parsed);
  } catch (error) {
    next(error);
  }
};

const updateSavedHashtags = async (req, res, next) => {
  try {
    const { hashtags } = req.body;
    const updated = await settingsService.updateSavedHashtags(hashtags);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getContactFooter,
  updateContactFooter,
  getSavedHashtags,
  updateSavedHashtags,
};
