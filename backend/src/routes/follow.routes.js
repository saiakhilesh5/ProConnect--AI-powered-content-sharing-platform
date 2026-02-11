import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  checkFollowStatus
} from "../controllers/follow.controllers.js";

const router = express.Router();

// Routes for follow/unfollow
router.post("/:userId", authenticateUser, followUser);
router.delete("/:userId", authenticateUser, unfollowUser);

// Routes for getting followers and following lists
router.get("/followers/:userId", getFollowers);
router.get("/following/:userId", getFollowing);

// Route to check if the authenticated user is following someone
router.get("/status/:userId", authenticateUser, checkFollowStatus);

export default router;
