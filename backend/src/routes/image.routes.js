import { Router } from "express";
import {
  getImage,
  getAllImages,
  getUserImages,
  getUserPublicImages,
  updateImage,
  deleteImage,
  searchImages,
  getTrendingImages,
  getImagesByTag,
  getImageReviews,
  getImageReviewStats,
  upsertImageReview,
  deleteImageReview,
  reportImage,
  uploadImageFile,
  uploadTempImage,
  deleteCloudinaryImage,
  saveImageDetails,
  getPopularTags,
  searchTags,
  getTrendingSearches,
  getImageLikers,
  analyzeImageWithAI,
  aiChat,
  getCaptionSuggestions
} from "../controllers/image.controllers.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import upload from "../config/multer.js";

const router = Router();

// All routes now require authentication
router.get("/public", authenticateUser, getAllImages);
router.get("/search", authenticateUser, searchImages);
router.get("/discover/trending", authenticateUser, getTrendingImages);
router.get("/tags/popular", authenticateUser, getPopularTags);
router.get("/tags/search", authenticateUser, searchTags);
router.get("/tags/:tag", authenticateUser, getImagesByTag);
router.get("/user/:userId", authenticateUser, getUserPublicImages);
router.get("/me", authenticateUser, getUserImages);
router.get("/trending-search", authenticateUser, getTrendingSearches);
router.get("/:imageId/likes", authenticateUser, getImageLikers);
router.get("/:imageId", authenticateUser, getImage);

// Reviews
router.get("/:imageId/reviews", authenticateUser, getImageReviews);
router.get("/:imageId/reviews/stats", authenticateUser, getImageReviewStats);
router.post("/:imageId/reviews", authenticateUser, upsertImageReview);
router.delete("/:imageId/reviews", authenticateUser, deleteImageReview);

// Report image
router.post("/:imageId/report", authenticateUser, reportImage);

router.post("/upload", authenticateUser, upload.single("image"), uploadImageFile);
router.post("/upload-temp", authenticateUser, upload.single("image"), uploadTempImage);
router.post("/analyze", authenticateUser, analyzeImageWithAI);
router.post("/ai-chat", authenticateUser, aiChat);
router.post("/suggest-captions", authenticateUser, getCaptionSuggestions);
router.post("/save-details", authenticateUser, saveImageDetails);
router.delete("/cloudinary/:publicId", authenticateUser, deleteCloudinaryImage);
router.patch("/:imageId", authenticateUser, updateImage);
router.delete("/:imageId", authenticateUser, deleteImage);

export default router;
