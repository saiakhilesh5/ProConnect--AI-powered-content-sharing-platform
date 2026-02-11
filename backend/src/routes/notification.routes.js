import { Router } from "express";
import {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationsCount,
  deleteOldNotifications
} from "../controllers/notification.controllers.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = Router();

// All notification routes require authentication
router.use(authenticateUser);

// Get notifications
router.get("/", getUserNotifications);
router.get("/unread/count", getUnreadNotificationsCount);

// Create notification
router.post("/", createNotification);

// Update notifications
router.patch("/:notificationId/read", markNotificationAsRead);
router.patch("/read-all", markAllNotificationsAsRead);

// Delete notifications
router.delete("/:notificationId", deleteNotification);
router.delete("/cleanup", deleteOldNotifications);

export default router;
