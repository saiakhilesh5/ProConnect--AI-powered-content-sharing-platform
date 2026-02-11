import mongoose from 'mongoose';
const { Schema } = mongoose;

// Reel Save/Bookmark schema
const reelSaveSchema = new Schema(
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

// Compound index to ensure a user can only save a reel once
reelSaveSchema.index({ user: 1, reel: 1 }, { unique: true });

export const ReelSave = mongoose.model('ReelSave', reelSaveSchema);
