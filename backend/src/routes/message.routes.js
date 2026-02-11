import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  deleteMessage,
  toggleMuteConversation,
  archiveConversation,
  getUnreadCount,
  markAsRead,
} from "../controllers/message.controllers.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// Conversation routes
router.get("/conversations", getConversations);
router.post("/conversations/:userId", getOrCreateConversation);
router.get("/conversations/:conversationId/messages", getMessages);
router.post("/conversations/:conversationId/messages", sendMessage);
router.patch("/conversations/:conversationId/mute", toggleMuteConversation);
router.patch("/conversations/:conversationId/archive", archiveConversation);
router.patch("/conversations/:conversationId/read", markAsRead);

// Message routes
router.delete("/:messageId", deleteMessage);

// Utility routes
router.get("/unread-count", getUnreadCount);

export default router;
