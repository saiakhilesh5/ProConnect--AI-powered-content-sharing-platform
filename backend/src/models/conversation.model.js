import mongoose from 'mongoose';
const { Schema } = mongoose;

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
    // For group chats (future feature)
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
    // Unread count per participant
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    // Muted by users
    mutedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    // Archived by users
    archivedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

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

export const Conversation = mongoose.model('Conversation', conversationSchema);
