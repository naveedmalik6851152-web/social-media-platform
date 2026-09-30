// Central error handler: logs details on the server, sends friendly messages to users
module.exports = (err, req, res, next) => {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: 'That value is already in use' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors)[0].message });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Image is too large' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
  res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
};
