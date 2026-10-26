import express from 'express';
import { login, getCurrentUser, listUsers } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticateToken, getCurrentUser);
router.get('/users', authenticateToken, listUsers);

export default router;
