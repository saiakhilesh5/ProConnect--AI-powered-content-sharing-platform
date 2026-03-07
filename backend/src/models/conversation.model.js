import mongoose from 'mongoose';
const { Schema } = mongoose;

// Typing status sub-schema
const typingStatusSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isTyping: {
      type: Boolean,
      default: false,
    },
    lastTypingAt: {
      type: Date,
    },
  },
  { _id: false }
);

// Chat theme sub-schema
const chatThemeSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    backgroundColor: {
      type: String,
      default: '#000000',
    },
    bubbleColor: {
      type: String,
      default: '#3b82f6', // Blue
    },
    textColor: {
      type: String,
      default: '#ffffff',
    },
    emoji: {
      type: String,
      default: '❤️',
    },
  },
  { _id: false }
);

// Conversation schema definition
const conversationSchema = new Schema(
  {
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    // For group chats
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
      maxlength: 100,
    },
    groupImage: {
      type: String,
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    groupAdmins: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    groupDescription: {
      type: String,
      maxlength: 500,
    },
    // Unread count per participant
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    // Muted by users with duration
    mutedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      mutedUntil: {
        type: Date, // null means muted forever
      },
    }],
    // Archived by users
    archivedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    // Typing indicators
    typingStatus: [typingStatusSchema],
    // Pinned messages
    pinnedMessages: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    }],
    // Vanish mode (disappearing messages)
    vanishMode: {
      type: Boolean,
      default: false,
    },
    vanishModeEnabledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    vanishModeEnabledAt: {
      type: Date,
    },
    // Custom themes per user
    themes: [chatThemeSchema],
    // Chat nicknames (user can set nickname for others)
    nicknames: {
      type: Map,
      of: String,
      default: {},
    },
    // Quick reactions emoji
    quickEmoji: {
      type: String,
      default: '❤️',
    },
    // Blocked conversations
    blockedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    // Request conversation (for non-followers)
    isRequest: {
      type: Boolean,
      default: false,
    },
    requestAcceptedAt: {
      type: Date,
    },
    // Encryption status (for future E2E encryption)
    isEncrypted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ isGroup: 1 });
conversationSchema.index({ 'typingStatus.user': 1 });

// Static method to find or create conversation between two users
conversationSchema.statics.findOrCreateConversation = async function(userId1, userId2) {
  let conversation = await this.findOne({
    participants: { $all: [userId1, userId2] },
    isGroup: false,
  });

  if (!conversation) {
    conversation = await this.create({
      participants: [userId1, userId2],
      unreadCount: new Map([[userId1.toString(), 0], [userId2.toString(), 0]]),
    });
  }

  return conversation;
};

// Method to increment unread count for a user
conversationSchema.methods.incrementUnread = async function(userId) {
  const currentCount = this.unreadCount.get(userId.toString()) || 0;
  this.unreadCount.set(userId.toString(), currentCount + 1);
  await this.save();
};

// Method to reset unread count for a user
conversationSchema.methods.resetUnread = async function(userId) {
  this.unreadCount.set(userId.toString(), 0);
  await this.save();
};

// Method to update typing status
conversationSchema.methods.setTypingStatus = async function(userId, isTyping) {
  const existingIndex = this.typingStatus.findIndex(
    ts => ts.user.toString() === userId.toString()
  );
  
  if (existingIndex >= 0) {
    this.typingStatus[existingIndex].isTyping = isTyping;
    this.typingStatus[existingIndex].lastTypingAt = new Date();
  } else if (isTyping) {
    this.typingStatus.push({
      user: userId,
      isTyping: true,
      lastTypingAt: new Date(),
    });
  }
  
  await this.save();
};

// Method to check if user is muted
conversationSchema.methods.isUserMuted = function(userId) {
  const muted = this.mutedBy.find(m => m.user?.toString() === userId.toString());
  if (!muted) return false;
  if (!muted.mutedUntil) return true; // Muted forever
  return new Date() < muted.mutedUntil;
};

// Method to set chat theme for a user
conversationSchema.methods.setChatTheme = async function(userId, theme) {
  const existingIndex = this.themes.findIndex(
    t => t.userId?.toString() === userId.toString()
  );
  
  if (existingIndex >= 0) {
    this.themes[existingIndex] = { userId, ...theme };
  } else {
    this.themes.push({ userId, ...theme });
  }
  
  await this.save();
};

// Method to toggle vanish mode
conversationSchema.methods.toggleVanishMode = async function(userId) {
  this.vanishMode = !this.vanishMode;
  this.vanishModeEnabledBy = userId;
  this.vanishModeEnabledAt = new Date();
  await this.save();
};

export const Conversation = mongoose.model('Conversation', conversationSchema);
