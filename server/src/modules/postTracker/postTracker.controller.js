const service = require('./postTracker.service');
const storageService = require('../storage/supabaseStorage.service');
const videoCompressionService = require('../storage/videoCompression.service');
const { syncPostStatus } = require('../../jobs/syncPostStatus.job');
const fs = require('fs');
const path = require('path');

const getPosts = async (req, res, next) => {
  try {
    const { range, startDate, endDate, timezone, status, platform, pageId, brandId, search, limit, offset } = req.query;
    const posts = await service.listPosts({
      range,
      startDate,
      endDate,
      timezone,
      status,
      platform,
      pageId,
      brandId,
      search,
      limit,
      offset
    });
    res.json(posts);
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const { range, startDate, endDate, timezone, status, platform, pageId, brandId } = req.query;
    const summary = await service.getPostsSummary({
      range,
      startDate,
      endDate,
      timezone,
      status,
      platform,
      pageId,
      brandId
    });
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await service.getPostById(id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (error) {
    next(error);
  }
};

// In-flight / rapid-duplicate submission guard (prevents accidental multi-clicks creating duplicate posts)
const recentCreations = new Map();

const isDuplicateSubmission = (pageId, message, mediaUrl) => {
  const key = `${pageId}_${(message || '').trim()}_${typeof mediaUrl === 'string' ? mediaUrl : JSON.stringify(mediaUrl || '')}`;
  const now = Date.now();
  if (recentCreations.has(key)) {
    const lastTimestamp = recentCreations.get(key);
    if (now - lastTimestamp < 4000) {
      return true;
    }
  }
  recentCreations.set(key, now);
  setTimeout(() => recentCreations.delete(key), 10000);
  return false;
};

const createPost = async (req, res, next) => {
  try {
    const postData = {
      ...req.body,
      marked_by: req.user?.id || 1,
    };

    // Prevent duplicate rapid submissions from rapid clicks or network retries
    if (isDuplicateSubmission(postData.page_id, postData.message, postData.media_url)) {
      console.warn(`[createPost] Duplicate submission detected for page ${postData.page_id} within 4s. Ignoring.`);
      return res.status(200).json({ message: 'Duplicate post creation ignored' });
    }

    // If direct scheduling / publishing mode (Method 1)
    if (req.body.mode === 'schedule' || !req.body.fb_post_id) {
      const newPost = await service.createAndSchedulePost(postData);
      return res.status(201).json(newPost);
    }

    // Legacy: tracking existing post by pasting Facebook URL
    const newPost = await service.markPost(postData);
    res.status(201).json(newPost);
  } catch (error) {
    next(error);
  }
};

const publishNow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const published = await service.publishNow(id);
    res.json(published);
  } catch (error) {
    next(error);
  }
};

const uploadImage = async (req, res, next) => {
  const tempRawPath = req.file?.path;
  let tempCompressedPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ext = path.extname(req.file.originalname || '').toLowerCase();
    const mime = (req.file.mimetype || '').toLowerCase();
    const isVideo = mime.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv|m4v|3gp)$/i.test(ext);

    let uploadPath = req.file.path;
    let uploadFilename = req.file.originalname;
    let uploadMimeType = req.file.mimetype;

    if (isVideo) {
      try {
        console.log(`[Upload] 🎥 Detected video: ${req.file.originalname} (${(req.file.size / (1024 * 1024)).toFixed(2)} MB). Starting compression...`);
        const comp = await videoCompressionService.compressVideo(req.file.path);
        if (!comp.skipped) {
          uploadPath = comp.outputPath;
          tempCompressedPath = comp.outputPath;
          uploadFilename = comp.filename;
          uploadMimeType = 'video/mp4';
        }
      } catch (compErr) {
        console.warn(`[Upload] ⚠️ Video compression failed, falling back to original file:`, compErr.message);
      }
    }

    const publicUrl = await storageService.uploadLocalFile(
      uploadPath,
      uploadFilename,
      uploadMimeType
    );

    // Clean up temporary files
    try {
      if (tempRawPath && fs.existsSync(tempRawPath)) fs.unlinkSync(tempRawPath);
      if (tempCompressedPath && fs.existsSync(tempCompressedPath)) fs.unlinkSync(tempCompressedPath);
    } catch (cleanErr) {
      console.warn('[Upload] Temp file cleanup warning:', cleanErr.message);
    }

    res.json({
      url: publicUrl,
      filename: uploadFilename,
    });
  } catch (error) {
    // Ensure temp files are cleaned up on error
    try {
      if (tempRawPath && fs.existsSync(tempRawPath)) fs.unlinkSync(tempRawPath);
      if (tempCompressedPath && fs.existsSync(tempCompressedPath)) fs.unlinkSync(tempCompressedPath);
    } catch (_) {}
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await service.updatePost(id, req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const updatePostData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await service.editPostData(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Post not found' });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await service.removePost(id);
    if (!deleted) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post deleted successfully', deleted });
  } catch (error) {
    next(error);
  }
};

const updatePostCosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content_cost, ad_spend } = req.body;
    const updated = await service.updatePostCosts(id, content_cost || 0, ad_spend || 0);
    if (!updated) return res.status(404).json({ error: 'Post not found' });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const triggerSync = async (req, res, next) => {
  try {
    await syncPostStatus();
    res.json({ message: 'Sync completed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPosts,
  getSummary,
  getPostById,
  createPost,
  publishNow,
  uploadImage,
  updatePost,
  updatePostData,
  deletePost,
  updatePostCosts,
  triggerSync,
};