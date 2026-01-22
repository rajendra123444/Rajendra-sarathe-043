import rateLimit from 'express-rate-limit';

export const videoProcessLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // 5 requests per 24 hours for free users
  message: {
    message: 'Free limit reached. Get Premium to continue instantly.',
    premiumCta: true
  },
  keyGenerator: (req) => req.user?.id || req.ip
});

export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});