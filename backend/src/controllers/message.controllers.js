import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { Poll } from "../models/poll.model.js";
import { Call } from "../models/call.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";
import { sendMessageEmail } from "../utils/emailService.js";

// Valid reaction emojis
const VALID_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🔥', '💯', '🎉'];

/**
 * @desc Get all conversations for logged in user
 * @route GET /api/messages/conversations
 * @access Private
 */
export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { includeArchived = false } = req.query;

  const query = {
    participants: userId,
    blockedBy: { $ne: userId },
  };

  if (!includeArchived) {
    query.archivedBy = { $ne: userId };
  }

  const conversations = await Conversation.find(query)
    .populate('participants', 'fullName username profilePicture isVerified lastActive isOnline')
    .populate({
      path: 'lastMessage',
      select: 'content messageType createdAt sender read deletedForEveryone voiceDuration',
    })
    .populate('typingStatus.user', 'fullName username')
    .sort({ lastMessageAt: -1 });

  // Format conversations to show the other participant
  const formattedConversations = conversations.map(conv => {
    const otherParticipant = conv.participants.find(
      p => p._id.toString() !== userId.toString()
    );
    
    // Check if someone is typing
    const typingUsers = conv.typingStatus?.filter(
      ts => ts.user._id.toString() !== userId.toString() && 
            ts.isTyping && 
            Date.now() - new Date(ts.lastTypingAt).getTime() < 5000
    );

    // Get user's theme if set
    const userTheme = conv.themes?.find(t => t.userId?.toString() === userId.toString());
    
    return {
      _id: conv._id,
      participant: otherParticipant,
      lastMessage: conv.lastMessage?.deletedForEveryone 
        ? { ...conv.lastMessage.toObject(), content: 'Message deleted' }
        : conv.lastMessage,
      lastMessageAt: conv.lastMessageAt,
      unreadCount: conv.unreadCount.get(userId.toString()) || 0,
      isMuted: conv.isUserMuted ? conv.isUserMuted(userId) : false,
      isArchived: conv.archivedBy?.includes(userId),
      isGroup: conv.isGroup,
      groupName: conv.groupName,
      groupImage: conv.groupImage,
      groupDescription: conv.groupDescription,
      vanishMode: conv.vanishMode,
      quickEmoji: conv.quickEmoji,
      isTyping: typingUsers?.length > 0,
      typingUsers: typingUsers?.map(t => t.user),
      theme: userTheme,
      nickname: conv.nicknames?.get(otherParticipant?._id?.toString()),
      pinnedMessagesCount: conv.pinnedMessages?.length || 0,
    };
  });

  res.status(200).json(
    new ApiResponse(200, "Conversations fetched successfully", formattedConversations)
  );
});

/**
 * @desc Get archived conversations
 * @route GET /api/messages/conversations/archived
 * @access Private
 */
export const getArchivedConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const conversations = await Conversation.find({
    participants: userId,
    archivedBy: userId,
  })
    .populate('participants', 'fullName username profilePicture isVerified')
    .populate({
      path: 'lastMessage',
      select: 'content messageType createdAt sender read',
    })
    .sort({ lastMessageAt: -1 });

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
    };
  });

  res.status(200).json(
    new ApiResponse(200, "Archived conversations fetched successfully", formattedConversations)
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
  const otherUser = await User.findById(userId).select('fullName username profilePicture isVerified lastActive isOnline');
  if (!otherUser) {
    throw new ApiError(404, "User not found");
  }

  const conversation = await Conversation.findOrCreateConversation(currentUserId, userId);
  
  await conversation.populate('participants', 'fullName username profilePicture isVerified lastActive isOnline');

  res.status(200).json(
    new ApiResponse(200, "Conversation fetched/created successfully", {
      _id: conversation._id,
      participant: otherUser,
      unreadCount: conversation.unreadCount.get(currentUserId.toString()) || 0,
      vanishMode: conversation.vanishMode,
      quickEmoji: conversation.quickEmoji,
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
    .populate('replyTo', 'content messageType sender')
    .populate('reactions.user', 'fullName username profilePicture')
    .populate('pinnedBy', 'fullName username')
    .populate('poll')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Message.countDocuments({
    conversation: conversationId,
    deletedFor: { $ne: userId },
  });

  // Mark messages as read and delivered
  await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      read: false,
    },
    {
      read: true,
      readAt: new Date(),
      delivered: true,
      deliveredAt: new Date(),
    }
  );

  // Reset unread count
  await conversation.resetUnread(userId);

  // Format messages to handle deleted for everyone
  const formattedMessages = messages.map(msg => {
    if (msg.deletedForEveryone) {
      return {
        ...msg.toObject(),
        content: null,
        imageUrl: null,
        voiceUrl: null,
        isDeleted: true,
      };
    }
    return msg;
  });

  res.status(200).json(
    new ApiResponse(200, "Messages fetched successfully", {
      messages: formattedMessages.reverse(), // Return in chronological order
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      conversationInfo: {
        vanishMode: conversation.vanishMode,
        quickEmoji: conversation.quickEmoji,
        pinnedMessages: conversation.pinnedMessages,
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
  const { 
    content, 
    messageType = 'text', 
    sharedImageId, 
    sharedReelId, 
    imageUrl,
    voiceUrl,
    voiceDuration,
    replyToId,
    forwardFromId,
  } = req.body;
  const senderId = req.user._id;

  // Verify user is part of conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: senderId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  // Check if blocked
  if (conversation.blockedBy?.length > 0) {
    throw new ApiError(403, "Cannot send message to this conversation");
  }

  // Validate message content based on type
  if (messageType === 'text' && !content) {
    throw new ApiError(400, "Message content is required");
  }

  if (messageType === 'voice' && !voiceUrl) {
    throw new ApiError(400, "Voice URL is required for voice messages");
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
  if (voiceUrl) messageData.voiceUrl = voiceUrl;
  if (voiceDuration) messageData.voiceDuration = voiceDuration;
  if (replyToId) messageData.replyTo = replyToId;
  
  // Handle forwarded message
  if (forwardFromId) {
    const originalMessage = await Message.findById(forwardFromId);
    if (originalMessage) {
      messageData.forwardedFrom = forwardFromId;
      messageData.isForwarded = true;
    }
  }

  // Handle vanish mode - set expiration
  if (conversation.vanishMode) {
    messageData.isDisappearing = true;
    messageData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }

  const message = await Message.create(messageData);

  // Update conversation
  conversation.lastMessage = message._id;
  conversation.lastMessageAt = new Date();
  
  // Clear typing status for sender
  await conversation.setTypingStatus(senderId, false);

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
  if (message.replyTo) {
    await message.populate('replyTo', 'content messageType sender');
  }

  // Create notification for recipient
  const recipientId = conversation.participants.find(
    p => p.toString() !== senderId.toString()
  );

  if (!conversation.isUserMuted(recipientId)) {
    let notificationContent = 'sent you a message';
    if (messageType === 'image') notificationContent = 'sent you a photo';
    if (messageType === 'voice') notificationContent = 'sent you a voice message';
    if (messageType === 'reel') notificationContent = 'shared a reel with you';

    await Notification.createNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'message',
      content: notificationContent,
    });

    // Send message email (non-blocking)
    const [recipient, sender] = await Promise.all([
      User.findById(recipientId).select('email fullName'),
      User.findById(senderId).select('fullName username'),
    ]);
    if (recipient?.email) {
      sendMessageEmail({
        recipientEmail: recipient.email,
        recipientName: recipient.fullName,
        senderName: sender?.fullName || 'Someone',
        senderUsername: sender?.username || 'user',
        messagePreview: messageType === 'text' ? content : undefined,
        messageType,
      }).catch(() => {});
    }
  }

  // Emit real-time socket event to all conversation participants
  const io = req.app.get('io');
  if (io) {
    conversation.participants.forEach(participantId => {
      io.to(`user:${participantId.toString()}`).emit('message:new', {
        conversationId: conversationId,
        message,
      });
    });
  }

  res.status(201).json(
    new ApiResponse(201, "Message sent successfully", message)
  );
});

/**
 * @desc Upload voice message
 * @route POST /api/messages/upload-voice
 * @access Private
 */
export const uploadVoiceMessage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Voice file is required");
  }

  const result = await uploadToCloudinary(req.file.buffer, {
    resource_type: 'video',
    folder: 'proconnect/voice-messages',
  });

  res.status(200).json(
    new ApiResponse(200, "Voice message uploaded successfully", {
      voiceUrl: result.secure_url,
      duration: result.duration,
    })
  );
});

/**
 * @desc Upload message image
 * @route POST /api/messages/upload-image
 * @access Private
 */
export const uploadMessageImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Image file is required");
  }

  const result = await uploadToCloudinary(req.file.buffer, {
    folder: 'proconnect/message-images',
    transformation: [
      { width: 1080, height: 1080, crop: 'limit' },
      { quality: 'auto' },
    ],
  });

  res.status(200).json(
    new ApiResponse(200, "Image uploaded successfully", {
      imageUrl: result.secure_url,
    })
  );
});

/**
 * @desc Add reaction to message
 * @route POST /api/messages/:messageId/reactions
 * @access Private
 */
export const addReaction = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id;

  if (!VALID_REACTIONS.includes(emoji)) {
    throw new ApiError(400, "Invalid reaction emoji");
  }

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  // Check if user already reacted with same emoji
  const existingReactionIndex = message.reactions.findIndex(
    r => r.user.toString() === userId.toString() && r.emoji === emoji
  );

  if (existingReactionIndex >= 0) {
    // Remove reaction if same emoji
    message.reactions.splice(existingReactionIndex, 1);
  } else {
    // Remove any existing reaction from this user and add new one
    message.reactions = message.reactions.filter(
      r => r.user.toString() !== userId.toString()
    );
    message.reactions.push({ user: userId, emoji });
  }

  await message.save();
  await message.populate('reactions.user', 'fullName username profilePicture');

  // Notify message sender about reaction
  if (message.sender.toString() !== userId.toString()) {
    await Notification.createNotification({
      recipient: message.sender,
      sender: userId,
      type: 'reaction',
      content: `reacted ${emoji} to your message`,
    });
  }

  res.status(200).json(
    new ApiResponse(200, "Reaction updated successfully", message.reactions)
  );
});

/**
 * @desc Remove reaction from message
 * @route DELETE /api/messages/:messageId/reactions
 * @access Private
 */
export const removeReaction = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  message.reactions = message.reactions.filter(
    r => r.user.toString() !== userId.toString()
  );

  await message.save();

  res.status(200).json(
    new ApiResponse(200, "Reaction removed successfully")
  );
});

/**
 * @desc Edit a message
 * @route PATCH /api/messages/:messageId
 * @access Private
 */
export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  if (message.sender.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only edit your own messages");
  }

  // Can only edit text messages
  if (message.messageType !== 'text') {
    throw new ApiError(400, "Can only edit text messages");
  }

  // Can only edit within 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  if (message.createdAt < fifteenMinutesAgo) {
    throw new ApiError(400, "Cannot edit message after 15 minutes");
  }

  // Store original content if first edit
  if (!message.isEdited) {
    message.originalContent = message.content;
  }

  message.content = content;
  message.isEdited = true;
  message.editedAt = new Date();

  await message.save();
  await message.populate('sender', 'fullName username profilePicture');

  res.status(200).json(
    new ApiResponse(200, "Message edited successfully", message)
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
 * @desc Unsend message for everyone
 * @route DELETE /api/messages/:messageId/unsend
 * @access Private
 */
export const unsendMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  if (message.sender.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only unsend your own messages");
  }

  // Can only unsend within 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (message.createdAt < oneHourAgo) {
    throw new ApiError(400, "Cannot unsend message after 1 hour");
  }

  message.deletedForEveryone = true;
  message.deletedForEveryoneAt = new Date();
  message.content = null;
  message.imageUrl = null;
  message.voiceUrl = null;

  await message.save();

  res.status(200).json(
    new ApiResponse(200, "Message unsent successfully")
  );
});

/**
 * @desc Forward a message to another conversation
 * @route POST /api/messages/:messageId/forward
 * @access Private
 */
export const forwardMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { conversationIds } = req.body;
  const userId = req.user._id;

  if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
    throw new ApiError(400, "At least one conversation must be selected");
  }

  const originalMessage = await Message.findById(messageId);

  if (!originalMessage) {
    throw new ApiError(404, "Message not found");
  }

  const forwardedMessages = [];

  for (const convId of conversationIds) {
    const conversation = await Conversation.findOne({
      _id: convId,
      participants: userId,
    });

    if (!conversation) continue;

    const newMessage = await Message.create({
      conversation: convId,
      sender: userId,
      content: originalMessage.content,
      messageType: originalMessage.messageType,
      imageUrl: originalMessage.imageUrl,
      voiceUrl: originalMessage.voiceUrl,
      voiceDuration: originalMessage.voiceDuration,
      sharedImage: originalMessage.sharedImage,
      sharedReel: originalMessage.sharedReel,
      forwardedFrom: messageId,
      isForwarded: true,
    });

    // Update conversation
    conversation.lastMessage = newMessage._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Increment unread for recipients
    for (const participantId of conversation.participants) {
      if (participantId.toString() !== userId.toString()) {
        await conversation.incrementUnread(participantId);
      }
    }

    forwardedMessages.push(newMessage);
  }

  res.status(200).json(
    new ApiResponse(200, "Message forwarded successfully", {
      forwardedCount: forwardedMessages.length,
    })
  );
});

/**
 * @desc Update typing status
 * @route POST /api/messages/conversations/:conversationId/typing
 * @access Private
 */
export const updateTypingStatus = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { isTyping } = req.body;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  await conversation.setTypingStatus(userId, isTyping);

  res.status(200).json(
    new ApiResponse(200, "Typing status updated")
  );
});

/**
 * @desc Get typing status for a conversation
 * @route GET /api/messages/conversations/:conversationId/typing
 * @access Private
 */
export const getTypingStatus = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  }).populate('typingStatus.user', 'fullName username');

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  // Filter out stale typing indicators (older than 5 seconds)
  const activeTyping = conversation.typingStatus?.filter(
    ts => ts.user._id.toString() !== userId.toString() &&
          ts.isTyping &&
          Date.now() - new Date(ts.lastTypingAt).getTime() < 5000
  );

  res.status(200).json(
    new ApiResponse(200, "Typing status fetched", {
      typingUsers: activeTyping?.map(t => t.user) || [],
    })
  );
});

/**
 * @desc Pin a message
 * @route POST /api/messages/:messageId/pin
 * @access Private
 */
export const pinMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  const conversation = await Conversation.findOne({
    _id: message.conversation,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(403, "Access denied");
  }

  if (message.isPinned) {
    // Unpin
    message.isPinned = false;
    message.pinnedAt = null;
    message.pinnedBy = null;
    conversation.pinnedMessages = conversation.pinnedMessages.filter(
      id => id.toString() !== messageId
    );
  } else {
    // Pin (max 3 pinned messages)
    if (conversation.pinnedMessages?.length >= 3) {
      throw new ApiError(400, "Maximum of 3 pinned messages allowed");
    }
    message.isPinned = true;
    message.pinnedAt = new Date();
    message.pinnedBy = userId;
    conversation.pinnedMessages.push(messageId);
  }

  await message.save();
  await conversation.save();

  res.status(200).json(
    new ApiResponse(200, `Message ${message.isPinned ? 'pinned' : 'unpinned'} successfully`, {
      isPinned: message.isPinned,
    })
  );
});

/**
 * @desc Get pinned messages for a conversation
 * @route GET /api/messages/conversations/:conversationId/pinned
 * @access Private
 */
export const getPinnedMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const pinnedMessages = await Message.find({
    _id: { $in: conversation.pinnedMessages || [] },
    isPinned: true,
  })
    .populate('sender', 'fullName username profilePicture')
    .populate('pinnedBy', 'fullName username')
    .sort({ pinnedAt: -1 });

  res.status(200).json(
    new ApiResponse(200, "Pinned messages fetched", pinnedMessages)
  );
});

/**
 * @desc Star/unstar a message
 * @route POST /api/messages/:messageId/star
 * @access Private
 */
export const toggleStarMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  const isStarred = message.starredBy?.includes(userId);

  if (isStarred) {
    message.starredBy = message.starredBy.filter(
      id => id.toString() !== userId.toString()
    );
  } else {
    message.starredBy.push(userId);
  }

  await message.save();

  res.status(200).json(
    new ApiResponse(200, `Message ${isStarred ? 'unstarred' : 'starred'}`, {
      isStarred: !isStarred,
    })
  );
});

/**
 * @desc Get starred messages
 * @route GET /api/messages/starred
 * @access Private
 */
export const getStarredMessages = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const messages = await Message.find({
    starredBy: userId,
    deletedFor: { $ne: userId },
    deletedForEveryone: { $ne: true },
  })
    .populate('sender', 'fullName username profilePicture')
    .populate('conversation', 'participants')
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json(
    new ApiResponse(200, "Starred messages fetched", messages)
  );
});

/**
 * @desc Search messages in a conversation
 * @route GET /api/messages/conversations/:conversationId/search
 * @access Private
 */
export const searchMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { q } = req.query;
  const userId = req.user._id;

  if (!q || q.trim().length < 2) {
    throw new ApiError(400, "Search query must be at least 2 characters");
  }

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
    deletedForEveryone: { $ne: true },
    content: { $regex: q, $options: 'i' },
    messageType: 'text',
  })
    .populate('sender', 'fullName username profilePicture')
    .sort({ createdAt: -1 })
    .limit(50);

  res.status(200).json(
    new ApiResponse(200, "Search results", {
      query: q,
      count: messages.length,
      messages,
    })
  );
});

/**
 * @desc Toggle vanish mode
 * @route PATCH /api/messages/conversations/:conversationId/vanish
 * @access Private
 */
export const toggleVanishMode = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  await conversation.toggleVanishMode(userId);

  res.status(200).json(
    new ApiResponse(200, `Vanish mode ${conversation.vanishMode ? 'enabled' : 'disabled'}`, {
      vanishMode: conversation.vanishMode,
    })
  );
});

/**
 * @desc Update chat theme
 * @route PATCH /api/messages/conversations/:conversationId/theme
 * @access Private
 */
export const updateChatTheme = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { backgroundColor, bubbleColor, textColor, emoji } = req.body;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  await conversation.setChatTheme(userId, {
    backgroundColor,
    bubbleColor,
    textColor,
    emoji,
  });

  res.status(200).json(
    new ApiResponse(200, "Chat theme updated successfully")
  );
});

/**
 * @desc Set quick emoji for conversation
 * @route PATCH /api/messages/conversations/:conversationId/quick-emoji
 * @access Private
 */
export const setQuickEmoji = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  conversation.quickEmoji = emoji;
  await conversation.save();

  res.status(200).json(
    new ApiResponse(200, "Quick emoji updated", { quickEmoji: emoji })
  );
});

/**
 * @desc Set nickname for user in conversation
 * @route PATCH /api/messages/conversations/:conversationId/nickname
 * @access Private
 */
export const setNickname = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { targetUserId, nickname } = req.body;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  if (!conversation.participants.some(p => p.toString() === targetUserId)) {
    throw new ApiError(400, "User is not part of this conversation");
  }

  if (nickname) {
    conversation.nicknames.set(targetUserId, nickname);
  } else {
    conversation.nicknames.delete(targetUserId);
  }

  await conversation.save();

  res.status(200).json(
    new ApiResponse(200, "Nickname updated")
  );
});

/**
 * @desc Mute/Unmute a conversation
 * @route PATCH /api/messages/conversations/:conversationId/mute
 * @access Private
 */
export const toggleMuteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { duration } = req.body; // null for forever, or hours
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const existingMuteIndex = conversation.mutedBy.findIndex(
    m => m.user?.toString() === userId.toString()
  );

  if (existingMuteIndex >= 0) {
    // Unmute
    conversation.mutedBy.splice(existingMuteIndex, 1);
  } else {
    // Mute
    const muteData = { user: userId };
    if (duration) {
      muteData.mutedUntil = new Date(Date.now() + duration * 60 * 60 * 1000);
    }
    conversation.mutedBy.push(muteData);
  }

  await conversation.save();

  res.status(200).json(
    new ApiResponse(200, `Conversation ${existingMuteIndex >= 0 ? 'unmuted' : 'muted'} successfully`, {
      isMuted: existingMuteIndex < 0,
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
 * @desc Block/Unblock a conversation
 * @route PATCH /api/messages/conversations/:conversationId/block
 * @access Private
 */
export const toggleBlockConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const isBlocked = conversation.blockedBy?.includes(userId);

  if (isBlocked) {
    conversation.blockedBy = conversation.blockedBy.filter(
      id => id.toString() !== userId.toString()
    );
  } else {
    conversation.blockedBy = conversation.blockedBy || [];
    conversation.blockedBy.push(userId);
  }

  await conversation.save();

  res.status(200).json(
    new ApiResponse(200, `Conversation ${isBlocked ? 'unblocked' : 'blocked'}`, {
      isBlocked: !isBlocked,
    })
  );
});

/**
 * @desc Delete entire conversation
 * @route DELETE /api/messages/conversations/:conversationId
 * @access Private
 */
export const deleteConversation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  // Mark all messages as deleted for this user
  await Message.updateMany(
    { conversation: conversationId },
    { $addToSet: { deletedFor: userId } }
  );

  // Archive the conversation
  if (!conversation.archivedBy.includes(userId)) {
    conversation.archivedBy.push(userId);
    await conversation.save();
  }

  res.status(200).json(
    new ApiResponse(200, "Conversation deleted")
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
    blockedBy: { $ne: userId },
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
      delivered: true,
      deliveredAt: new Date(),
    }
  );

  // Reset unread count
  await conversation.resetUnread(userId);

  res.status(200).json(
    new ApiResponse(200, "Messages marked as read")
  );
});

/**
 * @desc Get message info (read receipts, reactions)
 * @route GET /api/messages/:messageId/info
 * @access Private
 */
export const getMessageInfo = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId)
    .populate('sender', 'fullName username profilePicture')
    .populate('reactions.user', 'fullName username profilePicture')
    .populate('replyTo', 'content messageType sender');

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  // Verify user has access
  const conversation = await Conversation.findOne({
    _id: message.conversation,
    participants: userId,
  });

  if (!conversation) {
    throw new ApiError(403, "Access denied");
  }

  res.status(200).json(
    new ApiResponse(200, "Message info fetched", {
      _id: message._id,
      content: message.content,
      messageType: message.messageType,
      sender: message.sender,
      createdAt: message.createdAt,
      delivered: message.delivered,
      deliveredAt: message.deliveredAt,
      read: message.read,
      readAt: message.readAt,
      isEdited: message.isEdited,
      editedAt: message.editedAt,
      reactions: message.reactions,
      reactionCount: message.reactionCount,
      isForwarded: message.isForwarded,
      isPinned: message.isPinned,
      isStarred: message.starredBy?.includes(userId),
    })
  );
});

// ==================== GROUP CONVERSATION FUNCTIONS ====================

/**
 * @desc Create a group conversation
 * @route POST /api/messages/groups
 * @access Private
 */
export const createGroup = asyncHandler(async (req, res) => {
  const { name, description, participants, groupImage } = req.body;
  const userId = req.user._id;

  if (!name || name.trim().length === 0) {
    throw new ApiError(400, "Group name is required");
  }

  if (!participants || participants.length < 1) {
    throw new ApiError(400, "At least one participant is required");
  }

  // Add creator to participants if not already included
  const allParticipants = [...new Set([userId.toString(), ...participants])];

  const group = await Conversation.create({
    participants: allParticipants,
    isGroup: true,
    groupName: name.trim(),
    groupDescription: description?.trim() || '',
    groupImage: groupImage || null,
    groupAdmin: userId,
    groupAdmins: [userId],
    unreadCount: new Map(allParticipants.map(p => [p.toString(), 0])),
  });

  await group.populate('participants', 'fullName username profilePicture isVerified');
  await group.populate('groupAdmin', 'fullName username profilePicture');

  // Send system message about group creation
  const systemMessage = await Message.create({
    conversation: group._id,
    sender: userId,
    content: `${req.user.fullName} created the group "${name}"`,
    messageType: 'text',
  });

  group.lastMessage = systemMessage._id;
  await group.save();

  res.status(201).json(
    new ApiResponse(201, "Group created successfully", group)
  );
});

/**
 * @desc Update group info
 * @route PATCH /api/messages/groups/:groupId
 * @access Private (Admin only)
 */
export const updateGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { name, description, groupImage } = req.body;
  const userId = req.user._id;

  const group = await Conversation.findById(groupId);

  if (!group || !group.isGroup) {
    throw new ApiError(404, "Group not found");
  }

  // Check if user is admin
  if (!group.groupAdmins.some(a => a.toString() === userId.toString())) {
    throw new ApiError(403, "Only admins can update group info");
  }

  if (name) group.groupName = name.trim();
  if (description !== undefined) group.groupDescription = description.trim();
  if (groupImage !== undefined) group.groupImage = groupImage;

  await group.save();
  await group.populate('participants', 'fullName username profilePicture isVerified');

  res.status(200).json(
    new ApiResponse(200, "Group updated successfully", group)
  );
});

/**
 * @desc Add members to group
 * @route POST /api/messages/groups/:groupId/members
 * @access Private (Admin only)
 */
export const addGroupMembers = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { userIds } = req.body;
  const userId = req.user._id;

  const group = await Conversation.findById(groupId);

  if (!group || !group.isGroup) {
    throw new ApiError(404, "Group not found");
  }

  if (!group.groupAdmins.some(a => a.toString() === userId.toString())) {
    throw new ApiError(403, "Only admins can add members");
  }

  for (const newUserId of userIds) {
    if (!group.participants.some(p => p.toString() === newUserId)) {
      group.participants.push(newUserId);
      group.unreadCount.set(newUserId, 0);
    }
  }

  await group.save();
  await group.populate('participants', 'fullName username profilePicture isVerified');

  // System message
  const addedUsers = await User.find({ _id: { $in: userIds } }).select('fullName');
  const names = addedUsers.map(u => u.fullName).join(', ');
  
  await Message.create({
    conversation: groupId,
    sender: userId,
    content: `${req.user.fullName} added ${names} to the group`,
    messageType: 'text',
  });

  res.status(200).json(
    new ApiResponse(200, "Members added successfully", group)
  );
});

/**
 * @desc Remove member from group
 * @route DELETE /api/messages/groups/:groupId/members/:memberId
 * @access Private (Admin only)
 */
export const removeGroupMember = asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;
  const userId = req.user._id;

  const group = await Conversation.findById(groupId);

  if (!group || !group.isGroup) {
    throw new ApiError(404, "Group not found");
  }

  if (!group.groupAdmins.some(a => a.toString() === userId.toString())) {
    throw new ApiError(403, "Only admins can remove members");
  }

  // Cannot remove the main admin
  if (memberId === group.groupAdmin.toString()) {
    throw new ApiError(400, "Cannot remove the group creator");
  }

  group.participants = group.participants.filter(
    p => p.toString() !== memberId
  );
  group.groupAdmins = group.groupAdmins.filter(
    a => a.toString() !== memberId
  );
  group.unreadCount.delete(memberId);

  await group.save();

  const removedUser = await User.findById(memberId).select('fullName');
  await Message.create({
    conversation: groupId,
    sender: userId,
    content: `${req.user.fullName} removed ${removedUser?.fullName || 'a member'} from the group`,
    messageType: 'text',
  });

  res.status(200).json(
    new ApiResponse(200, "Member removed successfully")
  );
});

/**
 * @desc Leave group
 * @route POST /api/messages/groups/:groupId/leave
 * @access Private
 */
export const leaveGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  const group = await Conversation.findById(groupId);

  if (!group || !group.isGroup) {
    throw new ApiError(404, "Group not found");
  }

  if (!group.participants.some(p => p.toString() === userId.toString())) {
    throw new ApiError(400, "You are not a member of this group");
  }

  // If leaving user is the main admin, transfer to another admin or oldest member
  if (group.groupAdmin.toString() === userId.toString()) {
    const otherAdmins = group.groupAdmins.filter(a => a.toString() !== userId.toString());
    if (otherAdmins.length > 0) {
      group.groupAdmin = otherAdmins[0];
    } else {
      const otherMembers = group.participants.filter(p => p.toString() !== userId.toString());
      if (otherMembers.length > 0) {
        group.groupAdmin = otherMembers[0];
        group.groupAdmins.push(otherMembers[0]);
      }
    }
  }

  group.participants = group.participants.filter(
    p => p.toString() !== userId.toString()
  );
  group.groupAdmins = group.groupAdmins.filter(
    a => a.toString() !== userId.toString()
  );
  group.unreadCount.delete(userId.toString());

  await group.save();

  await Message.create({
    conversation: groupId,
    sender: userId,
    content: `${req.user.fullName} left the group`,
    messageType: 'text',
  });

  res.status(200).json(
    new ApiResponse(200, "Left group successfully")
  );
});

/**
 * @desc Make user admin
 * @route POST /api/messages/groups/:groupId/admins/:memberId
 * @access Private (Admin only)
 */
export const makeGroupAdmin = asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;
  const userId = req.user._id;

  const group = await Conversation.findById(groupId);

  if (!group || !group.isGroup) {
    throw new ApiError(404, "Group not found");
  }

  if (!group.groupAdmins.some(a => a.toString() === userId.toString())) {
    throw new ApiError(403, "Only admins can promote members");
  }

  if (!group.participants.some(p => p.toString() === memberId)) {
    throw new ApiError(400, "User is not a member of this group");
  }

  if (!group.groupAdmins.some(a => a.toString() === memberId)) {
    group.groupAdmins.push(memberId);
    await group.save();
  }

  const promotedUser = await User.findById(memberId).select('fullName');
  await Message.create({
    conversation: groupId,
    sender: userId,
    content: `${req.user.fullName} made ${promotedUser?.fullName || 'a member'} an admin`,
    messageType: 'text',
  });

  res.status(200).json(
    new ApiResponse(200, "User is now an admin")
  );
});

/**
 * @desc Remove admin role
 * @route DELETE /api/messages/groups/:groupId/admins/:memberId
 * @access Private (Admin only)
 */
export const removeGroupAdmin = asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;
  const userId = req.user._id;

  const group = await Conversation.findById(groupId);

  if (!group || !group.isGroup) {
    throw new ApiError(404, "Group not found");
  }

  // Only main admin can demote other admins
  if (group.groupAdmin.toString() !== userId.toString()) {
    throw new ApiError(403, "Only the group creator can remove admins");
  }

  if (memberId === group.groupAdmin.toString()) {
    throw new ApiError(400, "Cannot remove admin role from group creator");
  }

  group.groupAdmins = group.groupAdmins.filter(
    a => a.toString() !== memberId
  );
  await group.save();

  res.status(200).json(
    new ApiResponse(200, "Admin role removed")
  );
});

// ==================== LAST SEEN & ONLINE STATUS ====================

/**
 * @desc Update user's online status
 * @route POST /api/messages/status/online
 * @access Private
 */
export const updateOnlineStatus = asyncHandler(async (req, res) => {
  const { isOnline } = req.body;
  const userId = req.user._id;

  await User.findByIdAndUpdate(userId, {
    isOnline: isOnline,
    lastActive: isOnline ? new Date() : Date.now(),
  });

  res.status(200).json(
    new ApiResponse(200, "Status updated")
  );
});

/**
 * @desc Get user's last seen
 * @route GET /api/messages/users/:userId/status
 * @access Private
 */
export const getUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  const targetUser = await User.findById(userId).select('isOnline lastActive lastSeenPrivacy onlinePrivacy fullName');

  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  // Check privacy settings
  const isContact = await Conversation.exists({
    participants: { $all: [currentUserId, userId] },
    isGroup: false,
  });

  let canSeeOnline = false;
  let canSeeLastSeen = false;

  // Check online privacy
  if (targetUser.onlinePrivacy === 'everyone') {
    canSeeOnline = true;
  } else if (targetUser.onlinePrivacy === 'contacts' && isContact) {
    canSeeOnline = true;
  }

  // Check last seen privacy
  if (targetUser.lastSeenPrivacy === 'everyone') {
    canSeeLastSeen = true;
  } else if (targetUser.lastSeenPrivacy === 'contacts' && isContact) {
    canSeeLastSeen = true;
  }

  res.status(200).json(
    new ApiResponse(200, "User status fetched", {
      userId: targetUser._id,
      fullName: targetUser.fullName,
      isOnline: canSeeOnline ? targetUser.isOnline : null,
      lastActive: canSeeLastSeen ? targetUser.lastActive : null,
    })
  );
});

/**
 * @desc Update privacy settings
 * @route PATCH /api/messages/settings/privacy
 * @access Private
 */
export const updatePrivacySettings = asyncHandler(async (req, res) => {
  const { lastSeenPrivacy, onlinePrivacy } = req.body;
  const userId = req.user._id;

  const updates = {};
  if (lastSeenPrivacy) updates.lastSeenPrivacy = lastSeenPrivacy;
  if (onlinePrivacy) updates.onlinePrivacy = onlinePrivacy;

  await User.findByIdAndUpdate(userId, updates);

  res.status(200).json(
    new ApiResponse(200, "Privacy settings updated")
  );
});

// ==================== POLL FUNCTIONS ====================

/**
 * @desc Create a poll in a conversation
 * @route POST /api/messages/conversations/:conversationId/polls
 * @access Private
 */
export const createPoll = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { question, options, allowMultipleVotes, isAnonymous, showResultsBeforeVoting, expiresIn } = req.body;
  const userId = req.user._id;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  if (!conversation.participants.some(p => p.toString() === userId.toString())) {
    throw new ApiError(403, "You are not a participant in this conversation");
  }

  if (!question || question.trim().length === 0) {
    throw new ApiError(400, "Poll question is required");
  }

  if (!options || options.length < 2) {
    throw new ApiError(400, "At least 2 options are required");
  }

  const pollOptions = options.map(opt => ({
    text: opt.trim(),
    votes: [],
    voteCount: 0,
  }));

  // Calculate expiration
  let expiresAt = null;
  if (expiresIn) {
    const hours = parseInt(expiresIn);
    if (!isNaN(hours) && hours > 0) {
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    }
  }

  const poll = await Poll.create({
    conversation: conversationId,
    creator: userId,
    question: question.trim(),
    options: pollOptions,
    allowMultipleVotes: allowMultipleVotes || false,
    isAnonymous: isAnonymous || false,
    showResultsBeforeVoting: showResultsBeforeVoting !== false,
    expiresAt,
  });

  // Create message with poll
  const message = await Message.create({
    conversation: conversationId,
    sender: userId,
    messageType: 'poll',
    poll: poll._id,
    content: question.trim(),
  });

  conversation.lastMessage = message._id;
  await conversation.save();

  await poll.populate('creator', 'fullName username profilePicture');
  await message.populate('sender', 'fullName username profilePicture');
  await message.populate('poll');

  res.status(201).json(
    new ApiResponse(201, "Poll created", { poll, message })
  );
});

/**
 * @desc Vote on a poll
 * @route POST /api/messages/polls/:pollId/vote
 * @access Private
 */
export const votePoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const { optionIndexes } = req.body;
  const userId = req.user._id;

  const poll = await Poll.findById(pollId);
  if (!poll) {
    throw new ApiError(404, "Poll not found");
  }

  // Check if user is in the conversation
  const conversation = await Conversation.findById(poll.conversation);
  if (!conversation.participants.some(p => p.toString() === userId.toString())) {
    throw new ApiError(403, "You are not a participant in this conversation");
  }

  if (poll.isClosed) {
    throw new ApiError(400, "This poll is closed");
  }

  if (poll.expiresAt && new Date() > poll.expiresAt) {
    poll.isClosed = true;
    await poll.save();
    throw new ApiError(400, "This poll has expired");
  }

  if (!optionIndexes || optionIndexes.length === 0) {
    throw new ApiError(400, "Please select at least one option");
  }

  if (!poll.allowMultipleVotes && optionIndexes.length > 1) {
    throw new ApiError(400, "This poll only allows one vote");
  }

  // Remove previous votes
  poll.options.forEach(option => {
    option.votes = option.votes.filter(v => v.toString() !== userId.toString());
    option.voteCount = option.votes.length;
  });

  // Add new votes
  for (const index of optionIndexes) {
    if (index >= 0 && index < poll.options.length) {
      poll.options[index].votes.push(userId);
      poll.options[index].voteCount = poll.options[index].votes.length;
    }
  }

  poll.totalVotes = poll.options.reduce((sum, opt) => sum + opt.voteCount, 0);
  await poll.save();

  res.status(200).json(
    new ApiResponse(200, "Vote recorded", poll)
  );
});

/**
 * @desc Remove vote from poll
 * @route DELETE /api/messages/polls/:pollId/vote
 * @access Private
 */
export const removeVote = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const userId = req.user._id;

  const poll = await Poll.findById(pollId);
  if (!poll) {
    throw new ApiError(404, "Poll not found");
  }

  if (poll.isClosed) {
    throw new ApiError(400, "This poll is closed");
  }

  poll.options.forEach(option => {
    option.votes = option.votes.filter(v => v.toString() !== userId.toString());
    option.voteCount = option.votes.length;
  });

  poll.totalVotes = poll.options.reduce((sum, opt) => sum + opt.voteCount, 0);
  await poll.save();

  res.status(200).json(
    new ApiResponse(200, "Vote removed", poll)
  );
});

/**
 * @desc Close a poll
 * @route POST /api/messages/polls/:pollId/close
 * @access Private (Creator only)
 */
export const closePoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const userId = req.user._id;

  const poll = await Poll.findById(pollId);
  if (!poll) {
    throw new ApiError(404, "Poll not found");
  }

  if (poll.creator.toString() !== userId.toString()) {
    throw new ApiError(403, "Only the poll creator can close this poll");
  }

  poll.isClosed = true;
  await poll.save();

  res.status(200).json(
    new ApiResponse(200, "Poll closed", poll)
  );
});

/**
 * @desc Get poll details
 * @route GET /api/messages/polls/:pollId
 * @access Private
 */
export const getPoll = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const userId = req.user._id;

  const poll = await Poll.findById(pollId)
    .populate('creator', 'fullName username profilePicture');

  if (!poll) {
    throw new ApiError(404, "Poll not found");
  }

  // Check if user is in the conversation
  const conversation = await Conversation.findById(poll.conversation);
  if (!conversation.participants.some(p => p.toString() === userId.toString())) {
    throw new ApiError(403, "You are not a participant in this conversation");
  }

  // Check if user has voted
  const userVotedOptions = poll.options
    .map((opt, index) => opt.votes.some(v => v.toString() === userId.toString()) ? index : -1)
    .filter(i => i !== -1);

  // Hide voters if anonymous
  let pollData = poll.toObject();
  if (poll.isAnonymous) {
    pollData.options = pollData.options.map(opt => ({
      ...opt,
      votes: [], // Hide who voted
      voteCount: opt.voteCount,
    }));
  }

  res.status(200).json(
    new ApiResponse(200, "Poll fetched", {
      ...pollData,
      userVotedOptions,
      hasVoted: userVotedOptions.length > 0,
    })
  );
});

// ==================== CALL FUNCTIONS ====================

/**
 * @desc Initiate a call
 * @route POST /api/messages/conversations/:conversationId/call
 * @access Private
 */
export const initiateCall = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { callType } = req.body;
  const userId = req.user._id;

  const conversation = await Conversation.findById(conversationId)
    .populate('participants', 'fullName username profilePicture');

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  if (!conversation.participants.some(p => p._id.toString() === userId.toString())) {
    throw new ApiError(403, "You are not a participant in this conversation");
  }

  if (!['audio', 'video'].includes(callType)) {
    throw new ApiError(400, "Invalid call type. Use 'audio' or 'video'");
  }

  // Check for existing active call
  const existingCall = await Call.findOne({
    conversation: conversationId,
    status: { $in: ['initiated', 'ringing', 'ongoing'] },
  });

  if (existingCall) {
    throw new ApiError(400, "There is already an active call in this conversation");
  }

  const participants = conversation.participants.map(p => ({
    user: p._id,
    status: p._id.toString() === userId.toString() ? 'joined' : 'pending',
    joinedAt: p._id.toString() === userId.toString() ? new Date() : null,
  }));

  const call = await Call.create({
    conversation: conversationId,
    initiator: userId,
    callType,
    participants,
    status: 'ringing',
  });

  // Create call message
  const message = await Message.create({
    conversation: conversationId,
    sender: userId,
    messageType: 'call',
    call: call._id,
    content: `${callType === 'video' ? 'Video' : 'Voice'} call started`,
  });

  conversation.lastMessage = message._id;
  await conversation.save();

  await call.populate('initiator', 'fullName username profilePicture');
  await call.populate('participants.user', 'fullName username profilePicture');

  res.status(201).json(
    new ApiResponse(201, "Call initiated", { call, message })
  );
});

/**
 * @desc Answer a call
 * @route POST /api/messages/calls/:callId/answer
 * @access Private
 */
export const answerCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const userId = req.user._id;

  const call = await Call.findById(callId);
  if (!call) {
    throw new ApiError(404, "Call not found");
  }

  const participantIndex = call.participants.findIndex(
    p => p.user.toString() === userId.toString()
  );

  if (participantIndex === -1) {
    throw new ApiError(403, "You are not a participant in this call");
  }

  if (!['ringing', 'ongoing'].includes(call.status)) {
    throw new ApiError(400, "This call cannot be answered");
  }

  call.participants[participantIndex].status = 'joined';
  call.participants[participantIndex].joinedAt = new Date();
  
  // If any participant joins, set call to ongoing
  if (call.status === 'ringing') {
    call.status = 'ongoing';
    call.startedAt = new Date();
  }

  await call.save();
  await call.populate('participants.user', 'fullName username profilePicture');

  res.status(200).json(
    new ApiResponse(200, "Call answered", call)
  );
});

/**
 * @desc Decline a call
 * @route POST /api/messages/calls/:callId/decline
 * @access Private
 */
export const declineCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const userId = req.user._id;

  const call = await Call.findById(callId);
  if (!call) {
    throw new ApiError(404, "Call not found");
  }

  const participantIndex = call.participants.findIndex(
    p => p.user.toString() === userId.toString()
  );

  if (participantIndex === -1) {
    throw new ApiError(403, "You are not a participant in this call");
  }

  call.participants[participantIndex].status = 'declined';

  // Check if all non-initiator participants declined
  const allDeclined = call.participants.every(
    p => p.user.toString() === call.initiator.toString() || p.status === 'declined'
  );

  if (allDeclined) {
    call.status = 'declined';
    call.endedAt = new Date();
  }

  await call.save();

  res.status(200).json(
    new ApiResponse(200, "Call declined", call)
  );
});

/**
 * @desc End a call
 * @route POST /api/messages/calls/:callId/end
 * @access Private
 */
export const endCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const userId = req.user._id;

  const call = await Call.findById(callId);
  if (!call) {
    throw new ApiError(404, "Call not found");
  }

  const isParticipant = call.participants.some(
    p => p.user.toString() === userId.toString()
  );

  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this call");
  }

  call.status = 'ended';
  call.endedAt = new Date();
  
  if (call.startedAt) {
    call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
  }

  // Mark all participants as left
  call.participants.forEach(p => {
    if (p.status === 'joined') {
      p.status = 'left';
      p.leftAt = new Date();
    }
  });

  await call.save();

  // Update the call message
  const callMessage = await Message.findOne({ call: callId });
  if (callMessage) {
    const duration = call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : '0:00';
    callMessage.content = `${call.callType === 'video' ? 'Video' : 'Voice'} call • ${duration}`;
    await callMessage.save();
  }

  res.status(200).json(
    new ApiResponse(200, "Call ended", call)
  );
});

/**
 * @desc Leave a call (for group calls)
 * @route POST /api/messages/calls/:callId/leave
 * @access Private
 */
export const leaveCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const userId = req.user._id;

  const call = await Call.findById(callId);
  if (!call) {
    throw new ApiError(404, "Call not found");
  }

  const participantIndex = call.participants.findIndex(
    p => p.user.toString() === userId.toString()
  );

  if (participantIndex === -1) {
    throw new ApiError(403, "You are not a participant in this call");
  }

  call.participants[participantIndex].status = 'left';
  call.participants[participantIndex].leftAt = new Date();

  // Check if all participants have left
  const allLeft = call.participants.every(p => ['left', 'declined'].includes(p.status));
  if (allLeft) {
    call.status = 'ended';
    call.endedAt = new Date();
    if (call.startedAt) {
      call.duration = Math.floor((call.endedAt - call.startedAt) / 1000);
    }
  }

  await call.save();

  res.status(200).json(
    new ApiResponse(200, "Left call", call)
  );
});

/**
 * @desc Get call details
 * @route GET /api/messages/calls/:callId
 * @access Private
 */
export const getCall = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const userId = req.user._id;

  const call = await Call.findById(callId)
    .populate('initiator', 'fullName username profilePicture')
    .populate('participants.user', 'fullName username profilePicture');

  if (!call) {
    throw new ApiError(404, "Call not found");
  }

  const isParticipant = call.participants.some(
    p => p.user._id.toString() === userId.toString()
  );

  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this call");
  }

  res.status(200).json(
    new ApiResponse(200, "Call fetched", call)
  );
});

/**
 * @desc Update WebRTC signaling data
 * @route POST /api/messages/calls/:callId/signal
 * @access Private
 */
export const updateCallSignaling = asyncHandler(async (req, res) => {
  const { callId } = req.params;
  const { offer, answer, iceCandidate } = req.body;
  const userId = req.user._id;

  const call = await Call.findById(callId);
  if (!call) {
    throw new ApiError(404, "Call not found");
  }

  const isParticipant = call.participants.some(
    p => p.user.toString() === userId.toString()
  );

  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this call");
  }

  if (offer) {
    call.signalingData.offer = offer;
  }
  if (answer) {
    call.signalingData.answer = answer;
  }
  if (iceCandidate) {
    call.signalingData.iceCandidates.push(iceCandidate);
  }

  await call.save();

  res.status(200).json(
    new ApiResponse(200, "Signaling data updated", call)
  );
});

// ==================== LOCATION SHARING ====================

/**
 * @desc Send location message
 * @route POST /api/messages/conversations/:conversationId/location
 * @access Private
 */
export const sendLocation = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { latitude, longitude, address, name } = req.body;
  const userId = req.user._id;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  if (!conversation.participants.some(p => p.toString() === userId.toString())) {
    throw new ApiError(403, "You are not a participant in this conversation");
  }

  if (!latitude || !longitude) {
    throw new ApiError(400, "Latitude and longitude are required");
  }

  const message = await Message.create({
    conversation: conversationId,
    sender: userId,
    messageType: 'location',
    location: {
      latitude,
      longitude,
      address: address || '',
      name: name || '',
    },
    content: name || address || 'Shared location',
  });

  conversation.lastMessage = message._id;
  await conversation.save();

  await message.populate('sender', 'fullName username profilePicture');

  res.status(201).json(
    new ApiResponse(201, "Location sent", message)
  );
});

// ==================== CALL HISTORY ====================

/**
 * @desc Get call history for user
 * @route GET /api/messages/calls/history
 * @access Private
 */
export const getCallHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 20 } = req.query;

  const calls = await Call.find({
    'participants.user': userId,
    status: { $in: ['ended', 'missed', 'declined'] },
  })
    .populate('caller', 'fullName username profilePicture')
    .populate('participants.user', 'fullName username profilePicture')
    .populate('conversation', 'isGroup groupName groupImage')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const totalCalls = await Call.countDocuments({
    'participants.user': userId,
    status: { $in: ['ended', 'missed', 'declined'] },
  });

  res.status(200).json(
    new ApiResponse(200, "Call history fetched", {
      calls,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCalls / limit),
        totalCalls,
      },
    })
  );
});