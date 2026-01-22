import express from 'express';
import { 
  getOverview, 
  getUsers, 
  togglePremium, 
  getLoginEmails,
  getUserUsage,
  createAdmin
} from '../controllers/adminController.js';
import { authenticate, isAdmin } from '../middleware/authMiddleware.js';
import { adminLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(isAdmin);
router.use(adminLimiter);

router.get('/overview', getOverview);
router.get('/users', getUsers);
router.post('/toggle-premium', togglePremium);
router.get('/login-emails', getLoginEmails);
router.get('/user-usage/:userId', getUserUsage);
router.post('/create-admin', createAdmin);

export default router;
