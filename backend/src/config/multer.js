// Multer instances — moved verbatim from server.js. Three distinct configs:
//   diskUpload     — legacy disk writes to public/uploads/ (10MB)
//   memoryUpload   — in-memory for MinIO (PNG/JPG only, 10MB)
//   documentUpload — in-memory for KYC docs (PDF + images, 10MB)
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'public/uploads/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
});

export const diskUpload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export const memoryUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (['image/png', 'image/jpeg'].includes(file.mimetype)) return cb(null, true);
        cb(new Error('Only PNG or JPG allowed'));
    },
});

export const documentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'].includes(file.mimetype)) {
            return cb(null, true);
        }
        cb(new Error('Only PDF or image files are allowed'));
    },
});
