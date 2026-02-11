import { Follow } from "../models/follow.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { updateUserBadge, updateInteractionPoints } from "../utils/userUpdates.js";

// list of controllers
// 1. followUser
// 2. unfollowUser
// 3. getFollowers
// 4. getFollowing
// 5. checkFollowStatus

/**
 * @desc Follow a user
 * @route POST /api/follow/:userId
 * @access Private
 */
export const followUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const followerId = req.user._id;

  if (followerId.toString() === userId) {
    throw new ApiError(400, "You cannot follow yourself.");
  }

  await Follow.followUser(followerId, userId);

  // Increment follower & following count
  await User.findByIdAndUpdate(userId, { $inc: { followersCount: 1 } });
  await User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } });
  
  // Update interaction points for following
  await updateInteractionPoints(followerId, 'follow');
  
  // Update badge for followed user based on followers count
  await updateUserBadge(userId);

  // Create notification for the user being followed
  await Notification.createNotification({
    recipient: userId,
    sender: followerId,
    type: 'follow',
    content: 'started following you',
    relatedUser: followerId
  });

  res.status(201).json(new ApiResponse(201, "User followed successfully."));
});

/**
 * @desc Unfollow a user
 * @route DELETE /api/follow/:userId
 * @access Private
 */
export const unfollowUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const followerId = req.user._id;

  await Follow.unfollowUser(followerId, userId);

  // Decrement follower & following count
  await User.findByIdAndUpdate(userId, { $inc: { followersCount: -1 } });
  await User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } });

  res.status(200).json(new ApiResponse(200, "User unfollowed successfully."));
});

/**
 * @desc Get followers of a user
 * @route GET /api/followers/:userId
 * @access Public
 */
export const getFollowers = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const followers = await Follow.getFollowers(userId);

  res.status(200).json(new ApiResponse(200, "Followers fetched successfully.", followers));
});

/**
 * @desc Get users the current user is following
 * @route GET /api/following/:userId
 * @access Public
 */
export const getFollowing = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const following = await Follow.getFollowing(userId);

  res.status(200).json(new ApiResponse(200, "Following users fetched successfully.", following));
});

/**
 * @desc Check if the authenticated user is following another user
 * @route GET /api/follow/status/:userId
 * @access Private
 */
export const checkFollowStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const followerId = req.user._id;

  const isFollowing = await Follow.checkFollowStatus(followerId, userId);

  res.status(200).json(new ApiResponse(200, "Follow status retrieved.", { isFollowing }));
});
