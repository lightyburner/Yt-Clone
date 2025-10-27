const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const {
  uploadVideo,
  getAllVideos,
  getVideoById,
  deleteVideo
} = require('../controllers/video.controller');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed for video field'));
      }
    } else if (file.fieldname === 'thumbnail') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for thumbnail field'));
      }
    } else {
      cb(null, true);
    }
  }
});

router.get('/', optionalAuth, getAllVideos);
router.get('/:id', optionalAuth, getVideoById);
router.post('/', authenticateToken, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), uploadVideo);
router.delete('/:id', authenticateToken, deleteVideo);

module.exports = router;
