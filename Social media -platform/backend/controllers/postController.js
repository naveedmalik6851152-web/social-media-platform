const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

const USER_FIELDS = 'name username profilePicture';
const PAGE_SIZE = 10;

// Adds a commentCount to each post (one aggregate query instead of N queries)
async function withCounts(posts) {
  const counts = await Comment.aggregate([
    { $match: { post: { $in: posts.map((p) => p._id) } } },
    { $group: { _id: '$post', n: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(counts.map((c) => [c._id.toString(), c.n]));
  return posts.map((p) => ({ ...p.toObject(), commentCount: map[p._id.toString()] || 0 }));
}

// GET /api/posts?page=1&user=<id>&feed=following
exports.getPosts = async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const filter = {};
  if (req.query.user) {
    if (!mongoose.isValidObjectId(req.query.user)) return res.status(400).json({ message: 'Invalid user id' });
    filter.user = req.query.user;
  }
  if (req.query.feed === 'following') filter.user = { $in: [...req.user.following, req.user._id] };

  const [posts, total] = await Promise.all([
    Post.find(filter).sort('-createdAt').skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).populate('user', USER_FIELDS),
    Post.countDocuments(filter),
  ]);
  res.json({ posts: await withCounts(posts), page, total, hasMore: page * PAGE_SIZE < total });
};

// GET /api/posts/:id
exports.getPost = async (req, res) => {
  const post = await Post.findById(req.params.id).populate('user', USER_FIELDS);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  res.json({ post: (await withCounts([post]))[0] });
};

// POST /api/posts
exports.createPost = async (req, res) => {
  const content = (req.body.content || '').trim();
  const image = req.body.image || '';
  if (!content && !image) return res.status(400).json({ message: 'A post needs text or an image' });
  if (content.length > 1000) return res.status(400).json({ message: 'Post must be 1000 characters or less' });
  if (image && (!image.startsWith('data:image/') || image.length > 3_000_000)) {
    return res.status(400).json({ message: 'Invalid or too large image' });
  }
  const post = await Post.create({ user: req.user._id, content, image });
  await post.populate('user', USER_FIELDS);
  res.status(201).json({ message: 'Post published', post: (await withCounts([post]))[0] });
};

// PUT /api/posts/:id  (owner only)
exports.updatePost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (post.user.toString() !== req.user.id) return res.status(403).json({ message: 'You can only edit your own posts' });

  const content = req.body.content !== undefined ? req.body.content.trim() : post.content;
  const image = req.body.image !== undefined ? req.body.image : post.image;
  if (!content && !image) return res.status(400).json({ message: 'A post needs text or an image' });
  if (content.length > 1000) return res.status(400).json({ message: 'Post must be 1000 characters or less' });
  if (image && (!image.startsWith('data:image/') || image.length > 3_000_000)) {
    return res.status(400).json({ message: 'Invalid or too large image' });
  }
  post.content = content;
  post.image = image;
  await post.save();
  await post.populate('user', USER_FIELDS);
  res.json({ message: 'Post updated', post: (await withCounts([post]))[0] });
};

// DELETE /api/posts/:id  (owner only)
exports.deletePost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (post.user.toString() !== req.user.id) return res.status(403).json({ message: 'You can only delete your own posts' });
  await Comment.deleteMany({ post: post._id });
  await post.deleteOne();
  res.json({ message: 'Post deleted' });
};

// POST /api/posts/:id/like   ($addToSet = no duplicate likes)
exports.likePost = async (req, res) => {
  const post = await Post.findByIdAndUpdate(req.params.id, { $addToSet: { likes: req.user._id } }, { new: true });
  if (!post) return res.status(404).json({ message: 'Post not found' });
  res.json({ likes: post.likes });
};

// DELETE /api/posts/:id/like
exports.unlikePost = async (req, res) => {
  const post = await Post.findByIdAndUpdate(req.params.id, { $pull: { likes: req.user._id } }, { new: true });
  if (!post) return res.status(404).json({ message: 'Post not found' });
  res.json({ likes: post.likes });
};
