
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { createAutomation, deleteAutomation, listAutomations, reorderAutomations, updateAutomation } from '../controllers/automationController.js';

const router = Router();
router.use(authMiddleware);
router.get('/', listAutomations);
router.post('/', createAutomation);
router.post('/reorder', reorderAutomations);
router.put('/:id', updateAutomation);
router.delete('/:id', deleteAutomation);

export default router;
