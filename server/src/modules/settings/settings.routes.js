const express = require('express');
const router = express.Router();
const settingsController = require('./settings.controller');

router.get('/contact-footer', settingsController.getContactFooter);
router.put('/contact-footer', settingsController.updateContactFooter);

router.get('/saved-hashtags', settingsController.getSavedHashtags);
router.put('/saved-hashtags', settingsController.updateSavedHashtags);

module.exports = router;
