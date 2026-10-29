const express = require('express');
const router = express.Router();
const webhookController = require('./webhook.controller');

// Meta Webhook Challenge verification
router.get('/facebook', webhookController.verifyWebhook);

// Meta Webhook Event receiver
router.post('/facebook', webhookController.handleWebhookEvent);

module.exports = router;
