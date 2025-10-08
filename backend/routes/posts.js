const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { prisma } = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, badRequest, forbidden } = require('../utils/response');
const auth = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/videos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed'), false);
      }
    } else if (file.fieldname === 'thumbnail') {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for thumbnails'), false);
      }
    } else {
      cb(null, true);
    }
  }
});

const router = express.Router();

// GET /api/posts - public feed
router.get('/', asyncHandler(async (req, res) => {
	const posts = await prisma.post.findMany({
		select: { id: true, userId: true, content: true, videoUrl: true, createdAt: true, updatedAt: true },
		orderBy: { createdAt: 'desc' },
		take: 50,
	});
	return ok(res, { posts: posts.map(p => ({ id: p.id, user_id: p.userId, content: p.content, video_url: p.videoUrl, created_at: p.createdAt, updated_at: p.updatedAt })) });
}));

// POST /api/posts - create post (auth)
router.post('/', auth, upload.fields([
	{ name: 'video', maxCount: 1 },
	{ name: 'thumbnail', maxCount: 1 }
]), asyncHandler(async (req, res) => {
	const { content, description } = req.body;
	const videoFile = req.files?.video?.[0];
	const thumbnailFile = req.files?.thumbnail?.[0];
	
	if (!content && !videoFile) return badRequest(res, 'Content or video file is required');
	
	// Handle file paths
	let videoUrl = null;
	let thumbnailUrl = null;
	
	if (videoFile) {
		videoUrl = `/uploads/videos/${videoFile.filename}`;
	}
	
	if (thumbnailFile) {
		thumbnailUrl = `/uploads/videos/${thumbnailFile.filename}`;
	}
	
	const p = await prisma.post.create({
		data: { 
			userId: req.user.id, 
			content: content || null, 
			videoUrl: videoUrl,
			thumbnailUrl: thumbnailUrl,
			description: description || null
		},
		select: { id: true, userId: true, content: true, videoUrl: true, thumbnailUrl: true, description: true, createdAt: true, updatedAt: true },
	});
	
	return created(res, { 
		post: { 
			id: p.id, 
			user_id: p.userId, 
			content: p.content, 
			video_url: p.videoUrl, 
			thumbnail_url: p.thumbnailUrl,
			description: p.description,
			created_at: p.createdAt, 
			updated_at: p.updatedAt 
		} 
	});
}));

// GET /api/posts/:id/comments - public
router.get('/:id/comments', asyncHandler(async (req, res) => {
	const postId = req.params.id;
	const comments = await prisma.comment.findMany({ where: { postId: parseInt(postId) }, select: { id: true, userId: true, postId: true, content: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
	return ok(res, { comments });
}));

// POST /api/posts/:id/comments - create comment (auth)
router.post('/:id/comments', auth, asyncHandler(async (req, res) => {
	const postId = req.params.id;
	const { content } = req.body;
	if (!content || !content.trim()) return badRequest(res, 'Comment content is required');
	const comment = await prisma.comment.create({ data: { postId: parseInt(postId), userId: req.user.id, content }, select: { id: true, userId: true, postId: true, content: true, createdAt: true } });
	return created(res, { comment });
}));

// POST /api/posts/:id/like - toggle like (auth)
router.post('/:id/like', auth, asyncHandler(async (req, res) => {
	const postId = req.params.id;
	const existing = await prisma.like.findUnique({ where: { postId_userId: { postId: parseInt(postId), userId: req.user.id } }, select: { id: true } });
	if (existing) { await prisma.like.delete({ where: { id: existing.id } }); return ok(res, { liked: false }); }
	await prisma.like.create({ data: { postId: parseInt(postId), userId: req.user.id } });
	return ok(res, { liked: true });
}));

// GET /api/posts/me - my posts (auth)
router.get('/me/mine', auth, asyncHandler(async (req, res) => {
	const data = await prisma.post.findMany({ where: { userId: req.user.id }, select: { id: true, userId: true, content: true, videoUrl: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: 'desc' } });
	return ok(res, { posts: data.map(p => ({ id: p.id, user_id: p.userId, content: p.content, video_url: p.videoUrl, created_at: p.createdAt, updated_at: p.updatedAt })) });
}));

// PUT /api/posts/:id - update (owner)
router.put('/:id', auth, asyncHandler(async (req, res) => {
	const postId = req.params.id;
	const { content, video_url } = req.body;
	const post = await prisma.post.findUnique({ where: { id: parseInt(postId) }, select: { id: true, userId: true } });
	if (!post || post.userId !== req.user.id) return forbidden(res, 'Not allowed');
	const updated = await prisma.post.update({ where: { id: parseInt(postId) }, data: { content, videoUrl: video_url }, select: { id: true, userId: true, content: true, videoUrl: true, createdAt: true, updatedAt: true } });
	return ok(res, { post: { id: updated.id, user_id: updated.userId, content: updated.content, video_url: updated.videoUrl, created_at: updated.createdAt, updated_at: updated.updatedAt } });
}));

// DELETE /api/posts/:id - delete (owner)
router.delete('/:id', auth, asyncHandler(async (req, res) => {
	const postId = req.params.id;
	const post = await prisma.post.findUnique({ where: { id: parseInt(postId) }, select: { id: true, userId: true } });
	if (!post || post.userId !== req.user.id) return forbidden(res, 'Not allowed');
	await prisma.post.delete({ where: { id: parseInt(postId) } });
	return ok(res, { success: true });
}));

module.exports = router;
