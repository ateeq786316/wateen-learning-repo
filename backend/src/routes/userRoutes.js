const { Router } = require('express');
const UserController = require('../controllers/userController');
const authenticate = require('../auth/middleware/authenticate');
const authorize = require('../auth/middleware/authorize');

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', UserController.getAll);
router.get('/:id', UserController.getById);
router.post('/', UserController.create);
router.put('/:id', UserController.update);
router.delete('/:id', UserController.delete);

module.exports = router;
