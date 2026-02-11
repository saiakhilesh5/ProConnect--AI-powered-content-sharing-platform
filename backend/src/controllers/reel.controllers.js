import { Reel } from "../models/reel.model.js";
import { ReelLike } from "../models/reelLike.model.js";
import { ReelComment } from "../models/reelComment.model.js";
import { ReelSave } from "../models/reelSave.model.js";
import { User } from "../models/user.model.js";
import { Follow } from "../models/follow.model.js";
import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import cloudinary from "../config/cloudinary.js";
import { updateUserBadge } from "../utils/userUpdates.js";

/**
 * @desc Upload a new reel
 * @route POST /api/reels
 * @access Private
 */
export const uploadReel = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { caption, category, tags, visibility, commentsAllowed, duration, aspectRatio, music } = req.body;

  if (!req.file) {
    throw new ApiError(400, "Video file is required");
  }

  // Upload video to Cloudinary
  const result = await cloudinary.uploader.upload(req.file.path, {
    resource_type: "video",
    folder: "pixora/reels",
    eager: [
      { format: "jpg", transformation: [{ width: 400, height: 711, crop: "fill" }] }
    ],
    eager_async: false,
  });

  // Get thumbnail from eager transformation
  const thumbnailUrl = result.eager?.[0]?.secure_url || result.secure_url.replace('.mp4', '.jpg');

  const reel = await Reel.create({
    user: userId,
    caption,
    videoUrl: result.secure_url,
    publicId: result.public_id,
    thumbnailUrl,
    duration: parseFloat(duration) || result.duration,
    aspectRatio: aspectRatio || '9:16',
    category: category || 'other',
    tags: tags ? tags.split(',').map(tag => tag.trim().toLowerCase()) : [],
    visibility: visibility || 'public',
    commentsAllowed: commentsAllowed !== 'false',
    music: music ? JSON.parse(music) : null,
  });

  // Update user's post count
  await User.findByIdAndUpdate(userId, { $inc: { postsCount: 1 } });
  await updateUserBadge(userId);

  await reel.populate('user', 'fullName username profilePicture isVerified badge');

  res.status(201).json(
    new ApiResponse(201, "Reel uploaded successfully", reel)
  );
});

/**
 * @desc Get reel by ID
 * @route GET /api/reels/:reelId
 * @access Public/Private
 */
export const getReel = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  const userId = req.user?._id;

  const reel = await Reel.findById(reelId)
    .populate('user', 'fullName username profilePicture isVerified badge followersCount');

  if (!reel) {
    throw new ApiError(404, "Reel not found");
  }

  // Check visibility permissions
  if (reel.visibility !== 'public') {
    if (!userId) {
      throw new ApiError(403, "Access denied");
    }

    if (reel.visibility === 'private' && reel.user._id.toString() !== userId.toString()) {
      throw new ApiError(403, "This reel is private");
    }

    if (reel.visibility === 'followers' && reel.user._id.toString() !== userId.toString()) {
      const isFollowing = await Follow.findOne({
        follower: userId,
        following: reel.user._id,
      });
      if (!isFollowing) {
        throw new ApiError(403, "Follow this user to view their reels");
      }
    }
  }

  // Increment view count
  if (userId) {
    await reel.incrementViews(userId);
  }

  // Check if user has liked/saved this reel
  let isLiked = false;
  let isSaved = false;
  
  if (userId) {
    isLiked = await ReelLike.exists({ user: userId, reel: reelId });
    isSaved = await ReelSave.exists({ user: userId, reel: reelId });
  }

  res.status(200).json(
    new ApiResponse(200, "Reel fetched successfully", {
      ...reel.toObject(),
      isLiked: !!isLiked,
      isSaved: !!isSaved,
    })
  );
});

/**
 * @desc Get reels feed (infinite scroll)
 * @route GET /api/reels/feed
 * @access Private
 */
export const getReelsFeed = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { category } = req.query;

  // Build query
  let query = { visibility: 'public' };
  
  if (category && category !== 'all') {
    query.category = category;
  }

  const reels = await Reel.find(query)
    .populate('user', 'fullName username profilePicture isVerified badge')
    .sort({ trendingScore: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Get like and save status for each reel
  const reelsWithStatus = await Promise.all(
    reels.map(async (reel) => {
      const isLiked = await ReelLike.exists({ user: userId, reel: reel._id });
      const isSaved = await ReelSave.exists({ user: userId, reel: reel._id });
      
      return {
        ...reel.toObject(),
        isLiked: !!isLiked,
        isSaved: !!isSaved,
      };
    })
  );

  const total = await Reel.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, "Reels feed fetched successfully", {
      reels: reelsWithStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  );
});

/**
 * @desc Get following users' reels
 * @route GET /api/reels/following
 * @access Private
 */
export const getFollowingReels = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get users that the current user follows
  const following = await Follow.find({ follower: userId }).select('following');
  const followingIds = following.map(f => f.following);

  const reels = await Reel.find({
    user: { $in: followingIds },
    visibility: { $in: ['public', 'followers'] },
  })
    .populate('user', 'fullName username profilePicture isVerified badge')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  // Get like and save status
  const reelsWithStatus = await Promise.all(
    reels.map(async (reel) => {
      const isLiked = await ReelLike.exists({ user: userId, reel: reel._id });
      const isSaved = await ReelSave.exists({ user: userId, reel: reel._id });
      
      return {
        ...reel.toObject(),
        isLiked: !!isLiked,
        isSaved: !!isSaved,
      };
    })
  );

  const total = await Reel.countDocuments({
    user: { $in: followingIds },
    visibility: { $in: ['public', 'followers'] },
  });

  res.status(200).json(
    new ApiResponse(200, "Following reels fetched successfully", {
      reels: reelsWithStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  );
});

/**
 * @desc Get user's reels
 * @route GET /api/reels/user/:userId
 * @access Public/Private
 */
export const getUserReels = asyncHandler(async (req, res) => {
  const { userId: targetUserId } = req.params;
  const currentUserId = req.user?._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  // Determine visibility filter
  let visibilityFilter = { visibility: 'public' };
  
  if (currentUserId) {
    if (currentUserId.toString() === targetUserId) {
      // User viewing their own reels - show all
      visibilityFilter = {};
    } else {
      // Check if following
      const isFollowing = await Follow.exists({
        follower: currentUserId,
        following: targetUserId,
      });
      
      if (isFollowing) {
        visibilityFilter = { visibility: { $in: ['public', 'followers'] } };
      }
    }
  }

  const reels = await Reel.find({
    user: targetUserId,
    ...visibilityFilter,
  })
    .select('thumbnailUrl viewsCount likesCount duration createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Reel.countDocuments({
    user: targetUserId,
    ...visibilityFilter,
  });

  res.status(200).json(
    new ApiResponse(200, "User reels fetched successfully", {
      reels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  );
});

/**
 * @desc Like/Unlike a reel
 * @route POST /api/reels/:reelId/like
 * @access Private
 */
export const toggleLikeReel = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  const userId = req.user._id;

  const reel = await Reel.findById(reelId);
  if (!reel) {
    throw new ApiError(404, "Reel not found");
  }

  const existingLike = await ReelLike.findOne({ user: userId, reel: reelId });

  if (existingLike) {
    // Unlike
    await ReelLike.deleteOne({ _id: existingLike._id });
    reel.likesCount = Math.max(0, reel.likesCount - 1);
    await reel.save();

    res.status(200).json(
      new ApiResponse(200, "Reel unliked", { isLiked: false, likesCount: reel.likesCount })
    );
  } else {
    // Like
    await ReelLike.create({ user: userId, reel: reelId });
    reel.likesCount += 1;
    reel.trendingScore = reel.calculateTrendingScore();
    await reel.save();

    // Send notification if not liking own reel
    if (reel.user.toString() !== userId.toString()) {
      await Notification.createNotification({
        recipient: reel.user,
        sender: userId,
        type: 'like',
        content: 'liked your reel',
        relatedReel: reelId,
      });
    }

    res.status(200).json(
      new ApiResponse(200, "Reel liked", { isLiked: true, likesCount: reel.likesCount })
    );
  }
});

/**
 * @desc Save/Unsave a reel
 * @route POST /api/reels/:reelId/save
 * @access Private
 */
export const toggleSaveReel = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  const userId = req.user._id;

  const reel = await Reel.findById(reelId);
  if (!reel) {
    throw new ApiError(404, "Reel not found");
  }

  const existingSave = await ReelSave.findOne({ user: userId, reel: reelId });

  if (existingSave) {
    // Unsave
    await ReelSave.deleteOne({ _id: existingSave._id });
    reel.savesCount = Math.max(0, reel.savesCount - 1);
    await reel.save();

    res.status(200).json(
      new ApiResponse(200, "Reel unsaved", { isSaved: false, savesCount: reel.savesCount })
    );
  } else {
    // Save
    await ReelSave.create({ user: userId, reel: reelId });
    reel.savesCount += 1;
    await reel.save();

    res.status(200).json(
      new ApiResponse(200, "Reel saved", { isSaved: true, savesCount: reel.savesCount })
    );
  }
});

/**
 * @desc Add comment to reel
 * @route POST /api/reels/:reelId/comments
 * @access Private
 */
export const addReelComment = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  const { text, parentCommentId } = req.body;
  const userId = req.user._id;

  const reel = await Reel.findById(reelId);
  if (!reel) {
    throw new ApiError(404, "Reel not found");
  }

  if (!reel.commentsAllowed) {
    throw new ApiError(403, "Comments are disabled for this reel");
  }

  const commentData = {
    user: userId,
    reel: reelId,
    text,
  };

  if (parentCommentId) {
    const parentComment = await ReelComment.findById(parentCommentId);
    if (!parentComment) {
      throw new ApiError(404, "Parent comment not found");
    }
    commentData.parentComment = parentCommentId;
    parentComment.repliesCount += 1;
    await parentComment.save();
  }

  const comment = await ReelComment.create(commentData);
  await comment.populate('user', 'fullName username profilePicture isVerified');

  // Update reel comments count
  reel.commentsCount += 1;
  reel.trendingScore = reel.calculateTrendingScore();
  await reel.save();

  // Send notification
  if (reel.user.toString() !== userId.toString()) {
    await Notification.createNotification({
      recipient: reel.user,
      sender: userId,
      type: 'comment',
      content: `commented: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
      relatedReel: reelId,
      relatedComment: comment._id,
    });
  }

  res.status(201).json(
    new ApiResponse(201, "Comment added successfully", comment)
  );
});

/**
 * @desc Get reel comments
 * @route GET /api/reels/:reelId/comments
 * @access Public
 */
export const getReelComments = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const comments = await ReelComment.find({
    reel: reelId,
    parentComment: null,
  })
    .populate('user', 'fullName username profilePicture isVerified')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ReelComment.countDocuments({
    reel: reelId,
    parentComment: null,
  });

  res.status(200).json(
    new ApiResponse(200, "Comments fetched successfully", {
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  );
});

/**
 * @desc Delete a reel
 * @route DELETE /api/reels/:reelId
 * @access Private
 */
export const deleteReel = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  const userId = req.user._id;

  const reel = await Reel.findById(reelId);
  if (!reel) {
    throw new ApiError(404, "Reel not found");
  }

  if (reel.user.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized to delete this reel");
  }

  // Delete from Cloudinary
  await cloudinary.uploader.destroy(reel.publicId, { resource_type: 'video' });
  if (reel.thumbnailPublicId) {
    await cloudinary.uploader.destroy(reel.thumbnailPublicId);
  }

  // Delete related data
  await ReelLike.deleteMany({ reel: reelId });
  await ReelComment.deleteMany({ reel: reelId });
  await ReelSave.deleteMany({ reel: reelId });

  // Delete the reel
  await Reel.deleteOne({ _id: reelId });

  // Update user's post count
  await User.findByIdAndUpdate(userId, { $inc: { postsCount: -1 } });

  res.status(200).json(
    new ApiResponse(200, "Reel deleted successfully")
  );
});

/**
 * @desc Get trending reels
 * @route GET /api/reels/trending
 * @access Public
 */
export const getTrendingReels = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;

  const reels = await Reel.find({ visibility: 'public' })
    .populate('user', 'fullName username profilePicture isVerified badge')
    .sort({ trendingScore: -1 })
    .limit(limit);

  res.status(200).json(
    new ApiResponse(200, "Trending reels fetched successfully", reels)
  );
});

/**
 * @desc Search reels
 * @route GET /api/reels/search
 * @access Public
 */
export const searchReels = asyncHandler(async (req, res) => {
  const { query, category } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  if (!query) {
    throw new ApiError(400, "Search query is required");
  }

  const searchQuery = {
    visibility: 'public',
    $or: [
      { caption: { $regex: query, $options: 'i' } },
      { tags: { $regex: query, $options: 'i' } },
    ],
  };

  if (category && category !== 'all') {
    searchQuery.category = category;
  }

  const reels = await Reel.find(searchQuery)
    .populate('user', 'fullName username profilePicture isVerified')
    .sort({ trendingScore: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Reel.countDocuments(searchQuery);

  res.status(200).json(
    new ApiResponse(200, "Search results fetched successfully", {
      reels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  );
});

/**
 * @desc Get user's saved reels
 * @route GET /api/reels/saved
 * @access Private
 */
export const getSavedReels = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  const savedReels = await ReelSave.find({ user: userId })
    .populate({
      path: 'reel',
      populate: {
        path: 'user',
        select: 'fullName username profilePicture isVerified',
      },
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ReelSave.countDocuments({ user: userId });

  const reels = savedReels
    .filter(save => save.reel) // Filter out deleted reels
    .map(save => save.reel);

  res.status(200).json(
    new ApiResponse(200, "Saved reels fetched successfully", {
      reels,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  );
});
