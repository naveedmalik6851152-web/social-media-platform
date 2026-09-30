const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const c = require('../controllers/commentController');

router.get('/posts/:postId/comments', auth, validateId, asyncHandler(c.getComments));
router.post('/posts/:postId/comments', auth, validateId, asyncHandler(c.addComment));
router.delete('/comments/:id', auth, validateId, asyncHandler(c.deleteComment));

module.exports = router;
