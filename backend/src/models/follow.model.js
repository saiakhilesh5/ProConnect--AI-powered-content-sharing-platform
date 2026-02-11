import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js'; // Assuming you have this utility

const { Schema } = mongoose;

// Follow schema definition
const followSchema = new Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model for the follower
      required: true,
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model for the following user
      required: true,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Unique index to prevent multiple follows between the same pair of users
followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ follower: 1 }); // Index for faster lookup by follower
followSchema.index({ following: 1 }); // Index for faster lookup by following

// Method to create a new follow relationship
followSchema.statics.followUser = async function (followerId, followingId) {
  // Prevent user from following themselves
  if (followerId === followingId) {
    throw new ApiError(400, 'You cannot follow yourself');
  }

  // Check if the user exists (optional but recommended)
  const followingUser = await mongoose.model('User').findById(followingId);
  if (!followingUser) {
    throw new ApiError(404, 'Following user does not exist');
  }

  // Check if the follow relationship already exists
  const existingFollow = await this.findOne({ follower: followerId, following: followingId });
  if (existingFollow) {
    throw new ApiError(409, 'You are already following this user');
  }

  // Create a new follow relationship
  const follow = new this({
    follower: followerId,
    following: followingId,
  });

  return follow.save();
};

// Method to unfollow a user
followSchema.statics.unfollowUser = async function (followerId, followingId) {
  // Ensure the follow relationship exists
  const existingFollow = await this.findOne({ follower: followerId, following: followingId });
  if (!existingFollow) {
    throw new ApiError(404, 'You are not following this user');
  }

  // Remove the follow relationship
  await this.deleteOne({ follower: followerId, following: followingId });
  return { message: 'Unfollowed successfully' };
};

// Get all followers of a user
followSchema.statics.getFollowers = async function (userId) {
  const followers = await this.find({ following: userId })
    .populate('follower', 'fullName username profilePicture followersCount followingCount posts badge') // Populating follower details
    .select('follower createdAt'); // You can also select specific fields you need

  return followers;
};

// Get all users the current user is following
followSchema.statics.getFollowing = async function (userId) {
  const following = await this.find({ follower: userId })
    .populate('following', 'fullName username profilePicture followersCount followingCount posts badge') // Populating following details
    .select('following createdAt'); // You can also select specific fields you need

  return following;
};

// Check if the current user is following another user
followSchema.statics.checkFollowStatus = async function (followerId, followingId) {
  const followStatus = await this.findOne({ follower: followerId, following: followingId });
  return followStatus ? true : false; // Returns a boolean indicating follow status
};

// Create the Follow model
export const Follow = mongoose.model('Follow', followSchema);