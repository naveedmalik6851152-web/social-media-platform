const Comment = require('../models/Comment');
const Post = require('../models/Post');

// GET /api/posts/:postId/comments
exports.getComments = async (req, res) => {
  const comments = await Comment.find({ post: req.params.postId }).sort('createdAt').populate('user', 'name username profilePicture');
  res.json({ comments });
};

// POST /api/posts/:postId/comments
exports.addComment = async (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ message: 'Comment cannot be empty' });
  if (text.length > 300) return res.status(400).json({ message: 'Comment must be 300 characters or less' });
  if (!(await Post.exists({ _id: req.params.postId }))) return res.status(404).json({ message: 'Post not found' });

  const comment = await Comment.create({ user: req.user._id, post: req.params.postId, text });
  await comment.populate('user', 'name username profilePicture');
  res.status(201).json({ comment });
};

// DELETE /api/comments/:id  (author only)
exports.deleteComment = async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ message: 'Comment not found' });
  if (comment.user.toString() !== req.user.id) return res.status(403).json({ message: 'You can only delete your own comments' });
  await comment.deleteOne();
  res.json({ message: 'Comment deleted' });
};
