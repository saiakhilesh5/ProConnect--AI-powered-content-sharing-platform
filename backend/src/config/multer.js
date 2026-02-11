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

export default upload;