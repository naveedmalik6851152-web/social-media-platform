const User = require('../models/User');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/users?search=term  -> search by name/username, or suggestions when empty
exports.getUsers = async (req, res) => {
  const q = (req.query.search || '').trim();
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter._id = { $ne: req.user._id };
    filter.$or = [{ username: rx }, { name: rx }];
  } else {
    filter._id = { $nin: [req.user._id, ...req.user.following] };
  }
  const users = await User.find(filter).select('-email').sort(q ? 'name' : '-createdAt').limit(20);
  res.json({ users });
};

// GET /api/users/:id
exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id).select('-email');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
};

// PUT /api/users/:id  (only your own profile)
exports.updateUser = async (req, res) => {
  if (req.params.id !== req.user.id) return res.status(403).json({ message: 'You can only edit your own profile' });
  const { name, bio, profilePicture } = req.body;

  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ message: 'Name cannot be empty' });
    req.user.name = name.trim();
  }
  if (bio !== undefined) {
    if (bio.length > 200) return res.status(400).json({ message: 'Bio must be 200 characters or less' });
    req.user.bio = bio.trim();
  }
  if (profilePicture !== undefined) {
    if (profilePicture && (!profilePicture.startsWith('data:image/') || profilePicture.length > 2_000_000)) {
      return res.status(400).json({ message: 'Invalid or too large profile picture' });
    }
    req.user.profilePicture = profilePicture;
  }
  await req.user.save();
  res.json({ message: 'Profile updated', user: req.user });
};

// POST /api/users/:id/follow
exports.follow = async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ message: 'You cannot follow yourself' });
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: 'User not found' });

  // $addToSet prevents duplicates
  await User.updateOne({ _id: req.user._id }, { $addToSet: { following: target._id } });
  const updated = await User.findByIdAndUpdate(target._id, { $addToSet: { followers: req.user._id } }, { new: true }).select('-email');
  const me = await User.findById(req.user._id);
  res.json({ message: `You are now following @${target.username}`, user: updated, me });
};

// DELETE /api/users/:id/follow
exports.unfollow = async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ message: 'You cannot unfollow yourself' });
  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ message: 'User not found' });

  await User.updateOne({ _id: req.user._id }, { $pull: { following: target._id } });
  const updated = await User.findByIdAndUpdate(target._id, { $pull: { followers: req.user._id } }, { new: true }).select('-email');
  const me = await User.findById(req.user._id);
  res.json({ message: `You unfollowed @${target.username}`, user: updated, me });
};
