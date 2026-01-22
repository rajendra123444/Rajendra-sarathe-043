import User from '../models/User.js';
import Video from '../models/Video.js';
import UsageLog from '../models/UsageLog.js';
import { generatePassword } from '../utils/helpers.js';

// Get dashboard overview
export const getOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ 
      lastVideoReset: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
    });
    const totalVideos = await Video.countDocuments({ status: 'completed' });
    const premiumUsers = await User.countDocuments({ isPremium: true });
    const todayUsage = await UsageLog.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) },
      action: 'video_processed'
    });

    res.json({
      totalUsers,
      activeUsers,
      totalVideos,
      premiumUsers,
      todayUsage
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle premium status
export const togglePremium = async (req, res) => {
  try {
    const { userId, isPremium } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isPremium = isPremium;
    
    if (isPremium) {
      // Set premium expiry to 30 days from now
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      user.premiumExpiry = expiryDate;
      
      // Reset video count for new premium period
      user.videosProcessed = 0;
      user.lastVideoReset = new Date();
    } else {
      user.premiumExpiry = null;
    }

    await user.save();

    // Log the action
    await UsageLog.create({
      userId: user._id,
      action: 'premium_upgraded',
      details: { isPremium, expiry: user.premiumExpiry }
    });

    res.json({
      message: `Premium status updated to ${isPremium ? 'enabled' : 'disabled'}`,
      user: {
        id: user._id,
        email: user.email,
        isPremium: user.isPremium,
        premiumExpiry: user.premiumExpiry
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get login emails
export const getLoginEmails = async (req, res) => {
  try {
    const users = await User.find().select('email createdAt').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user usage logs
export const getUserUsage = async (req, res) => {
  try {
    const { userId } = req.params;
    const logs = await UsageLog.find({ userId }).sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new admin
export const createAdmin = async (req, res) => {
  try {
    const { email } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const password = generatePassword();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      email,
      password: hashedPassword,
      role: 'admin',
      isPremium: true
    });

    await user.save();

    res.json({
      message: 'Admin created successfully',
      credentials: {
        email,
        password // In production, send this via secure email
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
