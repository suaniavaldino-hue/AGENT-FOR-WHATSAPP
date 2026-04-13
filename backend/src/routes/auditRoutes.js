import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditController.js';
import { authMiddleware, requireAdmin } from '../middlewares/auth.js';

const router = Router();
router.use(authMiddleware, requireAdmin);
router.get('/', listAuditLogs);

export default router;
