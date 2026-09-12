const hashtagsService = require('./hashtags.service');

const getAllHashtags = async (req, res, next) => {
  try {
    const data = await hashtagsService.getAllHashtags();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

const toggleSaveHashtag = async (req, res, next) => {
  try {
    const { tag, note } = req.body;
    const updated = await hashtagsService.toggleSaveHashtag(tag, note);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

const recordUsage = async (req, res, next) => {
  try {
    const { tags } = req.body;
    const results = await hashtagsService.recordUsage(tags);
    res.json(results);
  } catch (err) {
    next(err);
  }
};

const updateNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const updated = await hashtagsService.updateNote(id, note);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

const deleteHashtag = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await hashtagsService.deleteHashtag(id);
    res.json(deleted);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllHashtags,
  toggleSaveHashtag,
  recordUsage,
  updateNote,
  deleteHashtag,
};
