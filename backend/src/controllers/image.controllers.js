import { Image } from "../models/image.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import cloudinary from "../config/cloudinary.js";
import { User } from "../models/user.model.js";
import { updateUserBadge } from "../utils/userUpdates.js";
import { Follow } from "../models/follow.model.js";
import { Review } from "../models/review.model.js";
import { Report } from "../models/report.model.js";
import { Notification } from "../models/notification.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { Favorite } from "../models/favorite.model.js";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { analyzeImage } from "../utils/aiImageAnalysis.js";
import { moderateImage, addUserWarning } from "../utils/contentModeration.js";
import { chatWithAssistant, suggestCaptions } from "../utils/aiChatAssistant.js";
import { checkCopyright, storeImageHash } from "../utils/aiCopyrightDetection.js";
import { semanticSearch, findSimilarImages, getSearchSuggestions } from "../utils/aiSemanticSearch.js";
import { getSmartFeed, getForYouRecommendations } from "../utils/aiSmartFeedRanking.js";


// Get image by ID
// Get all public images with pagination
// Get logged in user's images
// Get user's public images
// Update image
// Delete image
// Search images
// Get trending images
// Get images by tag

/**
 * @desc Get image by ID
 * @route GET /api/images/:imageId
 * @access Private
 */
export const getImage = asyncHandler(async (req, res) => {
  const { imageId } = req.params;

  const image = await Image.findById(imageId)
    .populate("user", "fullName username profilePicture")

  if (!image) {
    throw new ApiError(404, "Image not found");
  }

  // Check visibility permissions
  if (image.visibility !== "public") {
    // If not public, user must be logged in
    if (!req.user) {
      throw new ApiError(403, "Access denied to non-public image");
    }

    // If private, only the owner can access
    if (image.visibility === "private" && image.user._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Access denied to private image");
    }

    // If followers-only, check if user is following the image owner
    if (image.visibility === "followers" && image.user._id.toString() !== req.user._id.toString()) {
      const isFollowing = await Follow.checkFollowStatus(req.user._id, image.user._id);
      if (!isFollowing) {
        throw new ApiError(403, "Access denied: you must follow this user to view this image");
      }
    }
  }

  res.status(200).json(
    new ApiResponse(200, "Image fetched successfully", image)
  );
});

/**
 * @desc Get all public images with pagination
 * @route GET /api/images/public
 * @access Private
 */
export const getAllImages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { category } = req.query;

  // Base query for public images
  let query = { visibility: "public" };
  
  // Add category filter if provided and not 'all'
  if (category && category !== 'all') {
    query.category = category;
  }
  
  // If logged in, also include "followers" visibility images from users the requester follows
  // and all images owned by the requesting user
  if (req.user) {
    const followingList = await Follow.find({ follower: req.user._id }).select("following");
    const followingIds = followingList.map(follow => follow.following);
    
    // Build the query with category filter if it exists
    if (category && category !== 'all') {
      query = {
        category,
        $or: [
          { visibility: "public" },
          { 
            visibility: "followers", 
            user: { $in: followingIds } 
          },
          { user: req.user._id } // Include all of the user's own images
        ]
      };
    } else {
      // Show public images + follower-only images from users being followed + all user's own images
      query = {
        $or: [
          { visibility: "public" },
          { 
            visibility: "followers", 
            user: { $in: followingIds } 
          },
          { user: req.user._id } // Include all of the user's own images
        ]
      };
    }
  }

  const images = await Image.find(query)
    .populate("user", "username profilePicture")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Image.countDocuments(query);

  const metadata = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };

  res.status(200).json(
    new ApiResponse(200, "Images fetched successfully", images, metadata)
  );
});

/**
 * @desc Get logged in user's images
 * @route GET /api/images/me
 * @access Private
 */
export const getUserImages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const images = await Image.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Image.countDocuments({ user: req.user._id });

  const metadata = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };

  res.status(200).json(
    new ApiResponse(200, "User images fetched successfully", images, metadata)
  );
});

/**
 * @desc Get user's public images
 * @route GET /api/images/user/:userId
 * @access Private
 */
export const getUserPublicImages = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { category } = req.query;

  // Base query for public images
  let query = { 
    user: userId,
    visibility: "public" 
  };
  
  // Add category filter if provided and not 'all'
  if (category && category !== 'all') {
    query.category = category;
  }
  
  // If logged in, check if user is following the requested user
  if (req.user) {
    // If requesting their own images, show all
    if (req.user._id.toString() === userId) {
      query = { user: userId };
      
      // Add category filter if provided
      if (category && category !== 'all') {
        query.category = category;
      }
    } else {
      // Check if following the user to include "followers" visibility
      const isFollowing = await Follow.checkFollowStatus(req.user._id, userId);
      if (isFollowing) {
        // Build the query with category filter if it exists
        if (category && category !== 'all') {
          query = { 
            user: userId,
            category,
            $or: [
              { visibility: "public" },
              { visibility: "followers" }
            ]
          };
        } else {
          query = { 
            user: userId,
            $or: [
              { visibility: "public" },
              { visibility: "followers" }
            ]
          };
        }
      }
    }
  }

  const images = await Image.find(query)
    .populate("user", "username profilePicture fullName")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Image.countDocuments(query);

  const metadata = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };

  res.status(200).json(
    new ApiResponse(200, "User images fetched successfully", images, metadata)
  );
});

/**
 * @desc Update image
 * @route PATCH /api/images/:imageId
 * @access Private
 */
export const updateImage = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const updates = req.body;

  const image = await Image.findById(imageId);

  if (!image) {
    throw new ApiError(404, "Image not found");
  }

  if (image.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to update this image");
  }

  Object.assign(image, updates);
  await image.save();
  // Ensure user details remain available after update
  await image.populate("user", "username profilePicture fullName");

  res.status(200).json(
    new ApiResponse(200, "Image updated successfully", image)
  );
});

/**
 * @desc Delete image
 * @route DELETE /api/images/:imageId
 * @access Private
 */
export const deleteImage = asyncHandler(async (req, res) => {
  const { imageId } = req.params;

  const image = await Image.findById(imageId);

  if (!image) {
    throw new ApiError(404, "Image not found");
  }

  if (image.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not authorized to delete this image");
  }

  // Delete the image from Cloudinary
  if (image.publicId) {
    await cloudinary.uploader.destroy(image.publicId);
  }

  // Get the likes count before deleting to update user stats
  const imageLikesCount = image.likesCount || 0;
  const imageSize = image.imageSize || 0;

  // Delete related data
  await Like.deleteMany({ image: imageId });
  await Comment.deleteMany({ image: imageId });
  await Favorite.deleteMany({ image: imageId });

  await image.deleteOne();

  // Update user stats: decrement postsCount, likesCount, and storageUsed
  await User.findByIdAndUpdate(req.user._id, { 
    $inc: { 
      postsCount: -1,
      likesCount: -imageLikesCount,
      storageUsed: -imageSize
    } 
  });
  
  // Update user badge after post count change
  await updateUserBadge(req.user._id);

  res.status(200).json(
    new ApiResponse(200, "Image deleted successfully")
  );
});

/**
 * @desc Search images
 * @route GET /api/images/search/query
 * @access Private
 */
export const searchImages = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!q) {
    throw new ApiError(400, "Search query is required");
  }

  // Set up base search query for public images
  let searchQuery = {
    visibility: "public",
    $or: [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { tags: { $in: [new RegExp(q, "i")] } }
    ]
  };

  // If user is logged in, also include followers-only images from people they follow
  // and all of the user's own images
  if (req.user) {
    const followingList = await Follow.find({ follower: req.user._id }).select("following");
    const followingIds = followingList.map(follow => follow.following);
    
    searchQuery = {
      $or: [
        // Public images
        {
          visibility: "public",
          $or: [
            { title: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
            { tags: { $in: [new RegExp(q, "i")] } }
          ]
        },
        // Followers-only images from people the user follows
        {
          visibility: "followers",
          user: { $in: followingIds },
          $or: [
            { title: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
            { tags: { $in: [new RegExp(q, "i")] } }
          ]
        },
        // All of the user's own images
        {
          user: req.user._id,
          $or: [
            { title: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } },
            { tags: { $in: [new RegExp(q, "i")] } }
          ]
        }
      ]
    };
  }

  const images = await Image.find(searchQuery)
    .populate("user", "username profilePicture")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Image.countDocuments(searchQuery);

  const metadata = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };

  res.status(200).json(
    new ApiResponse(200, "Search results fetched successfully", images, metadata)
  );
});

/**
 * @desc Get trending images
 * @route GET /api/images/discover/trending
 * @access Private
 */
export const getTrendingImages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { category } = req.query;
  // Base query for public images
  let query = { visibility: "public" };
  
  // Add category filter if provided and not 'all'
  if (category && category !== 'all') {
    query.category = category;
  }
  
  // If logged in, include followers-only images from people they follow
  // and all images owned by the requesting user
  if (req.user) {
    const followingList = await Follow.find({ follower: req.user._id }).select("following");
    const followingIds = followingList.map(follow => follow.following);
    
    // Build the query with category filter if it exists
    if (category && category !== 'all') {
      query = {
        category,
        $or: [
          { visibility: "public" },
          { 
            visibility: "followers", 
            user: { $in: followingIds } 
          },
          { user: req.user._id } // Include all of the user's own images
        ]
      };
    } else {
      query = {
        $or: [
          { visibility: "public" },
          { 
            visibility: "followers", 
            user: { $in: followingIds } 
          },
          { user: req.user._id } // Include all of the user's own images
        ]
      };
    }
  }

  const images = await Image.find(query)
    .populate("user", "username profilePicture")
    .sort({ 
      likesCount: -1,
      commentsCount: -1,
      favoritesCount: -1,
      createdAt: -1 
    })
    .skip(skip)
    .limit(limit);

  const total = await Image.countDocuments(query);

  const metadata = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };

  res.status(200).json(
    new ApiResponse(200, "Trending images fetched successfully", images, metadata)
  );
});

/**
 * @desc Get images by tag
 * @route GET /api/images/tags/:tag
 * @access Private
 */
export const getImagesByTag = asyncHandler(async (req, res) => {
  const { tag } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { category } = req.query;

  // Base query for public images with the tag
  let query = { 
    tags: { $in: [tag.toLowerCase()] },
    visibility: "public" 
  };
  
  // Add category filter if provided and not 'all'
  if (category && category !== 'all') {
    query.category = category;
  }
  
  // If logged in, include followers-only images from people they follow
  // and all of the user's own images with the tag
  if (req.user) {
    const followingList = await Follow.find({ follower: req.user._id }).select("following");
    const followingIds = followingList.map(follow => follow.following);
    
    // Build the query with category filter if it exists
    if (category && category !== 'all') {
      query = {
        tags: { $in: [tag.toLowerCase()] },
        category,
        $or: [
          { visibility: "public" },
          { 
            visibility: "followers", 
            user: { $in: followingIds } 
          },
          { user: req.user._id } // Include all of the user's own images with the tag
        ]
      };
    } else {
      query = {
        tags: { $in: [tag.toLowerCase()] },
        $or: [
          { visibility: "public" },
          { 
            visibility: "followers", 
            user: { $in: followingIds } 
          },
          { user: req.user._id } // Include all of the user's own images with the tag
        ]
      };
    }
  }

  const images = await Image.find(query)
    .populate("user", "username profilePicture fullName")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Image.countDocuments(query);

  const metadata = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };

  res.status(200).json(
    new ApiResponse(200, "Images by tag fetched successfully", images, metadata)
  );
});

/**
 * @desc Get reviews for an image
 * @route GET /api/images/:imageId/reviews
 * @access Private
 */
export const getImageReviews = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const reviews = await Review.find({ image: imageId })
    .populate('user', 'username profilePicture fullName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Review.countDocuments({ image: imageId });

  const metadata = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };

  res.status(200).json(
    new ApiResponse(200, "Reviews fetched successfully", reviews, metadata)
  );
});

/**
 * @desc Get review stats for an image
 * @route GET /api/images/:imageId/reviews/stats
 * @access Private
 */
export const getImageReviewStats = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const stats = await Review.getStatsForImage(imageId);
  res.status(200).json(
    new ApiResponse(200, "Review stats fetched successfully", stats)
  );
});

/**
 * @desc Create or update a review for an image
 * @route POST /api/images/:imageId/reviews
 * @access Private
 */
export const upsertImageReview = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  // Ensure image exists and visibility allows current user (reuse getImage logic minimally)
  const image = await Image.findById(imageId).populate('user', '_id');
  if (!image) {
    throw new ApiError(404, "Image not found");
  }

  const review = await Review.findOneAndUpdate(
    { image: imageId, user: req.user._id },
    { rating, comment: comment || '' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await review.populate('user', 'username profilePicture fullName');

  res.status(200).json(
    new ApiResponse(200, "Review saved successfully", review)
  );
});

/**
 * @desc Delete current user's review for an image
 * @route DELETE /api/images/:imageId/reviews
 * @access Private
 */
export const deleteImageReview = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  await Review.findOneAndDelete({ image: imageId, user: req.user._id });
  res.status(200).json(
    new ApiResponse(200, "Review deleted successfully")
  );
});

/**
 * @desc Report an image
 * @route POST /api/images/:imageId/report
 * @access Private
 */
export const reportImage = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const { message } = req.body;

  if (!message || message.trim().length === 0) {
    throw new ApiError(400, "Report message is required");
  }

  const image = await Image.findById(imageId).populate('user', '_id');
  if (!image) {
    throw new ApiError(404, "Image not found");
  }

  if (image.user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You cannot report your own image");
  }

  let report;
  try {
    report = await Report.create({
      image: imageId,
      reporter: req.user._id,
      owner: image.user._id,
      message: message.trim(),
      status: 'open',
    });
  } catch (e) {
    // Handle duplicate open report unique index
    throw new ApiError(400, "You already have an open report for this image");
  }

  // Notify the image owner
  await Notification.createNotification({
    recipient: image.user._id,
    sender: req.user._id,
    type: 'report',
    content: 'Your image was reported. Please correct it to avoid account action.',
    relatedImage: image._id,
    relatedUser: req.user._id,
  });

  res.status(201).json(
    new ApiResponse(201, "Report submitted successfully", report)
  );
});

/**
 * @desc Upload an image file to Cloudinary and save details to database
 * @route POST /api/images/upload
 * @access Private
 */
export const uploadImageFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No image file provided");
  }

  const { 
    title, 
    description, 
    tags, 
    visibility, 
    category,
    license,
    imageSize,
    commentsAllowed,
  } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  // Check user's storage limit for non-premium users (10MB = 10240KB)
  const STORAGE_LIMIT = 10240; // 10MB in KB
  
  if (!req.user.isPremium) {
    const currentStorage = req.user.storageUsed || 0;
    const fileSize = parseInt(imageSize) || 0;
    
    if (currentStorage + fileSize > STORAGE_LIMIT) {
      // If the user would exceed their storage limit with this upload
      throw new ApiError(400, "Storage limit reached (10MB). Please upgrade to premium to upload more images.");
    }
  }

  // The file is already uploaded to cloudinary by multer-storage-cloudinary
  const imageUrl = req.file.path;
  const publicId = req.file.filename;

  // === NSFW CONTENT MODERATION ===
  // Check image for inappropriate content before saving
  console.log('Checking image for inappropriate content...');
  const contentModResult = await moderateImage(imageUrl);
  
  if (!contentModResult.safe) {
    // Delete the uploaded image from Cloudinary
    await cloudinary.uploader.destroy(publicId);
    
    // Add warning to user
    const warningCount = await addUserWarning(User, req.user._id, contentModResult.reason, 'image');
    
    const warningMessage = warningCount >= 3 
      ? "Your account has been suspended due to multiple policy violations."
      : `Content rejected: ${contentModResult.reason || 'This content violates our community guidelines'}. Warning ${warningCount}/3.`;
    
    throw new ApiError(400, warningMessage);
  }

  // === TEXT CONTENT MODERATION ===
  // Check title and description for inappropriate language
  const { moderateComment } = await import('../utils/contentModeration.js');
  
  const titleCheck = await moderateComment(title);
  if (!titleCheck.safe) {
    await cloudinary.uploader.destroy(publicId);
    throw new ApiError(400, `Title rejected: ${titleCheck.reason || 'Inappropriate language detected'}. Please use respectful language.`);
  }
  
  const descCheck = await moderateComment(description);
  if (!descCheck.safe) {
    await cloudinary.uploader.destroy(publicId);
    throw new ApiError(400, `Description rejected: ${descCheck.reason || 'Inappropriate language detected'}. Please use respectful language.`);
  }

  // Parse tags if they're sent as a string
  let parsedTags = [];
  if (tags) {
    try {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    } catch (error) {
      parsedTags = tags.split(',').map(tag => tag.trim());
    }
  }

  const image = await Image.create({
    user: req.user._id,
    title,
    description,
    imageUrl,
    publicId,
    category: category || 'other',
    license: license || 'standard',
    tags: parsedTags,
    imageSize,
    commentsAllowed: commentsAllowed ?? true,
    visibility: visibility || 'public',
  });

  await User.findByIdAndUpdate(req.user._id, { 
    $inc: { 
      postsCount: 1, 
      storageUsed: imageSize // Increment storage used by the image size
    } 
  });

  // Update user badge after post count change
  await updateUserBadge(req.user._id);

  await image.populate("user", "username profilePicture");

  res.status(201).json(
    new ApiResponse(201, "Image uploaded successfully", image)
  );
});

/**
 * @desc Upload a temporary image file to Cloudinary before form submission
 * @route POST /api/images/upload-temp
 * @access Private
 */
export const uploadTempImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No image file provided");
  }

  // Check storage limit for non-premium users (10MB = 10240KB)
  const STORAGE_LIMIT = 10240; // 10MB in KB
  
  if (!req.user.isPremium) {
    const currentStorage = req.user.storageUsed || 0;
    const fileSize = req.file.size ? Math.round(req.file.size / 1024) : 0; // Convert to KB
    
    if (currentStorage + fileSize > STORAGE_LIMIT) {
      // Delete the uploaded file from cloudinary since we're rejecting it
      if (req.file.filename) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      throw new ApiError(400, "Storage limit reached (10MB). Please upgrade to premium to upload more images.");
    }
  }

  // The file is already uploaded to cloudinary by multer-storage-cloudinary
  const imageUrl = req.file.path;
  const publicId = req.file.filename;
  const fileSize = req.file.size ? Math.round(req.file.size / 1024) : 0; // Size in KB

  // Moderate the image for NSFW content
  console.log('Moderating uploaded image for NSFW content...');
  const moderation = await moderateImage(imageUrl);
  
  if (!moderation.safe) {
    // Delete the uploaded image from cloudinary since it violates policy
    await cloudinary.uploader.destroy(publicId);
    
    // Add warning to user
    const warningCount = await addUserWarning(User, req.user._id, moderation.reason, 'image');
    
    const warningMessage = warningCount >= 3 
      ? "Your account has been suspended due to multiple policy violations."
      : `Image blocked: ${moderation.reason}. Warning ${warningCount}/3. Please upload appropriate content.`;
    
    throw new ApiError(400, warningMessage, {
      blocked: true,
      reason: moderation.reason,
      warningCount
    });
  }

  res.status(200).json(
    new ApiResponse(200, "Temporary image uploaded successfully", {
      imageUrl,
      publicId,
      imageSize: fileSize
    })
  );
});

/**
 * @desc Delete an image from Cloudinary
 * @route DELETE /api/images/cloudinary/:publicId
 * @access Private
 */
export const deleteCloudinaryImage = asyncHandler(async (req, res) => {
  const { publicId } = req.params;

  if (!publicId) {
    throw new ApiError(400, "Public ID is required");
  }

  // Delete from cloudinary
  await cloudinary.uploader.destroy(publicId);

  res.status(200).json(
    new ApiResponse(200, "Image deleted from Cloudinary successfully")
  );
});

/**
 * @desc Get stories from followed users + self (non-expired, within 24h)
 * @route GET /api/images/stories
 * @access Private
 */
export const getStories = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const following = await Follow.find({ follower: userId }).select('following');
  const followingIds = [...following.map(f => f.following), userId];
  const now = new Date();

  const stories = await Image.find({
    user: { $in: followingIds },
    isStory: true,
    $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }],
  })
    .populate('user', 'username profilePicture fullName')
    .sort({ createdAt: -1 })
    .limit(100);

  // Group by user
  const grouped = [];
  const seen = new Set();
  stories.forEach(story => {
    const uid = story.user._id.toString();
    if (!seen.has(uid)) {
      seen.add(uid);
      grouped.push({
        _id: uid,
        user: story.user,
        images: stories.filter(s => s.user._id.toString() === uid),
        viewed: false,
      });
    }
  });

  res.status(200).json(new ApiResponse(200, "Stories fetched successfully", grouped));
});

/**
 * @desc Save image details after temporary upload
 * @route POST /api/images/save-details
 * @access Private
 */
export const saveImageDetails = asyncHandler(async (req, res) => {
  const { 
    publicId, 
    imageUrl,
    title, 
    description, 
    tags, 
    visibility, 
    category,
    license,
    imageSize,
    commentsAllowed,
    altText,
    aiGenerated,
    isStory,
  } = req.body;

  if (!publicId || !imageUrl || (!isStory && (!title || !description))) {
    throw new ApiError(400, "Missing required image information");
  }

  // Check user's storage limit for non-premium users (10MB = 10240KB)
  const STORAGE_LIMIT = 10240; // 10MB in KB
  
  if (!req.user.isPremium) {
    const currentStorage = req.user.storageUsed || 0;
    const fileSize = parseInt(imageSize) || 0;
    
    if (currentStorage + fileSize > STORAGE_LIMIT) {
      // If the user would exceed their storage limit with this upload
      throw new ApiError(400, "Storage limit reached (10MB). Please upgrade to premium to upload more images.");
    }
  }

  // Create the image record in the database
  const image = await Image.create({
    user: req.user._id,
    title: isStory ? (title || 'Story') : title,
    description: isStory ? (description || 'Story') : description,
    imageUrl,
    publicId,
    category: category || 'other',
    license: license || 'standard',
    tags: tags || [],
    imageSize,
    commentsAllowed: commentsAllowed ?? true,
    visibility: visibility || 'public',
    altText: altText || '',
    aiGenerated: aiGenerated || false,
    isStory: !!isStory,
    expiresAt: isStory ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
  });

  if (!isStory) {
    await User.findByIdAndUpdate(req.user._id, { 
      $inc: { 
        postsCount: 1, 
        storageUsed: imageSize // Increment storage used by the image size
      } 
    });
  } else {
    await User.findByIdAndUpdate(req.user._id, { 
      $inc: { storageUsed: imageSize } 
    });
  }

  // Update user badge after post count change
  await updateUserBadge(req.user._id);

  await image.populate("user", "username profilePicture");

  res.status(201).json(
    new ApiResponse(201, "Image details saved successfully", image)
  );
});

/**
 * @desc Get popular tags
 * @route GET /api/images/tags/popular
 * @access Private
 */
export const getPopularTags = asyncHandler(async (req, res) => {
  const { limit = 30 } = req.query;
  
  // Find all public images (and followers-only/private if user is logged in)
  let query = { visibility: "public" };
  
  if (req.user) {
    const followingList = await Follow.find({ follower: req.user._id }).select("following");
    const followingIds = followingList.map(follow => follow.following);
    
    query = {
      $or: [
        { visibility: "public" },
        { 
          visibility: "followers", 
          user: { $in: followingIds } 
        },
        { user: req.user._id }
      ]
    };
  }
  
  // Aggregate to get tag frequency
  const tagAggregation = await Image.aggregate([
    { $match: query },
    { $unwind: "$tags" },
    { 
      $group: { 
        _id: "$tags", 
        count: { $sum: 1 },
        // Get a sample image for each tag
        sampleImage: { $first: "$imageUrl" }
      } 
    },
    { $sort: { count: -1 } },
    { $limit: parseInt(limit) }
  ]);
  
  // Format tags for response
  const popularTags = tagAggregation.map(tag => ({
    name: tag._id,
    count: tag.count,
    sampleImage: tag.sampleImage
  }));
  
  res.status(200).json(
    new ApiResponse(200, "Popular tags fetched successfully", popularTags)
  );
});

/**
 * @desc Search tags
 * @route GET /api/images/tags/search
 * @access Private
 */
export const searchTags = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const { limit = 20 } = req.query;
  
  if (!query) {
    throw new ApiError(400, "Search query is required");
  }
  
  // Find all public images (and followers-only/private if user is logged in)
  let imageQuery = { visibility: "public" };
  
  if (req.user) {
    const followingList = await Follow.find({ follower: req.user._id }).select("following");
    const followingIds = followingList.map(follow => follow.following);
    
    imageQuery = {
      $or: [
        { visibility: "public" },
        { 
          visibility: "followers", 
          user: { $in: followingIds } 
        },
        { user: req.user._id }
      ]
    };
  }
  
  // Aggregate to get tag frequency for tags matching the query
  const tagAggregation = await Image.aggregate([
    { $match: imageQuery },
    { $unwind: "$tags" },
    { $match: { tags: { $regex: query, $options: "i" } } }, // Filter tags matching the query
    { 
      $group: { 
        _id: "$tags", 
        count: { $sum: 1 },
        // Get a sample image for each tag
        sampleImage: { $first: "$imageUrl" }
      } 
    },
    { $sort: { count: -1 } },
    { $limit: parseInt(limit) }
  ]);
  
  // Format tags for response
  const matchingTags = tagAggregation.map(tag => ({
    name: tag._id,
    count: tag.count,
    sampleImage: tag.sampleImage
  }));
  
  res.status(200).json(
    new ApiResponse(200, "Matching tags fetched successfully", matchingTags)
  );
});

/**
 * @desc Get trending search terms
 * @route GET /api/images/trending-searches
 * @access Private
 */
export const getTrendingSearches = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  // This would typically be implemented with a real-time analytics system
  // For demonstration, we'll return popular tags as trending searches
  // In a production environment, you would track and store search queries
  
  // For now, we'll use the popular tags as a proxy for trending searches
  const tagAggregation = await Image.aggregate([
    { $match: { visibility: "public" } },
    { $unwind: "$tags" },
    { 
      $group: { 
        _id: "$tags", 
        count: { $sum: 1 },
      } 
    },
    { $sort: { count: -1 } },
    { $limit: parseInt(limit) }
  ]);
  
  // Format trending searches for response
  const trendingSearches = tagAggregation.map(tag => ({
    query: tag._id,
    count: `${tag.count} searches today`
  }));
  
  res.status(200).json(
    new ApiResponse(200, "Trending searches fetched successfully", trendingSearches)
  );
});

/**
 * @desc Get users who liked an image
 * @route GET /api/images/:imageId/likes
 * @access Private
 */
export const getImageLikers = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Ensure image exists and visibility allows current user (mirror getImage checks)
  const image = await Image.findById(imageId).populate("user", "_id");
  if (!image) {
    throw new ApiError(404, "Image not found");
  }

  if (image.visibility !== "public") {
    if (!req.user) {
      throw new ApiError(403, "Access denied to non-public image");
    }
    if (image.visibility === "private" && image.user._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Access denied to private image");
    }
    if (image.visibility === "followers" && image.user._id.toString() !== req.user._id.toString()) {
      const isFollowing = await Follow.checkFollowStatus(req.user._id, image.user._id);
      if (!isFollowing) {
        throw new ApiError(403, "Access denied: you must follow this user to view this image");
      }
    }
  }

  const likes = await Like.find({ image: imageId })
    .populate("user", "username profilePicture fullName")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Like.countDocuments({ image: imageId });

  const metadata = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };

  // Map to just users for a cleaner payload on the client
  const likers = likes.map(like => like.user);

  res.status(200).json(
    new ApiResponse(200, "Image likers fetched successfully", likers, metadata)
  );
});

/**
 * @desc Analyze an image using AI and generate caption, tags, category, and alt text
 * @route POST /api/images/analyze
 * @access Private
 */
export const analyzeImageWithAI = asyncHandler(async (req, res) => {
  const { imageUrl } = req.body;

  console.log('AI Analysis request for URL:', imageUrl);

  if (!imageUrl) {
    throw new ApiError(400, "Image URL is required");
  }

  // Validate that the URL is from Cloudinary (security check)
  if (!imageUrl.includes('cloudinary.com') && !imageUrl.includes('res.cloudinary.com')) {
    throw new ApiError(400, "Invalid image URL. Only Cloudinary URLs are allowed.");
  }

  try {
    const analysis = await analyzeImage(imageUrl);
    console.log('AI Analysis result:', analysis);
    
    res.status(200).json(
      new ApiResponse(200, "Image analyzed successfully", analysis)
    );
  } catch (error) {
    console.error('AI Analysis error:', error);
    throw new ApiError(500, "Failed to analyze image. Please try again or enter details manually.");
  }
});

/**
 * @desc Chat with AI Assistant
 * @route POST /api/images/ai-chat
 * @access Private
 */
export const aiChat = asyncHandler(async (req, res) => {
  const { message, imageId } = req.body;
  const userId = req.user._id;

  if (!message || message.trim().length === 0) {
    throw new ApiError(400, "Message is required");
  }

  if (message.length > 500) {
    throw new ApiError(400, "Message too long. Maximum 500 characters.");
  }

  const result = await chatWithAssistant(userId, message, imageId);

  if (!result.success) {
    // Return the AI error message as a chat reply so the frontend displays it gracefully
    return res.status(200).json(
      new ApiResponse(200, "AI response generated", {
        reply: result.message,
        images: [],
        context: { hasUserData: false, hasImageData: false, hasTrendingData: false }
      })
    );
  }

  res.status(200).json(
    new ApiResponse(200, "AI response generated", {
      reply: result.message,
      images: result.images || [],
      context: result.context
    })
  );
});

/**
 * @desc Get AI caption suggestions for an image
 * @route POST /api/images/suggest-captions
 * @access Private
 */
export const getCaptionSuggestions = asyncHandler(async (req, res) => {
  const { imageUrl, category } = req.body;

  if (!imageUrl) {
    throw new ApiError(400, "Image URL is required");
  }

  const result = await suggestCaptions(imageUrl, category);

  if (!result.success) {
    throw new ApiError(500, "Failed to generate captions. Please try again.");
  }

  res.status(200).json(
    new ApiResponse(200, "Caption suggestions generated", {
      captions: result.captions
    })
  );
});

/**
 * @desc Check image for copyright issues
 * @route POST /api/images/check-copyright
 * @access Private
 */
export const checkImageCopyright = asyncHandler(async (req, res) => {
  const { imageUrl, category } = req.body;

  if (!imageUrl) {
    throw new ApiError(400, "Image URL is required");
  }

  const result = await checkCopyright(imageUrl, category);

  res.status(200).json(
    new ApiResponse(200, "Copyright check completed", {
      hasCopyrightIssue: result.hasCopyrightIssue,
      confidence: result.confidence,
      matches: result.matches,
      method: result.method
    })
  );
});

/**
 * @desc Semantic search for images
 * @route GET /api/images/semantic-search
 * @access Private
 */
export const semanticImageSearch = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;

  if (!q || q.trim().length === 0) {
    throw new ApiError(400, "Search query is required");
  }

  // Get user's following list for visibility filtering
  const followingList = await Follow.find({ follower: req.user._id }).select("following");
  const followingIds = followingList.map(f => f.following.toString());

  const result = await semanticSearch(q, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    userId: req.user._id,
    followingIds
  });

  if (!result.success) {
    throw new ApiError(500, result.error || "Search failed");
  }

  res.status(200).json(
    new ApiResponse(200, "Semantic search completed", result.results, result.metadata)
  );
});

/**
 * @desc Find similar images
 * @route POST /api/images/find-similar
 * @access Private
 */
export const findSimilar = asyncHandler(async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    throw new ApiError(400, "Image URL is required");
  }

  const result = await findSimilarImages(imageUrl, 10);

  if (!result.success) {
    throw new ApiError(500, result.error || "Failed to find similar images");
  }

  res.status(200).json(
    new ApiResponse(200, "Similar images found", {
      analysis: result.referenceAnalysis,
      similarImages: result.results
    })
  );
});

/**
 * @desc Get search suggestions
 * @route GET /api/images/search-suggestions
 * @access Private
 */
export const getImageSearchSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;

  const suggestions = await getSearchSuggestions(q);

  res.status(200).json(
    new ApiResponse(200, "Suggestions fetched", suggestions)
  );
});

/**
 * @desc Get AI-ranked smart feed
 * @route GET /api/images/smart-feed
 * @access Private
 */
export const getSmartFeedImages = asyncHandler(async (req, res) => {
  const { page, limit, category } = req.query;

  const result = await getSmartFeed(req.user._id, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    category
  });

  if (!result.success) {
    throw new ApiError(500, result.error || "Failed to get smart feed");
  }

  res.status(200).json(
    new ApiResponse(200, "Smart feed fetched", result.images, result.metadata)
  );
});

/**
 * @desc Get "For You" recommendations
 * @route GET /api/images/for-you
 * @access Private
 */
export const getForYouImages = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  const result = await getForYouRecommendations(req.user._id, parseInt(limit) || 10);

  if (!result.success) {
    throw new ApiError(500, result.error || "Failed to get recommendations");
  }

  res.status(200).json(
    new ApiResponse(200, "Recommendations fetched", {
      images: result.recommendations,
      reason: result.reason
    })
  );
});

/**
 * @desc Like a story (sends notification to story owner)
 * @route POST /api/images/:imageId/story-like
 * @access Private
 */
export const storyLike = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const senderId = req.user._id;

  const image = await Image.findById(imageId).populate('user', 'username profilePicture fullName');
  if (!image) {
    throw new ApiError(404, "Story not found");
  }

  // Toggle the like in the database
  const result = await Like.toggleLike(senderId, imageId);

  // Only notify on like (not unlike), and don't notify yourself
  if (result.liked && image.user._id.toString() !== senderId.toString()) {
    await Notification.createNotification({
      recipient: image.user._id,
      sender: senderId,
      type: 'story_like',
      content: 'liked your story',
      relatedImage: imageId,
    });
  }

  res.status(200).json(
    new ApiResponse(200, result.liked ? "Story liked" : "Story unliked", { liked: result.liked })
  );
});

/**
 * @desc Reply to a story (sends as DM + notification, like Instagram)
 * @route POST /api/images/:imageId/story-reply
 * @access Private
 */
export const storyReply = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const { message } = req.body;
  const senderId = req.user._id;

  if (!message || !message.trim()) {
    throw new ApiError(400, "Reply message is required");
  }

  const image = await Image.findById(imageId).populate('user', 'username profilePicture fullName');
  if (!image) {
    throw new ApiError(404, "Story not found");
  }

  const storyOwnerId = image.user._id;

  if (storyOwnerId.toString() === senderId.toString()) {
    throw new ApiError(400, "Cannot reply to your own story");
  }

  // Get or create conversation between sender and story owner
  const conversation = await Conversation.findOrCreateConversation(senderId, storyOwnerId);

  // Create the message as a story reply with reference to the story image
  const newMessage = await Message.create({
    conversation: conversation._id,
    sender: senderId,
    content: message.trim(),
    messageType: 'storyReply',
    sharedImage: imageId,
    imageUrl: image.imageUrl, // Include story image URL for display
  });

  // Update conversation
  conversation.lastMessage = newMessage._id;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  // Increment unread count for story owner
  await conversation.incrementUnread(storyOwnerId);

  // Populate sender info
  await newMessage.populate('sender', 'fullName username profilePicture');
  await newMessage.populate('sharedImage', 'title imageUrl');

  // Create notification
  await Notification.createNotification({
    recipient: storyOwnerId,
    sender: senderId,
    type: 'story_reply',
    content: `replied to your story: "${message.trim().substring(0, 50)}"`,
    relatedImage: imageId,
    relatedConversation: conversation._id,
  });

  res.status(201).json(
    new ApiResponse(201, "Story reply sent", newMessage)
  );
});
