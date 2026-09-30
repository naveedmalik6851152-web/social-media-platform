const router = require('express').Router();
const asyncHandler = require('../middleware/asyncHandler');
const auth = require('../middleware/auth');
const validateId = require('../middleware/validateId');
const c = require('../controllers/userController');

router.use(auth); // every user route requires login
router.get('/', asyncHandler(c.getUsers));
router.get('/:id', validateId, asyncHandler(c.getUser));
router.put('/:id', validateId, asyncHandler(c.updateUser));
router.post('/:id/follow', validateId, asyncHandler(c.follow));
router.delete('/:id/follow', validateId, asyncHandler(c.unfollow));

module.exports = router;
