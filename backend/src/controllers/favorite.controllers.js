import { Favorite } from "../models/favorite.model.js";
import { Image } from "../models/image.model.js";
import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { updateInteractionPoints } from "../utils/userUpdates.js";

/**
 * @desc Toggle image favorite status
 * @route POST /api/favorites/:imageId/toggle
 * @access Private
 */
export const toggleFavorite = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const userId = req.user._id;

  // Check if image exists
  const image = await Image.findById(imageId);
  if (!image) {
    throw new ApiError(404, "Image not found");
  }

  const result = await Favorite.toggleFavorite(userId, imageId);

  // Update interaction points and send notification if image was favorited
  if (result.favorited) {
    // Update interaction points for bookmarking/favoriting
    await updateInteractionPoints(userId, 'favorite');
    
    // Send notification to image owner (only if it's not the same user)
    if (image.user.toString() !== userId.toString()) {
      await Notification.createNotification({
        recipient: image.user,
        sender: userId,
        type: 'favorite',
        content: 'favorited your image',
        relatedImage: imageId
      });
    }
  }

  res.status(200).json(
    new ApiResponse(200, `Favorite status updated`, result)
  );
});

/**
 * @desc Get user's favorite images
 * @route GET /api/favorites
 * @access Private
 */
export const getFavorites = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const { category } = req.query;

  const result = await Favorite.getUserFavorites(req.user._id, page, limit, category);

  res.status(200).json(
    new ApiResponse(
      200,
      "Favorites fetched successfully",
      result.favorites,
      result.metadata
    )
  );
});

/**
 * @desc Check if image is favorited by user
 * @route GET /api/favorites/:imageId/check
 * @access Private
 */
export const checkFavorite = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const userId = req.user._id;

  const favorite = await Favorite.findOne({ user: userId, image: imageId });

  res.status(200).json(
    new ApiResponse(200, "Favorite status checked", { isFavorited: !!favorite })
  );
});
