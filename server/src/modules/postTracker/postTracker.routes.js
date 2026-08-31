const express = require('express');
const router = express.Router();
const controller = require('./postTracker.controller');

router.get('/', controller.getPosts);
router.post('/sync', controller.triggerSync); // Manual sync
router.post('/', controller.createPost);
router.patch('/:id', controller.updatePost); // Status updates
router.put('/:id', controller.updatePostData); // Data updates
router.patch('/:id/costs', controller.updatePostCosts); // Cost updates
router.delete('/:id', controller.deletePost);

module.exports = router;
