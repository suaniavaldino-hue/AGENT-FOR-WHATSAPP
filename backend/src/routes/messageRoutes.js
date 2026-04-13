import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { confirmPayment, sendMessage, whatsappWebhookReceive, whatsappWebhookVerify } from '../controllers/messageController.js';

const router = Router();
router.post('/send', authMiddleware, sendMessage);
router.post('/payment/confirm', authMiddleware, confirmPayment);
router.get('/webhook', whatsappWebhookVerify);
router.post('/webhook', whatsappWebhookReceive);

export default router;
