
import { Router } from 'express';
import { confirmAccessCode, createConnection, listConnections, requestAccessCode } from '../controllers/connectionController.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
router.use(authMiddleware);
router.get('/', listConnections);
router.post('/', createConnection);
router.post('/request-access-code', requestAccessCode);
router.post('/confirm-access-code', confirmAccessCode);

export default router;
