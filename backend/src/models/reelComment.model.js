import mongoose from 'mongoose';
const { Schema } = mongoose;

// Reel Comment schema
const reelCommentSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 500,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReelComment',
      default: null,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    likedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    repliesCount: {
      type: Number,
      default: 0,
    },
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    moderationScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reelCommentSchema.index({ reel: 1, createdAt: -1 });
reelCommentSchema.index({ parentComment: 1 });

export const ReelComment = mongoose.model('ReelComment', reelCommentSchema);
