import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  getLoggedInUser,
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
  getAllUsers,
  searchUsers,
  checkUserAvailability,
  googleLoginUser,
  getLoginHistory,
  getUserAnalytics
} from "../controllers/user.controllers.js";

const router = express.Router();

// Authentication routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google-login", googleLoginUser);
router.post("/logout", logoutUser);
router.post("/check-availability", checkUserAvailability);

// User profile routes (Protected)
router.get("/me", authenticateUser, getLoggedInUser);
router.get("/login-history", authenticateUser, getLoginHistory);
router.get("/analytics", authenticateUser, getUserAnalytics);
router.patch("/:userId", authenticateUser, updateUserProfile);
router.patch("/:userId/password", authenticateUser, updateUserPassword);

// Public routes
router.get("/", getAllUsers);
router.get("/search", searchUsers);
router.get("/:identifier", getUserProfile);

export default router;
