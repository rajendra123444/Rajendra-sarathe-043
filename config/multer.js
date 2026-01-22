import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/x-msvideo'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed (MP4, AVI, MOV)'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB limit for free users
  },
  fileFilter: fileFilter
});

export default upload;