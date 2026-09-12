const express = require('express');
const router = express.Router();
const hashtagsController = require('./hashtags.controller');

router.get('/', hashtagsController.getAllHashtags);
router.post('/toggle-save', hashtagsController.toggleSaveHashtag);
router.post('/record-use', hashtagsController.recordUsage);
router.put('/:id/note', hashtagsController.updateNote);
router.delete('/:id', hashtagsController.deleteHashtag);

module.exports = router;
