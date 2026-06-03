import { Router } from 'express';
import { chatHandler } from '../controllers/chat.Controller.js';

const router = Router();

router.post('/', chatHandler);

export default router;
