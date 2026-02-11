import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * @desc Get all conversations for logged in user
 * @route GET /api/messages/conversations
 * @access Private
 */
export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const conversations = await Conversation.find({
    participants: userId,
    archivedBy: { $ne: userId },
  })
    .populate('participants', 'fullName username profilePicture isVerified')
    .populate({
      path: 'lastMessage',
      select: 'content messageType createdAt sender read',
    })
    .sort({ lastMessageAt: -1 });

  // Format conversations to show the other participant
  const formattedConversations = conversations.map(conv => {
    const otherParticipant = conv.participants.find(
      p => p._id.toString() !== userId.toString()
    );
    
    return {
      _id: conv._id,
      participant: otherParticipant,
      lastMessage: conv.lastMessage,
      lastMessageAt: conv.lastMessageAt,
      unreadCount: conv.unreadCount.get(userId.toString()) || 0,
      isMuted: conv.mutedBy.includes(userId),
      isGroup: conv.isGroup,
      groupName: conv.groupName,
      groupImage: conv.groupImage,
    };
  });

  res.status(200).json(
    new ApiResponse(200, "Conversations fetched successfully", formattedConversations)
  );
});

/**
 * @desc Get or create conversation with a user
 * @route POST /api/messages/conversations/:userId
 * @access Private
 */
export const getOrCreateConversation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  if (userId === currentUserId.toString()) {
    throw new ApiError(400, "Cannot create conversation with yourself");
  }

  // Check if user exists
  const otherUser = await User.findById(userId).select('fullName username profilePicture isVerified');
  if (!otherUser) {
    throw new ApiError(404, "User not found");
  }

  const conversation = await Conversation.findOrCreateConversation(currentUserId, userId);
  
  await conversation.populate('participants', 'fullName username profilePicture isVerified');

  res.status(200).json(
    new ApiResponse(200, "Conversation fetched/created successfully", {
      _id: conversation._id,
      participant: otherUser,
      unreadCount: conversation.unreadCount.get(currentUserId.toString()) || 0,
    })
  );
});

/**
 * @desc Get messages in a conversation
 * @route GET /api/messages/conversations/:conversationId/messages
 * @access Private
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  // Verify user is part of conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const messages = await Message.find({
    conversation: conversationId,
    deletedFor: { $ne: userId },
  })
    .populate('sender', 'fullName username profilePicture')
    .populate('sharedImage', 'title imageUrl')
    .populate('sharedReel', 'caption thumbnailUrl')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Message.countDocuments({
    conversation: conversationId,
    deletedFor: { $ne: userId },
  });

  // Mark messages as read
  await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      read: false,
    },
    {
      read: true,
      readAt: new Date(),
    }
  );

  // Reset unread count
  await conversation.resetUnread(userId);

  res.status(200).json(
    new ApiResponse(200, "Messages fetched successfully", {
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  );
});

/**
 * @desc Send a message
 * @route POST /api/messages/conversations/:conversationId/messages
 * @access Private
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { content, messageType = 'text', sharedImageId, sharedReelId, imageUrl } = req.body;
  const senderId = req.user._id;

  // Verify user is part of conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: senderId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  // Validate message content
  if (messageType === 'text' && !content) {
    throw new ApiError(400, "Message content is required");
  }

  const messageData = {
    conversation: conversationId,
    sender: senderId,
    content,
    messageType,
  };

  if (sharedImageId) messageData.sharedImage = sharedImageId;
  if (sharedReelId) messageData.sharedReel = sharedReelId;
  if (imageUrl) messageData.imageUrl = imageUrl;

  const message = await Message.create(messageData);

  // Update conversation
  conversation.lastMessage = message._id;
  conversation.lastMessageAt = new Date();

  // Increment unread count for other participants
  for (const participantId of conversation.participants) {
    if (participantId.toString() !== senderId.toString()) {
      await conversation.incrementUnread(participantId);
    }
  }

  await message.populate('sender', 'fullName username profilePicture');
  if (message.sharedImage) {
    await message.populate('sharedImage', 'title imageUrl');
  }
  if (message.sharedReel) {
    await message.populate('sharedReel', 'caption thumbnailUrl');
  }

  // Create notification for recipient
  const recipientId = conversation.participants.find(
    p => p.toString() !== senderId.toString()
  );

  if (!conversation.mutedBy.includes(recipientId)) {
    await Notification.createNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'message',
      content: `sent you a message`,
    });
  }

  res.status(201).json(
    new ApiResponse(201, "Message sent successfully", message)
  );
});

/**
 * @desc Delete a message (for current user only)
 * @route DELETE /api/messages/:messageId
 * @access Private
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  // Add user to deletedFor array
  if (!message.deletedFor.includes(userId)) {
    message.deletedFor.push(userId);
    await message.save();
  }

  res.status(200).json(
    new ApiResponse(200, "Message deleted successfully")
  );
});

/**
 * @desc Mute/Unmute a conversation
 * @route PATCH /api/messages/conversations/:conversationId/mute
 * @access Private
 */
export const toggleMuteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const isMuted = conversation.mutedBy.includes(userId);

  if (isMuted) {
    conversation.mutedBy = conversation.mutedBy.filter(
      id => id.toString() !== userId.toString()
    );
  } else {
    conversation.mutedBy.push(userId);
  }

  await conversation.save();

  res.status(200).json(
    new ApiResponse(200, `Conversation ${isMuted ? 'unmuted' : 'muted'} successfully`, {
      isMuted: !isMuted,
    })
  );
});

/**
 * @desc Archive a conversation
 * @route PATCH /api/messages/conversations/:conversationId/archive
 * @access Private
 */
export const archiveConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const isArchived = conversation.archivedBy.includes(userId);

  if (isArchived) {
    conversation.archivedBy = conversation.archivedBy.filter(
      id => id.toString() !== userId.toString()
    );
  } else {
    conversation.archivedBy.push(userId);
  }

  await conversation.save();

  res.status(200).json(
    new ApiResponse(200, `Conversation ${isArchived ? 'unarchived' : 'archived'} successfully`, {
      isArchived: !isArchived,
    })
  );
});

/**
 * @desc Get unread messages count
 * @route GET /api/messages/unread-count
 * @access Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const conversations = await Conversation.find({
    participants: userId,
    archivedBy: { $ne: userId },
  });

  let totalUnread = 0;
  for (const conv of conversations) {
    totalUnread += conv.unreadCount.get(userId.toString()) || 0;
  }

  res.status(200).json(
    new ApiResponse(200, "Unread count fetched successfully", {
      unreadCount: totalUnread,
    })
  );
});

/**
 * @desc Mark all messages in conversation as read
 * @route PATCH /api/messages/conversations/:conversationId/read
 * @access Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  // Mark all unread messages as read
  await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      read: false,
    },
    {
      read: true,
      readAt: new Date(),
    }
  );

  // Reset unread count
  await conversation.resetUnread(userId);

  res.status(200).json(
    new ApiResponse(200, "Messages marked as read")
  );
});
