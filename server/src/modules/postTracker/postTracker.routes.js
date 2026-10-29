const express = require('express');
const router = express.Router();
const controller = require('./postTracker.controller');
const upload = require('../../middleware/upload.middleware');

router.get('/', controller.getPosts);
router.get('/summary', controller.getSummary);
router.get('/:id', controller.getPostById);
router.post('/sync', controller.triggerSync); // Scoped or manual sync
router.post('/:id/refresh', controller.refreshSinglePost); // Single post on-demand refresh
router.post('/', controller.createPost);
router.post('/upload-image', upload.single('image'), controller.uploadImage);
router.post('/:id/publish-now', controller.publishNow); // Immediate publication
router.patch('/:id', controller.updatePost); // Status updates
router.put('/:id', controller.updatePostData); // Data updates
router.patch('/:id/costs', controller.updatePostCosts); // Cost updates
router.delete('/:id', controller.deletePost);

module.exports = router;
