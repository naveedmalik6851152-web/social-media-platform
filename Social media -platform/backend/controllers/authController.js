const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
exports.register = async (req, res) => {
  const name = (req.body.name || '').trim();
  const username = (req.body.username || '').trim().toLowerCase();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const profilePicture = req.body.profilePicture || '';

  if (!name || !username || !email || !password) return res.status(400).json({ message: 'All fields are required' });
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ message: 'Username must be 3-20 characters: letters, numbers or underscores' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Please enter a valid email address' });
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters and include a letter and a number' });
  }
  if (profilePicture && (!profilePicture.startsWith('data:image/') || profilePicture.length > 2_000_000)) {
    return res.status(400).json({ message: 'Invalid or too large profile picture' });
  }

  if (await User.findOne({ email })) return res.status(409).json({ message: 'An account with this email already exists' });
  if (await User.findOne({ username })) return res.status(409).json({ message: 'This username is already taken' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, username, email, password: hashed, profilePicture });
  res.status(201).json({ message: 'Account created successfully', token: signToken(user._id), user });
};

// POST /api/auth/login  (accepts email or username)
exports.login = async (req, res) => {
  const identifier = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  if (!identifier || !password) return res.status(400).json({ message: 'Email and password are required' });

  const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  res.json({ message: 'Logged in successfully', token: signToken(user._id), user });
};

// GET /api/auth/me
exports.me = async (req, res) => res.json({ user: req.user });
