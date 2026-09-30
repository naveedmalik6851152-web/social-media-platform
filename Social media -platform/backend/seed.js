// Creates demo accounts + sample data. Run: npm run seed   (WARNING: clears existing data)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([User.deleteMany(), Post.deleteMany(), Comment.deleteMany()]);
  const password = await bcrypt.hash('Password123', 10);
  const [alice, bob, carol] = await User.create([
    { name: 'Alice Johnson', username: 'alice', email: 'alice@example.com', password, bio: 'Designer & coffee lover ☕' },
    { name: 'Bob Smith', username: 'bob', email: 'bob@example.com', password, bio: 'Full-stack developer. Building things.' },
    { name: 'Carol Lee', username: 'carol', email: 'carol@example.com', password, bio: 'Photographer. Traveller.' },
  ]);
  await User.updateOne({ _id: alice._id }, { $push: { following: bob._id }, });
  await User.updateOne({ _id: bob._id }, { $push: { followers: alice._id } });
  const posts = await Post.create([
    { user: alice._id, content: 'Hello ConnectHub! Excited to be here 🎉', likes: [bob._id] },
    { user: bob._id, content: 'Just shipped my first full-stack project with Node, Express and MongoDB.' },
    { user: carol._id, content: 'Golden hour never gets old. 🌇' },
  ]);
  await Comment.create({ user: bob._id, post: posts[0]._id, text: 'Welcome, Alice!' });
  console.log('Seeded. Log in with alice@example.com / Password123');
  await mongoose.disconnect();
})();
