// models/like.model.js

import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const { Schema } = mongoose;

// Likes schema definition
const likeSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Image",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index to prevent duplicate likes
likeSchema.index({ user: 1, image: 1 }, { unique: true });

/**
 * Toggle like status on an image
 * @param {ObjectId} userId - User ID
 * @param {ObjectId} imageId - Image ID
 */
likeSchema.statics.toggleLike = async function (userId, imageId) {
  const existingLike = await this.findOne({ user: userId, image: imageId });
  const image = await mongoose.model("Image").findById(imageId);

  if (!image) {
    throw new ApiError(404, "Image not found");
  }

  if (existingLike) {
    await existingLike.deleteOne();
    await mongoose.model("Image").updateOne(
      { _id: imageId },
      { $inc: { likesCount: -1 } }
    );
    await mongoose.model("User").updateOne(
      { _id: image.user },
      { $inc: { likesCount: -1 } }
    );
    return { liked: false };
  } else {
    await this.create({ user: userId, image: imageId });
    await mongoose.model("Image").updateOne(
      { _id: imageId },
      { $inc: { likesCount: 1 } }
    );
    await mongoose.model("User").updateOne(
      { _id: image.user },
      { $inc: { likesCount: 1 } }
    );
    return { liked: true };
  }
};

/**
 * Get all liked images of a user with pagination
 * @param {ObjectId} userId - User ID
 * @param {number} page - Page number
 * @param {number} limit - Limit per page
 * @param {string} category - Optional category filter
 */
likeSchema.statics.getUserLikes = async function (userId, page = 1, limit = 10, category = null) {
  const skip = (page - 1) * limit;
  const matchQuery = { user: userId };

  // Build pipeline for better population and filtering
  const pipeline = [
    { $match: matchQuery },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'images',
        localField: 'image',
        foreignField: '_id',
        as: 'imageData'
      }
    },
    { $unwind: '$imageData' }
  ];

  // Add category filter if provided
  if (category && category !== 'all') {
    pipeline.push({ $match: { 'imageData.category': category } });
  }

  // Add user lookup
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'imageData.user',
      foreignField: '_id',
      as: 'userData'
    }
  });
  
  pipeline.push({ $unwind: '$userData' });

  // Project only needed fields
  pipeline.push({
    $project: {
      _id: 1,
      createdAt: 1,
      image: {
        _id: '$imageData._id',
        title: '$imageData.title',
        description: '$imageData.description',
        imageUrl: '$imageData.imageUrl',
        category: '$imageData.category',
        tags: '$imageData.tags',
        likesCount: '$imageData.likesCount',
        favoritesCount: '$imageData.favoritesCount',
        commentsCount: '$imageData.commentsCount',
        visibility: '$imageData.visibility',
        createdAt: '$imageData.createdAt'
      },
      user: {
        _id: '$userData._id',
        username: '$userData.username',
        profilePicture: '$userData.profilePicture',
        fullName: '$userData.fullName'
      }
    }
  });

  const likes = await this.aggregate(pipeline);

  // Count total with respect to category filter
  let countPipeline = [{ $match: matchQuery }];
  
  if (category && category !== 'all') {
    countPipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'images',
          localField: 'image',
          foreignField: '_id',
          as: 'imageData'
        }
      },
      { $unwind: '$imageData' },
      { $match: { 'imageData.category': category } }
    ];
  }
  
  const countResult = await this.aggregate([
    ...countPipeline,
    { $count: 'total' }
  ]);
  
  const total = countResult.length > 0 ? countResult[0].total : 0;

  return {
    likes,
    metadata: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// Create the Likes model
export const Like = mongoose.model("Like", likeSchema);
