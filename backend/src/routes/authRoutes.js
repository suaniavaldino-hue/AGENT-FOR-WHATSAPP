import { Router } from 'express';
import { googleAuth, login, me, register } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', authMiddleware, me);

export default router;
