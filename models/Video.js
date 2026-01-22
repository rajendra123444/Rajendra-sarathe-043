import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  clips: [{
    filename: String,
    path: String,
    duration: Number,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  errorMessage: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

// Index for efficient queries
videoSchema.index({ userId: 1, createdAt: -1 });
videoSchema.index({ status: 1, createdAt: 1 });

export default mongoose.model('Video', videoSchema);