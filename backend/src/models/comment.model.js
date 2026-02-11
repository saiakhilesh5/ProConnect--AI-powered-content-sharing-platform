// models/comment.model.js

import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

const { Schema } = mongoose;

// Comment schema definition
const commentSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User who posted the comment
      required: true,
    },
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image', // Reference to the Image on which the comment is made
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'], // Comment text content
      maxlength: [500, 'Comment cannot exceed 500 characters'], // Limiting comment length
      trim: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment', // For threaded replies (parent comment reference)
      default: null,
    },
    repliesCount: {
      type: Number,
      default: 0, // Track number of replies to this comment
    },
    likesCount: {
      type: Number,
      default: 0, // Track number of likes on this comment
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // Reference to users who liked the comment
    }]
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Method to create a new comment
commentSchema.statics.createComment = async function (userId, imageId, text, parentCommentId = null) {
  // Validate image exists
  const image = await mongoose.model('Image').findById(imageId);
  if (!image) {
    throw new ApiError(404, 'Image not found');
  }

  // Validate user exists
  const user = await mongoose.model('User').findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // If this is a reply, validate parent comment exists
  if (parentCommentId) {
    const parentComment = await this.findById(parentCommentId);
    if (!parentComment) {
      throw new ApiError(404, 'Parent comment not found');
    }
    // Increment replies count on parent
    await this.findByIdAndUpdate(parentCommentId, { $inc: { repliesCount: 1 } });
  }

  const newComment = new this({
    user: userId,
    image: imageId,
    text,
    parentComment: parentCommentId,
  });

  // Increment the comment count on the image
  await mongoose.model('Image').findByIdAndUpdate(imageId, { $inc: { commentsCount: 1 } });

  // Populate user details before returning the new comment
  return newComment.save().then(comment => comment.populate('user', 'fullName username profilePicture'));
};

// Method to update an existing comment
commentSchema.statics.updateComment = async function (commentId, userId, newText) {
  const comment = await this.findById(commentId);
  
  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }

  // Verify comment ownership
  if (comment.user.toString() !== userId.toString()) {
    throw new ApiError(403, 'Unauthorized to update this comment');
  }

  comment.text = newText;
  comment.updatedAt = Date.now();
  return comment.save();
};

// Method to delete a comment
commentSchema.statics.deleteComment = async function (commentId, userId) {
  const comment = await this.findById(commentId);
  
  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }

  // Verify comment ownership
  if (comment.user.toString() !== userId.toString()) {
    throw new ApiError(403, 'Unauthorized to delete this comment');
  }

  // If this is a reply, decrement parent's replies count
  if (comment.parentComment) {
    await this.findByIdAndUpdate(comment.parentComment, { $inc: { repliesCount: -1 } });
  }

  // Decrement the comment count on the image
  await mongoose.model('Image').findByIdAndUpdate(comment.image, { $inc: { commentsCount: -1 } });

  // Delete the comment and all its replies
  await this.deleteMany({ $or: [
    { _id: commentId },
    { parentComment: commentId }
  ]});

  return comment;
};

// Method to toggle like on a comment
commentSchema.statics.toggleLike = async function(commentId, userId) {
  const comment = await this.findById(commentId);
  
  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }

  const userLikedIndex = comment.likes.indexOf(userId);
  
  if (userLikedIndex === -1) {
    // User hasn't liked the comment yet - add like
    comment.likes.push(userId);
    comment.likesCount += 1;
    await comment.save();
    return { liked: true };
  } else {
    // User already liked - remove like
    comment.likes.splice(userLikedIndex, 1);
    comment.likesCount -= 1;
    await comment.save();
    return { liked: false };
  }
};

// Method to get users who liked a comment
commentSchema.statics.getLikedUsers = async function(commentId, page = 1, limit = 10) {
  const comment = await this.findById(commentId);
  
  if (!comment) {
    throw new ApiError(404, 'Comment not found');
  }

  const skip = (page - 1) * limit;

  const users = await mongoose.model('User')
    .find({ _id: { $in: comment.likes }})
    .select('fullName username profilePicture')
    .skip(skip)
    .limit(limit);

  const total = comment.likes.length;

  return {
    users,
    metadata: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get comments for an image with pagination
 * @param {ObjectId} imageId - Image ID
 * @param {number} page - Page number
 * @param {number} limit - Limit per page
 */
commentSchema.statics.getImageComments = async function (imageId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const comments = await this.find({ 
    image: imageId,
    parentComment: null // Only get top-level comments
  })
    .populate('user', 'fullName username profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments({ image: imageId, parentComment: null });

  return {
    comments,
    metadata: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

// Create the Comment model
export const Comment = mongoose.model('Comment', commentSchema);
