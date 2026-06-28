import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RAW_DATA_DIR = path.join(__dirname, '../../data/raw');

// Ensure directory exists
if (!fs.existsSync(RAW_DATA_DIR)) {
  fs.mkdirSync(RAW_DATA_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, RAW_DATA_DIR);
  },
  filename: (req, file, cb) => {
    // Preserve original filename
    cb(null, file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const supportedExtensions = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (supportedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Supported formats are: PDF, DOCX, TXT, MD, CSV, JSON.`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});
