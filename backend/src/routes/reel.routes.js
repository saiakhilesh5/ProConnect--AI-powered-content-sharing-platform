import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { uploadVideo } from "../config/multer.js";
import {
  uploadReel,
  analyzeReelWithAI,
  getReel,
  getReelsFeed,
  getFollowingReels,
  getUserReels,
  toggleLikeReel,
  toggleSaveReel,
  addReelComment,
  getReelComments,
  deleteReel,
  getTrendingReels,
  searchReels,
  getSavedReels,
  toggleLikeComment,
  getCommentReplies,
  deleteComment,
  searchUsersForMention,
  checkCommentToxicity,
} from "../controllers/reel.controllers.js";

const router = express.Router();

// Public routes
router.get("/trending", getTrendingReels);
router.get("/search", searchReels);
router.get("/:reelId/comments", getReelComments);
router.get("/comments/:commentId/replies", getCommentReplies);

// Routes that need optional auth (for view tracking)
router.get("/:reelId", getReel);
router.get("/user/:userId", getUserReels);

// Protected routes
router.use(authenticateUser);

router.post("/", uploadVideo.single("video"), uploadReel);
router.post("/analyze", analyzeReelWithAI);
router.get("/feed/for-you", getReelsFeed);
router.get("/feed/following", getFollowingReels);
router.get("/saved/my-reels", getSavedReels);
router.get("/mentions/search", searchUsersForMention);
router.post("/comments/check-toxicity", checkCommentToxicity);

router.post("/:reelId/like", toggleLikeReel);
router.post("/:reelId/save", toggleSaveReel);
router.post("/:reelId/comments", addReelComment);
router.post("/comments/:commentId/like", toggleLikeComment);
router.delete("/:reelId", deleteReel);
router.delete("/comments/:commentId", deleteComment);

export default router;
