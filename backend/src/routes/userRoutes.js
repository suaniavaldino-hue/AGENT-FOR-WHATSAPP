import { Router } from 'express';
import { createUser, listUsers, updateUser } from '../controllers/userController.js';
import { authMiddleware, requireAdmin } from '../middlewares/auth.js';

const router = Router();
router.use(authMiddleware, requireAdmin);
router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);

export default router;
