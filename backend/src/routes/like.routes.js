import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { toggleLike, getLikes, checkLike } from "../controllers/like.controllers.js";

const router = express.Router();

// Protected routes - require authentication
router.use(authenticateUser);

// Toggle like status
router.post("/:imageId/toggle", toggleLike);

// Get user's liked images
router.get("/", getLikes);

// Check if image is liked
router.get("/:imageId/check", checkLike);

export default router;
