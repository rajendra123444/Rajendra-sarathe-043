import Video from '../models/Video.js';
import UsageLog from '../models/UsageLog.js';
import User from '../models/User.js';
import { processYouTubeVideo } from '../utils/videoProcessor.js';
import { cleanupOldFiles } from '../utils/helpers.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check user limits
const checkUserLimits = async (userId) => {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  // Check if user is admin (no limits)
  if (user.role === 'admin') {
    return { canProcess: true, reason: 'admin' };
  }

  // Check if premium
  if (user.isPremium) {
    // Premium: Check monthly limit (600 videos)
    if (user.videosProcessed >= 600) {
      return { 
        canProcess: false, 
        reason: 'Monthly limit reached (600 videos)' 
      };
    }
    return { canProcess: true, reason: 'premium' };
  }

  // Free user: Check daily limit and 24-hour window
  const now = new Date();
  const lastReset = new Date(user.lastVideoReset);
  const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);

  // Reset counter if 24 hours have passed
  if (hoursSinceReset >= 24) {
    user.videosProcessed = 0;
    user.lastVideoReset = now;
    await user.save();
  }

  // Check limit
  if (user.videosProcessed >= 5) {
    return { 
      canProcess: false, 
      reason: 'Daily limit reached (5 videos)', 
      isFreeLimit: true 
    };
  }

  return { canProcess: true, reason: 'free' };
};

// Generate shorts
export const generateShorts = async (req, res) => {
  try {
    const { videoUrl } = req.body;
    const userId = req.user._id;

    // Validate URL
    if (!videoUrl || !videoUrl.includes('youtube.com') && !videoUrl.includes('youtu.be')) {
      return res.status(400).json({ message: 'Invalid YouTube URL' });
    }

    // Check user limits
    const limitCheck = await checkUserLimits(userId);
    if (!limitCheck.canProcess) {
      return res.status(403).json({ 
        message: limitCheck.reason,
        isFreeLimit: limitCheck.isFreeLimit || false
      });
    }

    // Create video document
    const video = new Video({
      userId,
      originalUrl: videoUrl,
      status: 'processing'
    });

    await video.save();

    // Process video in background
    processYouTubeVideo(videoUrl, userId)
      .then(async (result) => {
        if (result.success) {
          video.status = 'completed';
          video.clips = result.clips;
          video.completedAt = new Date();
          await video.save();

          // Update user video count
          const user = await User.findById(userId);
          user.videosProcessed += 1;
          await user.save();

          // Log usage
          await UsageLog.create({
            userId,
            videoId: video._id,
            action: 'video_processed',
            details: { clips: result.clips.length }
          });

          // Cleanup old files (older than 1 hour)
          cleanupOldFiles(1);
        }
      })
      .catch(async (error) => {
        video.status = 'failed';
        video.errorMessage = error.message;
        await video.save();

        await UsageLog.create({
          userId,
          videoId: video._id,
          action: 'video_processed',
          details: { error: error.message }
        });
      });

    res.json({
      message: 'Video processing started. We will notify you when ready.',
      videoId: video._id,
      status: 'processing'
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get video status
export const getVideoStatus = async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user._id;

    const video = await Video.findOne({ _id: videoId, userId });
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    res.json(video);

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Download clip
export const downloadClip = async (req, res) => {
  try {
    const { videoId, clipIndex } = req.params;
    const userId = req.user._id;

    const video = await Video.findOne({ _id: videoId, userId });
    if (!video || video.status !== 'completed') {
      return res.status(404).json({ message: 'Video not found or not ready' });
    }

    const clip = video.clips[clipIndex];
    if (!clip) {
      return res.status(404).json({ message: 'Clip not found' });
    }

    const filePath = clip.path;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Clip file not found' });
    }

    // Log download
    await UsageLog.create({
      userId,
      videoId: video._id,
      action: 'clip_downloaded',
      details: { clipIndex, filename: clip.filename }
    });

    // Send file and then delete
    res.download(filePath, clip.filename, async (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      
      // Delete file after download
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`✅ Deleted file: ${clip.filename}`);
        }
      } catch (deleteError) {
        console.error('❌ Error deleting file:', deleteError);
      }

      // Update video document to remove clip reference
      video.clips.splice(clipIndex, 1);
      if (video.clips.length === 0) {
        video.status = 'deleted';
      }
      await video.save();
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user stats
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    const now = new Date();
    const lastReset = new Date(user.lastVideoReset);
    const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);

    const stats = {
      isPremium: user.isPremium,
      videosProcessed: user.videosProcessed,
      lastVideoReset: user.lastVideoReset,
      remainingDays: user.premiumExpiry ? 
        Math.max(0, Math.ceil((new Date(user.premiumExpiry) - now) / (1000 * 60 * 60 * 24))) : 0,
      canProcess: user.role === 'admin' || (user.isPremium && user.videosProcessed < 600) || 
        (!user.isPremium && hoursSinceReset < 24 && user.videosProcessed < 5) ||
        (!user.isPremium && hoursSinceReset >= 24),
      isFreeLimitReached: !user.isPremium && hoursSinceReset < 24 && user.videosProcessed >= 5
    };

    res.json(stats);

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};