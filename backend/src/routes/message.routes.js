import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { upload, uploadMessageAttachment } from "../config/multer.js";
import {
  getConversations,
  getArchivedConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  uploadVoiceMessage,
  uploadMessageImage,
  addReaction,
  removeReaction,
  editMessage,
  deleteMessage,
  unsendMessage,
  forwardMessage,
  updateTypingStatus,
  getTypingStatus,
  pinMessage,
  getPinnedMessages,
  toggleStarMessage,
  getStarredMessages,
  searchMessages,
  toggleVanishMode,
  updateChatTheme,
  setQuickEmoji,
  setNickname,
  toggleMuteConversation,
  archiveConversation,
  toggleBlockConversation,
  deleteConversation,
  getUnreadCount,
  markAsRead,
  getMessageInfo,
  // Group functions
  createGroup,
  updateGroup,
  addGroupMembers,
  removeGroupMember,
  leaveGroup,
  makeGroupAdmin,
  removeGroupAdmin,
  // Online status functions
  updateOnlineStatus,
  getUserStatus,
  updatePrivacySettings,
  // Poll functions
  createPoll,
  votePoll,
  removeVote,
  closePoll,
  getPoll,
  // Call functions
  initiateCall,
  answerCall,
  declineCall,
  endCall,
  leaveCall,
  getCall,
  updateCallSignaling,
  getCallHistory,
  // Location
  sendLocation,
} from "../controllers/message.controllers.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// ==================== CONVERSATION ROUTES ====================

// Get all conversations
router.get("/conversations", getConversations);

// Get archived conversations
router.get("/conversations/archived", getArchivedConversations);

// Get or create conversation with a user
router.post("/conversations/:userId", getOrCreateConversation);

// Delete conversation (for current user)
router.delete("/conversations/:conversationId", deleteConversation);

// Get messages in a conversation
router.get("/conversations/:conversationId/messages", getMessages);

// Send a message
router.post("/conversations/:conversationId/messages", sendMessage);

// Search messages in conversation
router.get("/conversations/:conversationId/search", searchMessages);

// Mute/unmute conversation
router.patch("/conversations/:conversationId/mute", toggleMuteConversation);

// Archive/unarchive conversation
router.patch("/conversations/:conversationId/archive", archiveConversation);

// Block/unblock conversation
router.patch("/conversations/:conversationId/block", toggleBlockConversation);

// Mark messages as read
router.patch("/conversations/:conversationId/read", markAsRead);

// Typing status
router.post("/conversations/:conversationId/typing", updateTypingStatus);
router.get("/conversations/:conversationId/typing", getTypingStatus);

// Vanish mode (disappearing messages)
router.patch("/conversations/:conversationId/vanish", toggleVanishMode);

// Chat customization
router.patch("/conversations/:conversationId/theme", updateChatTheme);
router.patch("/conversations/:conversationId/quick-emoji", setQuickEmoji);
router.patch("/conversations/:conversationId/nickname", setNickname);

// Pinned messages
router.get("/conversations/:conversationId/pinned", getPinnedMessages);

// ==================== MESSAGE ROUTES ====================

// Edit a message
router.patch("/:messageId", editMessage);

// Delete a message (for current user)
router.delete("/:messageId", deleteMessage);

// Unsend message (delete for everyone)
router.delete("/:messageId/unsend", unsendMessage);

// Forward a message
router.post("/:messageId/forward", forwardMessage);

// Reactions
router.post("/:messageId/reactions", addReaction);
router.delete("/:messageId/reactions", removeReaction);

// Pin/unpin message
router.post("/:messageId/pin", pinMessage);

// Star/unstar message
router.post("/:messageId/star", toggleStarMessage);

// Get message info (read receipts, reactions, etc.)
router.get("/:messageId/info", getMessageInfo);

// ==================== UPLOAD ROUTES ====================

// Upload voice message (uses memory storage for buffer-based Cloudinary upload)
router.post("/upload-voice", uploadMessageAttachment.single("voice"), uploadVoiceMessage);

// Upload message image (uses memory storage for buffer-based Cloudinary upload)
router.post("/upload-image", uploadMessageAttachment.single("image"), uploadMessageImage);

// ==================== UTILITY ROUTES ====================

// Get unread count
router.get("/unread-count", getUnreadCount);

// Get starred messages
router.get("/starred", getStarredMessages);

// ==================== GROUP ROUTES ====================

// Create a group
router.post("/groups", createGroup);

// Update group info
router.patch("/groups/:groupId", updateGroup);

// Add members to group
router.post("/groups/:groupId/members", addGroupMembers);

// Remove member from group
router.delete("/groups/:groupId/members/:memberId", removeGroupMember);

// Leave group
router.post("/groups/:groupId/leave", leaveGroup);

// Make user admin
router.post("/groups/:groupId/admins/:memberId", makeGroupAdmin);

// Remove admin role
router.delete("/groups/:groupId/admins/:memberId", removeGroupAdmin);

// ==================== ONLINE STATUS ROUTES ====================

// Update online status
router.post("/status/online", updateOnlineStatus);

// Get user status (online, last seen)
router.get("/users/:userId/status", getUserStatus);

// Update privacy settings
router.patch("/settings/privacy", updatePrivacySettings);

// ==================== POLL ROUTES ====================

// Create poll in conversation
router.post("/conversations/:conversationId/polls", createPoll);

// Vote on poll
router.post("/polls/:pollId/vote", votePoll);

// Remove vote from poll
router.delete("/polls/:pollId/vote", removeVote);

// Close poll
router.post("/polls/:pollId/close", closePoll);

// Get poll details
router.get("/polls/:pollId", getPoll);

// ==================== CALL ROUTES ====================

// Get call history
router.get("/calls/history", getCallHistory);

// Initiate call
router.post("/conversations/:conversationId/call", initiateCall);

// Answer call
router.post("/calls/:callId/answer", answerCall);

// Decline call
router.post("/calls/:callId/decline", declineCall);

// End call
router.post("/calls/:callId/end", endCall);

// Leave call
router.post("/calls/:callId/leave", leaveCall);

// Get call details
router.get("/calls/:callId", getCall);

// Update WebRTC signaling
router.post("/calls/:callId/signal", updateCallSignaling);

// ==================== LOCATION ROUTES ====================

// Send location
router.post("/conversations/:conversationId/location", sendLocation);

export default router;
