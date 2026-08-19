const express = require('express');
const router = express.Router();
const controller = require('./postTracker.controller');

router.patch('/:id', controller.updatePost);
router.get('/', controller.getPosts);
router.post('/', controller.createPost);

module.exports = router;
