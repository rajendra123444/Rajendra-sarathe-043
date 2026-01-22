import mongoose from 'mongoose';

const usageLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  action: {
    type: String,
    enum: ['video_processed', 'clip_downloaded', 'premium_upgraded'],
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

usageLogSchema.index({ userId: 1, createdAt: -1 });
usageLogSchema.index({ createdAt: 1 });

export default mongoose.model('UsageLog', usageLogSchema);
