import mongoose from 'mongoose';
const { Schema } = mongoose;

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
      maxlength: 2000,
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'reel', 'imageShare'],
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
    // For image messages
    imageUrl: {
      type: String,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    deletedFor: [{
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

export const Message = mongoose.model('Message', messageSchema);
