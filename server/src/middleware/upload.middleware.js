const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads/posts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();

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
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter,
});

module.exports = upload;
