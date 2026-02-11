import { Comment } from "../models/comment.model.js";
import { Image } from "../models/image.model.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { updateInteractionPoints } from "../utils/userUpdates.js";
import { moderateComment, addUserWarning } from "../utils/contentModeration.js";

/**
 * @desc Create a new comment
 * @route POST /api/comments/:imageId
 * @access Private
 */
export const createComment = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const { text, parentCommentId } = req.body;
  const userId = req.user._id;

  if (!text) {
    throw new ApiError(400, "Comment text is required");
  }

  // Check if user is banned
  const user = await User.findById(userId);
  if (user?.isBanned) {
    throw new ApiError(403, "Your account has been suspended due to policy violations");
  }

  // Moderate the comment using AI
  const moderation = await moderateComment(text);
  
  if (!moderation.safe) {
    // Add warning to user
    const warningCount = await addUserWarning(User, userId, moderation.reason, 'comment');
    
    // Return error with warning info
    const warningMessage = warningCount >= 3 
      ? "Your account has been suspended due to multiple policy violations."
      : `Your comment was blocked due to ${moderation.reason}. Warning ${warningCount}/3.`;
    
    throw new ApiError(400, warningMessage, {
      blocked: true,
      reason: moderation.reason,
      warningCount
    });
  }

  const comment = await Comment.createComment(userId, imageId, text, parentCommentId);
  
  // Update interaction points for commenting
  await updateInteractionPoints(userId, 'comment');

  // Get image owner to send notification
  const image = await Image.findById(imageId);
  
  if (image) {
    if (parentCommentId) {
      // This is a reply to another comment
      const parentComment = await Comment.findById(parentCommentId).populate('user', 'username');
      
      if (parentComment && parentComment.user._id.toString() !== userId.toString()) {
        // Send notification to parent comment owner about the reply
        await Notification.createNotification({
          recipient: parentComment.user._id,
          sender: userId,
          type: 'reply',
          content: 'replied to your comment',
          relatedImage: imageId,
          relatedComment: parentCommentId
        });
      }
    } else if (image.user.toString() !== userId.toString()) {
      // This is a new comment on the image
      // Send notification to image owner
      await Notification.createNotification({
        recipient: image.user,
        sender: userId,
        type: 'comment',
        content: 'commented on your image',
        relatedImage: imageId,
        relatedComment: comment._id
      });
    }
  }

  res.status(201).json(
    new ApiResponse(201, "Comment created successfully", comment)
  );
});

/**
 * @desc Get comments for an image
 * @route GET /api/comments/:imageId
 * @access Public
 */
export const getImageComments = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await Comment.getImageComments(imageId, page, limit);

  res.status(200).json(
    new ApiResponse(
      200,
      "Comments fetched successfully",
      result.comments,
      result.metadata
    )
  );
});

/**
 * @desc Get replies to a comment
 * @route GET /api/comments/:commentId/replies
 * @access Public
 */
export const getCommentReplies = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const replies = await Comment.find({ parentComment: commentId })
    .populate('user', 'fullName username profilePicture')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Comment.countDocuments({ parentComment: commentId });

  const metadata = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };

  res.status(200).json(
    new ApiResponse(200, "Comment replies fetched successfully", replies, metadata)
  );
});

/**
 * @desc Update a comment
 * @route PATCH /api/comments/:commentId
 * @access Private
 */
export const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { text } = req.body;
  const userId = req.user._id;

  if (!text) {
    throw new ApiError(400, "Comment text is required");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.user.toString() !== userId.toString()) {
    throw new ApiError(403, "Not authorized to update this comment");
  }

  comment.text = text;
  await comment.save();

  res.status(200).json(
    new ApiResponse(200, "Comment updated successfully", comment)
  );
});

/**
 * @desc Delete a comment
 * @route DELETE /api/comments/:commentId
 * @access Private
 */
export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  const comment = await Comment.deleteComment(commentId, userId);

  res.status(200).json(
    new ApiResponse(200, "Comment deleted successfully", comment)
  );
});

/**
 * @desc Toggle like/unlike on a comment
 * @route POST /api/comments/:commentId/like
 * @access Private
 */
export const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  const result = await Comment.toggleLike(commentId, userId);

  // Update interaction points if liked
  if (result.liked) {
    await updateInteractionPoints(userId, 'like');
    
    const comment = await Comment.findById(commentId);
    
    if (comment && comment.user.toString() !== userId.toString()) {
      // Send notification to comment owner
      await Notification.createNotification({
        recipient: comment.user,
        sender: userId,
        type: 'like',
        content: 'liked your comment',
        relatedComment: commentId,
        relatedImage: comment.image
      });
    }
  }

  res.status(200).json(
    new ApiResponse(
      200, 
      result.liked ? "Comment liked successfully" : "Comment unliked successfully",
      result
    )
  );
});

/**
 * @desc Get users who liked a comment
 * @route GET /api/comments/:commentId/likes
 * @access Public
 */
export const getCommentLikes = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const result = await Comment.getLikedUsers(commentId, page, limit);

  res.status(200).json(
    new ApiResponse(
      200,
      "Comment likes fetched successfully",
      result.users,
      result.metadata
    )
  );
});

/**
 * @desc Test content moderation (for testing only)
 * @route POST /api/comments/test-moderation
 * @access Public
 */
export const testModeration = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    throw new ApiError(400, "Text is required");
  }

  console.log('Testing moderation for text:', text);
  const moderation = await moderateComment(text);
  console.log('Moderation result:', moderation);

  res.status(200).json(
    new ApiResponse(200, "Moderation test complete", {
      text,
      safe: moderation.safe,
      reason: moderation.reason,
      scores: moderation.scores
    })
  );
});
