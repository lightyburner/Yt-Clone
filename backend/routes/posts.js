const express = require('express');
const { prisma } = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created, badRequest, forbidden } = require('../utils/response');
const auth = require('../middleware/auth');

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
router.post('/', auth, asyncHandler(async (req, res) => {
	const { content, video_url } = req.body;
	if (!content && !video_url) return badRequest(res, 'Content or video_url is required');
	const p = await prisma.post.create({
		data: { userId: BigInt(req.user.id), content: content || null, videoUrl: video_url || null },
		select: { id: true, userId: true, content: true, videoUrl: true, createdAt: true, updatedAt: true },
	});
	return created(res, { post: { id: p.id, user_id: p.userId, content: p.content, video_url: p.videoUrl, created_at: p.createdAt, updated_at: p.updatedAt } });
}));

// GET /api/posts/:id/comments - public
router.get('/:id/comments', asyncHandler(async (req, res) => {
	const postId = req.params.id;
	const comments = await prisma.comment.findMany({ where: { postId: BigInt(postId) }, select: { id: true, userId: true, postId: true, content: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
	return ok(res, { comments });
}));

// POST /api/posts/:id/comments - create comment (auth)
router.post('/:id/comments', auth, asyncHandler(async (req, res) => {
	const postId = req.params.id;
	const { content } = req.body;
	if (!content || !content.trim()) return badRequest(res, 'Comment content is required');
	const comment = await prisma.comment.create({ data: { postId: BigInt(postId), userId: BigInt(req.user.id), content }, select: { id: true, userId: true, postId: true, content: true, createdAt: true } });
	return created(res, { comment });
}));

// POST /api/posts/:id/like - toggle like (auth)
router.post('/:id/like', auth, asyncHandler(async (req, res) => {
	const postId = req.params.id;
	const existing = await prisma.like.findUnique({ where: { postId_userId: { postId: BigInt(postId), userId: BigInt(req.user.id) } }, select: { id: true } });
	if (existing) { await prisma.like.delete({ where: { id: existing.id } }); return ok(res, { liked: false }); }
	await prisma.like.create({ data: { postId: BigInt(postId), userId: BigInt(req.user.id) } });
	return ok(res, { liked: true });
}));

// GET /api/posts/me - my posts (auth)
router.get('/me/mine', auth, asyncHandler(async (req, res) => {
	const data = await prisma.post.findMany({ where: { userId: BigInt(req.user.id) }, select: { id: true, userId: true, content: true, videoUrl: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: 'desc' } });
	return ok(res, { posts: data.map(p => ({ id: p.id, user_id: p.userId, content: p.content, video_url: p.videoUrl, created_at: p.createdAt, updated_at: p.updatedAt })) });
}));

// PUT /api/posts/:id - update (owner)
router.put('/:id', auth, asyncHandler(async (req, res) => {
	const postId = req.params.id;
	const { content, video_url } = req.body;
	const post = await prisma.post.findUnique({ where: { id: BigInt(postId) }, select: { id: true, userId: true } });
	if (!post || post.userId !== BigInt(req.user.id)) return forbidden(res, 'Not allowed');
	const updated = await prisma.post.update({ where: { id: BigInt(postId) }, data: { content, videoUrl: video_url }, select: { id: true, userId: true, content: true, videoUrl: true, createdAt: true, updatedAt: true } });
	return ok(res, { post: { id: updated.id, user_id: updated.userId, content: updated.content, video_url: updated.videoUrl, created_at: updated.createdAt, updated_at: updated.updatedAt } });
}));

// DELETE /api/posts/:id - delete (owner)
router.delete('/:id', auth, asyncHandler(async (req, res) => {
	const postId = req.params.id;
	const post = await prisma.post.findUnique({ where: { id: BigInt(postId) }, select: { id: true, userId: true } });
	if (!post || post.userId !== BigInt(req.user.id)) return forbidden(res, 'Not allowed');
	await prisma.post.delete({ where: { id: BigInt(postId) } });
	return ok(res, { success: true });
}));

module.exports = router;
