const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Stores images on disk in /uploads. For production use Cloudinary or S3 instead.
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) =>
    cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase()),
});

module.exports = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^image\/(jpe?g|png|webp|gif)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only image files are allowed')),
});
