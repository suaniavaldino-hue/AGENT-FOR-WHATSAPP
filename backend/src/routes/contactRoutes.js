import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { createContact, getConversation, listContacts, updateContact } from '../controllers/contactController.js';

const router = Router();
router.use(authMiddleware);
router.get('/', listContacts);
router.post('/', createContact);
router.put('/:id', updateContact);
router.get('/:id/messages', getConversation);

export default router;
