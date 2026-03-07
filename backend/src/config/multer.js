import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from './cloudinary.js';

// Storage for images
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'image-sharing-app',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    resource_type: 'image',
  },
});

// Storage for videos (reels)
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'reels',
    allowed_formats: ['mp4', 'webm', 'mov', 'avi'],
    resource_type: 'video',
  },
});

// Auto-detect storage based on file type
const autoStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith('video/');
    return {
      folder: isVideo ? 'reels' : 'image-sharing-app',
      allowed_formats: isVideo 
        ? ['mp4', 'webm', 'mov', 'avi'] 
        : ['jpg', 'png', 'jpeg', 'webp'],
      resource_type: isVideo ? 'video' : 'image',
    };
  },
});

// Memory storage for message uploads (images, voice, files)
// These need buffer access for manual Cloudinary upload with custom folders
const memoryStorage = multer.memoryStorage();

const upload = multer({ 
  storage: autoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
});

export const uploadImage = multer({ storage: imageStorage });
export const uploadVideo = multer({ 
  storage: videoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
});

// Memory-based upload for message attachments (uses buffer for manual Cloudinary upload)
export const uploadMessageAttachment = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max for message attachments
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and audio for messages
    const allowedTypes = /image\/(jpeg|jpg|png|gif|webp)|video\/(mp4|webm|mov)|audio\/(webm|mp3|wav|ogg)/;
    if (allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type for message attachment'), false);
    }
  },
});

export { upload };
export default upload;