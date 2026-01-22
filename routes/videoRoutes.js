import express from 'express';
import { 
  generateShorts, 
  getVideoStatus, 
  downloadClip, 
  getUserStats 
} from '../controllers/videoController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { videoProcessLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Apply rate limiting for free users
router.post('/generate-shorts', videoProcessLimiter, generateShorts);
router.get('/status/:videoId', getVideoStatus);
router.get('/download/:videoId/:clipIndex', downloadClip);
router.get('/stats', getUserStats);

export default router;