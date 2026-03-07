import mongoose from 'mongoose';
const { Schema } = mongoose;

// Reaction sub-schema
const reactionSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      required: true,
      enum: ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🔥', '💯', '🎉'],
    },
  },
  { _id: false }
);

// Message schema definition
const messageSchema = new Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      maxlength: 5000, // Increased for longer messages
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'reel', 'imageShare', 'voice', 'video', 'gif', 'sticker', 'file', 'storyReply', 'poll', 'call', 'location'],
      default: 'text',
    },
    // For sharing images/reels
    sharedImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image',
    },
    sharedReel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
    },
    // For poll messages
    poll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poll',
    },
    // For call messages (call history)
    call: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Call',
    },
    // For location messages
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
      name: String,
    },
    // For image/video messages
    imageUrl: {
      type: String,
    },
    // For voice messages
    voiceUrl: {
      type: String,
    },
    voiceDuration: {
      type: Number, // Duration in seconds
    },
    // For file attachments
    fileUrl: {
      type: String,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number, // Size in bytes
    },
    // Reply to another message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    // Forwarded from
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    isForwarded: {
      type: Boolean,
      default: false,
    },
    // Message reactions
    reactions: [reactionSchema],
    // Message edits
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    originalContent: {
      type: String, // Store original content when edited
    },
    // Read status
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    // Delivered status
    delivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    // Disappearing messages
    isDisappearing: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
    },
    // Pinned message
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedAt: {
      type: Date,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Deleted statuses
    deletedFor: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    deletedForEveryone: {
      type: Boolean,
      default: false,
    },
    deletedForEveryoneAt: {
      type: Date,
    },
    // Starred/saved messages
    starredBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'reactions.user': 1 });
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for disappearing messages
messageSchema.index({ isPinned: 1, conversation: 1 });

// Virtual for reaction count
messageSchema.virtual('reactionCount').get(function() {
  const counts = {};
  this.reactions?.forEach(r => {
    counts[r.emoji] = (counts[r.emoji] || 0) + 1;
  });
  return counts;
});

// Ensure virtuals are included in JSON
messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

export const Message = mongoose.model('Message', messageSchema);
