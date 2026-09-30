const mongoose = require('mongoose');

// Rejects invalid MongoDB ObjectIds in route params (e.g. /posts/abc)
module.exports = (req, res, next) => {
  for (const [name, value] of Object.entries(req.params)) {
    if (!mongoose.isValidObjectId(value)) return res.status(400).json({ message: `Invalid ${name}` });
  }
  next();
};
