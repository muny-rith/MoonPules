const express = require('express');
const router = express.Router();
const controller = require('./facebook.controller');

router.get('/pages/:pageId/scheduled-posts', controller.getScheduledPosts);
router.get('/insights/:postId', controller.getInsights);

module.exports = router;
