const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protects routes: requires "Authorization: Bearer <token>"
module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Please log in to continue' });
    }
    let decoded;
    try {
      decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Session expired. Please log in again' });
    }
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User no longer exists' });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
