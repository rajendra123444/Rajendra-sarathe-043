import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  videosProcessed: {
    type: Number,
    default: 0
  },
  lastVideoReset: {
    type: Date,
    default: Date.now
  },
  premiumExpiry: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to check premium expiry
userSchema.pre('save', function(next) {
  if (this.isPremium && this.premiumExpiry && new Date() > this.premiumExpiry) {
    this.isPremium = false;
    this.premiumExpiry = null;
  }
  next();
});

export default mongoose.model('User', userSchema);