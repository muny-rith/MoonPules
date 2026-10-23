const multer = require('multer');
const path = require('path');
const fs = require('fs');

const tempDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const cleanBase = path.basename(file.originalname || 'upload', ext).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `upload_${Date.now()}_${cleanBase}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  const isImage = mime.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(ext);
  const isVideo = mime.startsWith('video/') || /\.(mp4|mov|webm|avi|mkv|m4v|3gp)$/i.test(ext);

  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(new Error('Only images and video files are supported'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter,
});

module.exports = upload;
