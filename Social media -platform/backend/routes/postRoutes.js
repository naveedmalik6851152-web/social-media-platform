const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const c = require('../controllers/postController');

router.use(auth);
router.get('/', asyncHandler(c.getPosts));
router.post('/', asyncHandler(c.createPost));
router.get('/:id', validateId, asyncHandler(c.getPost));
router.put('/:id', validateId, asyncHandler(c.updatePost));
router.delete('/:id', validateId, asyncHandler(c.deletePost));
router.post('/:id/like', validateId, asyncHandler(c.likePost));
router.delete('/:id/like', validateId, asyncHandler(c.unlikePost));

module.exports = router;
