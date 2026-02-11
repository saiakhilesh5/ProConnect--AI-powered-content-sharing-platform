import mongoose from 'mongoose';
const { Schema } = mongoose;

// Reel Like schema
const reelLikeSchema = new Schema(
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
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure a user can only like a reel once
reelLikeSchema.index({ user: 1, reel: 1 }, { unique: true });

export const ReelLike = mongoose.model('ReelLike', reelLikeSchema);
