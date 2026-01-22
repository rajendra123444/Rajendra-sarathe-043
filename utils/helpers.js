import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const cleanupOldFiles = async (hours = 1) => {
  const tempDir = path.join(__dirname, '../temp');
  const now = new Date();
  
  try {
    const files = await fs.promises.readdir(tempDir);
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.promises.stat(filePath);
      const fileAge = (now - stats.mtime) / (1000 * 60 * 60); // hours
      
      if (fileAge > hours) {
        await fs.promises.unlink(filePath);
        console.log(`✅ Cleaned up old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ Error cleaning up files:', error);
  }
};

export const generatePassword = () => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
};

export const calculateRemainingDays = (expiryDate) => {
  if (!expiryDate) return 0;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};
