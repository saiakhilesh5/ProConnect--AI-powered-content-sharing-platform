import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: {
      type: String,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true }
);

// One review per user per image
reviewSchema.index({ image: 1, user: 1 }, { unique: true });

// Static: get stats for an image
reviewSchema.statics.getStatsForImage = async function(imageId) {
  const pipeline = [
    { $match: { image: new mongoose.Types.ObjectId(imageId) } },
    {
      $group: {
        _id: '$image',
        averageRating: { $avg: '$rating' },
        ratingsCount: { $sum: 1 },
        oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        twoStar: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        threeStar: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        fourStar: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        fiveStar: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
      },
    },
  ];

  const result = await this.aggregate(pipeline);
  if (!result.length) {
    return {
      averageRating: 0,
      ratingsCount: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }
  const stats = result[0];
  return {
    averageRating: Number(stats.averageRating?.toFixed(1)) || 0,
    ratingsCount: stats.ratingsCount || 0,
    distribution: {
      1: stats.oneStar || 0,
      2: stats.twoStar || 0,
      3: stats.threeStar || 0,
      4: stats.fourStar || 0,
      5: stats.fiveStar || 0,
    },
  };
};

export const Review = mongoose.model('Review', reviewSchema);


