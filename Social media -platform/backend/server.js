const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json({ limit: '6mb' })); // images are sent as base64 text

// API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api', require('./routes/commentRoutes'));
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));

// Serve the frontend so the whole app runs on one port
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing in .env');
  process.exit(1);
}
connectDB()
  .then(() => app.listen(PORT, () => console.log(`ConnectHub running at http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
