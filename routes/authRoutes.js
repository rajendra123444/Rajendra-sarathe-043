import express from 'express';
import { register, login } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

export default router;