const { PrismaClient } = require('@prisma/client');
const { supabase, supabaseUrl } = require('../config/supabase');
const prisma = new PrismaClient();

const uploadVideo = async (req, res) => {
  try {
    const { content, description } = req.body;
    const userId = req.user.id;

    if (!req.files || !req.files.video) {
      return res.status(400).json({ message: 'Video file is required' });
    }

    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    const timestamp = Date.now();
    const videoFileName = `${userId}/${timestamp}_${videoFile.originalname}`;
    const videoPath = videoFileName.replace(/\s+/g, '_');

    const { data: videoData, error: videoError } = await supabase.storage
      .from('videos')
      .upload(videoPath, videoFile.buffer, {
        contentType: videoFile.mimetype,
        upsert: false
      });

    if (videoError) {
      console.error('Video upload error:', videoError);
      return res.status(500).json({ message: 'Failed to upload video', error: videoError.message });
    }

    const videoUrl = `${supabaseUrl}/storage/v1/object/public/videos/${videoPath}`;

    let thumbnailUrl = null;
    if (thumbnailFile) {
      const thumbnailFileName = `${userId}/${timestamp}_${thumbnailFile.originalname}`;
      const thumbnailPath = thumbnailFileName.replace(/\s+/g, '_');

      const { data: thumbnailData, error: thumbnailError } = await supabase.storage
        .from('thumbnails')
        .upload(thumbnailPath, thumbnailFile.buffer, {
          contentType: thumbnailFile.mimetype,
          upsert: false
        });

      if (!thumbnailError) {
        thumbnailUrl = `${supabaseUrl}/storage/v1/object/public/thumbnails/${thumbnailPath}`;
      }
    }

    const post = await prisma.post.create({
      data: {
        userId: BigInt(userId),
        content: content || 'Untitled Video',
        description: description || '',
        videoUrl,
        thumbnailUrl,
        views: 0,
        likes: 0,
        dislikes: 0
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const serializedPost = {
      ...post,
      id: post.id.toString(),
      userId: post.userId.toString(),
      user: {
        ...post.user,
        id: post.user.id.toString()
      }
    };

    res.status(201).json({
      message: 'Video uploaded successfully',
      post: serializedPost
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllVideos = async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const serializedPosts = posts.map(post => ({
      ...post,
      id: post.id.toString(),
      userId: post.userId.toString(),
      user: {
        ...post.user,
        id: post.user.id.toString()
      },
      comments_count: post._count.comments
    }));

    res.json({ posts: serializedPosts });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id: BigInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ message: 'Video not found' });
    }

    await prisma.post.update({
      where: { id: BigInt(id) },
      data: { views: { increment: 1 } }
    });

    const serializedPost = {
      ...post,
      id: post.id.toString(),
      userId: post.userId.toString(),
      user: {
        ...post.user,
        id: post.user.id.toString()
      },
      comments: post.comments.map(comment => ({
        ...comment,
        id: comment.id.toString(),
        userId: comment.userId.toString(),
        postId: comment.postId.toString(),
        user: {
          ...comment.user,
          id: comment.user.id.toString()
        }
      }))
    };

    res.json({ post: serializedPost });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const post = await prisma.post.findUnique({
      where: { id: BigInt(id) }
    });

    if (!post) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (post.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this video' });
    }

    if (post.videoUrl) {
      const videoPath = post.videoUrl.split('/videos/')[1];
      if (videoPath) {
        await supabase.storage.from('videos').remove([videoPath]);
      }
    }

    if (post.thumbnailUrl) {
      const thumbnailPath = post.thumbnailUrl.split('/thumbnails/')[1];
      if (thumbnailPath) {
        await supabase.storage.from('thumbnails').remove([thumbnailPath]);
      }
    }

    await prisma.post.delete({
      where: { id: BigInt(id) }
    });

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  uploadVideo,
  getAllVideos,
  getVideoById,
  deleteVideo
};
