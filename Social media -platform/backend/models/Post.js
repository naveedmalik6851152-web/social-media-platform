const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, trim: true, maxlength: 1000, default: '' },
    image: { type: String, default: '' }, // stored as a (resized) base64 data URL
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

module.exports = mongoose.model('Post', postSchema);
