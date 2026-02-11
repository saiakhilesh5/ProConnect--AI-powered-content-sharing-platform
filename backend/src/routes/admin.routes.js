import { Router } from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import {
  isAdmin,
  adminLogin,
  adminLogout,
  verifyAdminSession,
  generateReport,
  getDashboardStats,
  getAllUsers,
  toggleUserBan,
  toggleUserAdmin,
  deleteImage,
  getPlatformOverview
} from "../controllers/admin.controllers.js";

const router = Router();

// Public admin routes (no auth required)
router.post("/login", adminLogin);
router.get("/verify", verifyAdminSession);
router.post("/logout", adminLogout);

// Protected admin routes (require admin authentication)
router.use(isAdmin);

// Dashboard & Reports
router.get("/overview", getPlatformOverview);
router.get("/quick-stats", getDashboardStats);
router.post("/generate-report", generateReport);

// User Management
router.get("/users", getAllUsers);
router.patch("/users/:userId/ban", toggleUserBan);
router.patch("/users/:userId/admin", toggleUserAdmin);

// Content Management
router.delete("/images/:imageId", deleteImage);

export default router;
