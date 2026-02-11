import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { toggleFavorite, getFavorites, checkFavorite } from "../controllers/favorite.controllers.js";

const router = express.Router();

// Protected routes - require authentication
router.use(authenticateUser);

// Toggle favorite status
router.post("/:imageId/toggle", toggleFavorite);

// Get user's favorites
router.get("/", getFavorites);

// Check if image is favorited
router.get("/:imageId/check", checkFavorite);

export default router;
