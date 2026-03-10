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
import { analyzeReel, moderateReelContent } from "../utils/aiReelAnalyzer.js";
import { moderateComment, addUserWarning } from "../utils/contentModeration.js";
import { moderateCaption } from "../utils/advancedContentModeration.js";
import { getSmartReelFeed, recordReelInteraction } from "../utils/aiSmartReelRanking.js";

/**
 * @desc Upload a new reel
 * @route POST /api/reels
 * @access Private
 */
export const uploadReel = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { caption, category, tags, visibility, commentsAllowed, duration, aspectRatio, music, skipAI } = req.body;

  if (!req.file) {
    throw new ApiError(400, "Video file is required");
  }

  // Upload video to Cloudinary
  const result = await cloudinary.uploader.upload(req.file.path, {
    resource_type: "video",
    folder: "proconnect/reels",
    eager: [
      { format: "jpg", transformation: [{ width: 400, height: 711, crop: "fill" }] }
    ],
    eager_async: false,
  });

  // Get thumbnail from eager transformation
  const thumbnailUrl = result.eager?.[0]?.secure_url || result.secure_url.replace('.mp4', '.jpg');

  // === NSFW CONTENT MODERATION ===
  // Check video frames for inappropriate content before saving
  console.log('Checking reel for inappropriate content...');
  const contentModResult = await moderateReelContent(result.secure_url, thumbnailUrl);
  
  if (!contentModResult.safe) {
    // Delete the uploaded video from Cloudinary
    await cloudinary.uploader.destroy(result.public_id, { resource_type: 'video' });
    
    throw new ApiError(400, `Content rejected: ${contentModResult.reason || 'This content violates our community guidelines'}. Please upload appropriate content.`);
  }

  // === CAPTION MODERATION ===
  if (caption) {
    const captionModResult = await moderateCaption(caption);
    if (!captionModResult.safe) {
      await cloudinary.uploader.destroy(result.public_id, { resource_type: 'video' });
      throw new ApiError(400, `Caption rejected: ${captionModResult.reason || 'Inappropriate language detected'}. Please use respectful language.`);
    }
  }

  const reel = await Reel.create({
    user: userId,
    caption: caption || '',
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
    aiModerated: true,
    moderationScore: contentModResult.confidence || 0,
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
 * @desc Analyze reel with AI and get suggested metadata
 * @route POST /api/reels/analyze
 * @access Private
 */
export const analyzeReelWithAI = asyncHandler(async (req, res) => {
  const { videoUrl, thumbnailUrl } = req.body;

  if (!videoUrl || !thumbnailUrl) {
    throw new ApiError(400, "Video URL and thumbnail URL are required");
  }

  console.log('AI analyzing reel content...');
  
  // Run AI analysis and content moderation in parallel
  // Use allSettled so a moderation API failure doesn't crash the analyze endpoint
  const [analysisResult, moderationResult] = await Promise.allSettled([
    analyzeReel(videoUrl, thumbnailUrl),
    moderateReelContent(videoUrl, thumbnailUrl)
  ]);

  const analysis = analysisResult.status === 'fulfilled' ? analysisResult.value : null;
  const moderation = moderationResult.status === 'fulfilled' ? moderationResult.value : { safe: true, confidence: 0, category: 'safe' };

  if (!moderation.safe) {
    throw new ApiError(400, `Content may violate guidelines: ${moderation.reason}. Consider uploading different content.`);
  }

  res.status(200).json(
    new ApiResponse(200, "Reel analyzed successfully", {
      suggestions: analysis,
      moderation: {
        safe: moderation.safe,
        confidence: moderation.confidence,
        category: moderation.category
      }
    })
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
 * @desc Get reels feed (infinite scroll) - AI-powered personalized ranking
 * @route GET /api/reels/feed
 * @access Private
 */
export const getReelsFeed = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const { category } = req.query;

  // Use AI-powered smart feed ranking
  const smartFeedResult = await getSmartReelFeed(userId.toString(), {
    page,
    limit,
    category
  });

  if (!smartFeedResult.success) {
    throw new ApiError(500, "Failed to fetch reels feed");
  }

  // Get like, save, and follow status for each reel
  const reelsWithStatus = await Promise.all(
    smartFeedResult.reels.map(async (reel) => {
      const isLiked = await ReelLike.exists({ user: userId, reel: reel._id });
      const isSaved = await ReelSave.exists({ user: userId, reel: reel._id });
      const isFollowingUser = reel.user?._id 
        ? await Follow.exists({ follower: userId, following: reel.user._id })
        : false;
      
      return {
        ...reel,
        isLiked: !!isLiked,
        isSaved: !!isSaved,
        user: reel.user ? {
          ...reel.user,
          isFollowing: !!isFollowingUser,
        } : reel.user,
      };
    })
  );

  res.status(200).json(
    new ApiResponse(200, "Reels feed fetched successfully", {
      reels: reelsWithStatus,
      pagination: {
        page,
        limit,
        total: smartFeedResult.metadata.total,
        pages: smartFeedResult.metadata.pages,
        hasMore: smartFeedResult.metadata.hasNextPage,
      },
      // Include AI debug info in development
      ...(process.env.NODE_ENV !== 'production' && { aiDebug: smartFeedResult.debug })
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

  // Get like and save status (isFollowing is always true since this is following feed)
  const reelsWithStatus = await Promise.all(
    reels.map(async (reel) => {
      const isLiked = await ReelLike.exists({ user: userId, reel: reel._id });
      const isSaved = await ReelSave.exists({ user: userId, reel: reel._id });
      const reelObj = reel.toObject();
      
      return {
        ...reelObj,
        isLiked: !!isLiked,
        isSaved: !!isSaved,
        user: reelObj.user ? {
          ...reelObj.user,
          isFollowing: true, // Always true in following feed
        } : reelObj.user,
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

    // Decrement reel owner's likesCount
    await User.findByIdAndUpdate(reel.user, { $inc: { likesCount: -1 } });

    res.status(200).json(
      new ApiResponse(200, "Reel unliked", { isLiked: false, likesCount: reel.likesCount })
    );
  } else {
    // Like
    await ReelLike.create({ user: userId, reel: reelId });
    reel.likesCount += 1;
    reel.trendingScore = reel.calculateTrendingScore();
    await reel.save();

    // Increment reel owner's likesCount
    await User.findByIdAndUpdate(reel.user, { $inc: { likesCount: 1 } });

    // Update badge for the reel owner based on likes
    await updateUserBadge(reel.user);

    // Send notification if not liking own reel
    if (reel.user.toString() !== userId.toString()) {
      await Notification.createNotification({
        recipient: reel.user,
        sender: userId,
        type: 'reel_like',
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
  const { text, parentCommentId, mentions } = req.body;
  const userId = req.user._id;

  const reel = await Reel.findById(reelId);
  if (!reel) {
    throw new ApiError(404, "Reel not found");
  }

  if (!reel.commentsAllowed) {
    throw new ApiError(403, "Comments are disabled for this reel");
  }

  // Check if user is banned
  const user = await User.findById(userId);
  if (user?.isBanned) {
    throw new ApiError(403, "Your account has been suspended due to policy violations");
  }

  // === COMMENT TOXICITY MODERATION (same as posts) ===
  const moderation = await moderateComment(text);
  
  // Calculate toxicity level for display (0-100 scale)
  const toxicityScore = Math.round((moderation.scores?.TOXICITY || 0) * 100);
  
  if (!moderation.safe) {
    // Add warning to user
    const warningCount = await addUserWarning(User, userId, moderation.reason, 'reel_comment');
    
    // Return error with toxicity info
    const warningMessage = warningCount >= 3 
      ? "Your account has been suspended due to multiple policy violations."
      : `Your comment was blocked due to ${moderation.reason}. Warning ${warningCount}/3.`;
    
    throw new ApiError(400, warningMessage, {
      blocked: true,
      reason: moderation.reason,
      warningCount,
      toxicityScore
    });
  }

  const commentData = {
    user: userId,
    reel: reelId,
    text,
    mentions: mentions || [],
    moderationScore: toxicityScore,
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

  // Update reel comments count only for top-level comments (not replies)
  if (!parentCommentId) {
    reel.commentsCount += 1;
    reel.trendingScore = reel.calculateTrendingScore();
    await reel.save();
  }

  // Send notification
  if (reel.user.toString() !== userId.toString()) {
    await Notification.createNotification({
      recipient: reel.user,
      sender: userId,
      type: 'reel_comment',
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

  // Get the likes count before deleting to update user stats
  const reelLikesCount = reel.likesCount || 0;

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

  // Update user's stats: decrement postsCount and likesCount
  await User.findByIdAndUpdate(userId, { 
    $inc: { 
      postsCount: -1,
      likesCount: -reelLikesCount
    } 
  });

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

/**
 * @desc Like/Unlike a reel comment
 * @route POST /api/reels/comments/:commentId/like
 * @access Private
 */
export const toggleLikeComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  const comment = await ReelComment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Use a simple array field for likedBy - we'll add this dynamically
  const likedBySet = new Set(comment.likedBy?.map(id => id.toString()) || []);
  const userIdStr = userId.toString();

  let isLiked;
  if (likedBySet.has(userIdStr)) {
    // Unlike
    likedBySet.delete(userIdStr);
    isLiked = false;
  } else {
    // Like
    likedBySet.add(userIdStr);
    isLiked = true;
  }

  comment.likedBy = Array.from(likedBySet);
  comment.likesCount = likedBySet.size;
  await comment.save();

  res.status(200).json(
    new ApiResponse(200, isLiked ? "Comment liked" : "Comment unliked", {
      isLiked,
      likesCount: comment.likesCount,
    })
  );
});

/**
 * @desc Get replies for a comment
 * @route GET /api/reels/comments/:commentId/replies
 * @access Public
 */
export const getCommentReplies = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const replies = await ReelComment.find({
    parentComment: commentId,
  })
    .populate('user', 'fullName username profilePicture isVerified')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);

  const total = await ReelComment.countDocuments({ parentComment: commentId });

  res.status(200).json(
    new ApiResponse(200, "Replies fetched successfully", {
      replies,
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
 * @desc Delete a reel comment
 * @route DELETE /api/reels/comments/:commentId
 * @access Private
 */
export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  const comment = await ReelComment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check authorization
  const reel = await Reel.findById(comment.reel);
  if (comment.user.toString() !== userId.toString() && reel?.user.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized to delete this comment");
  }

  // If it's a parent comment, delete all replies
  if (!comment.parentComment) {
    await ReelComment.deleteMany({ parentComment: commentId });
  } else {
    // Decrement parent's reply count
    await ReelComment.findByIdAndUpdate(comment.parentComment, {
      $inc: { repliesCount: -1 },
    });
  }

  await ReelComment.deleteOne({ _id: commentId });

  // Update reel comment count only for top-level comments (not replies)
  if (reel && !comment.parentComment) {
    reel.commentsCount = Math.max(0, reel.commentsCount - 1);
    await reel.save();
  }

  res.status(200).json(
    new ApiResponse(200, "Comment deleted successfully")
  );
});

/**
 * @desc Search users for @mention (autocomplete)
 * @route GET /api/reels/mentions/search
 * @access Private
 */
export const searchUsersForMention = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const currentUserId = req.user._id;

  // Get people the current user follows — these are prioritised for @mentions
  const followingDocs = await Follow.find({ follower: currentUserId })
    .select('following')
    .populate('following', '_id fullName username profilePicture isVerified');

  const following = followingDocs.map(f => f.following).filter(Boolean);

  if (!query || query.trim().length === 0) {
    // No query — return all following (up to 10) so they show right after typing @
    return res.status(200).json(
      new ApiResponse(200, "Users fetched for mention", following.slice(0, 10))
    );
  }

  // Filter following list by query
  const q = query.toLowerCase();
  const matchingFollowing = following.filter(
    u => u.username?.toLowerCase().includes(q) || u.fullName?.toLowerCase().includes(q)
  );

  if (matchingFollowing.length >= 5) {
    return res.status(200).json(
      new ApiResponse(200, "Users fetched for mention", matchingFollowing.slice(0, 10))
    );
  }

  // Supplement with general user search if not enough following matches
  const followingIds = following.map(f => f._id);
  const extraUsers = await User.find({
    _id: { $nin: [...followingIds, currentUserId] },
    $or: [
      { username: { $regex: query, $options: 'i' } },
      { fullName: { $regex: query, $options: 'i' } },
    ],
  })
    .select('_id fullName username profilePicture isVerified')
    .limit(10 - matchingFollowing.length);

  res.status(200).json(
    new ApiResponse(200, "Users fetched for mention", [...matchingFollowing, ...extraUsers])
  );
});

/**
 * @desc Check comment text for toxicity (real-time)
 * @route POST /api/reels/comments/check-toxicity
 * @access Private
 */
export const checkCommentToxicity = asyncHandler(async (req, res) => {
  const { text } = req.body;
  
  if (!text || text.trim().length === 0) {
    return res.status(200).json(
      new ApiResponse(200, "No text to analyze", { 
        toxicityScore: 0, 
        safe: true,
        level: 'safe'
      })
    );
  }

  const moderation = await moderateComment(text);
  const toxicityScore = Math.round((moderation.scores?.TOXICITY || 0) * 100);
  
  // Determine level for UI display
  let level = 'safe';
  if (toxicityScore >= 70) {
    level = 'high';
  } else if (toxicityScore >= 40) {
    level = 'medium';
  } else if (toxicityScore >= 20) {
    level = 'low';
  }

  res.status(200).json(
    new ApiResponse(200, "Toxicity check complete", {
      toxicityScore,
      safe: moderation.safe,
      level,
      reason: moderation.reason || null
    })
  );
});
