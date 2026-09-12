const hashtagsRepository = require('./hashtags.repository');

const getAllHashtags = async () => {
  return await hashtagsRepository.getAllHashtags();
};

const toggleSaveHashtag = async (tag, note) => {
  if (!tag || typeof tag !== 'string') {
    throw new Error('Valid hashtag string is required');
  }
  return await hashtagsRepository.toggleSaveHashtag(tag, note);
};

const recordUsage = async (tags) => {
  if (!Array.isArray(tags)) {
    throw new Error('Tags must be an array of strings');
  }
  return await hashtagsRepository.recordUsage(tags);
};

const updateNote = async (id, note) => {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    throw new Error('Valid hashtag ID is required');
  }
  return await hashtagsRepository.updateNote(numericId, note);
};

const deleteHashtag = async (id) => {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    throw new Error('Valid hashtag ID is required');
  }
  return await hashtagsRepository.deleteHashtag(numericId);
};

module.exports = {
  getAllHashtags,
  toggleSaveHashtag,
  recordUsage,
  updateNote,
  deleteHashtag,
};
