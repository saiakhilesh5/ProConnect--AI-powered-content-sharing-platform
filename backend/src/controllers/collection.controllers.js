import { Collection } from "../models/collection.model.js";
import { Image } from "../models/image.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * @desc Create a new collection
 * @route POST /api/collections
 * @access Private
 */
export const createCollection = asyncHandler(async (req, res) => {
  const { name, description, visibility, tags } = req.body;

  // Basic validation
  if (!name) {
    throw new ApiError(400, "Collection name is required");
  }

  // Create the collection
  const collection = await Collection.create({
    user: req.user._id,
    name,
    description,
    visibility: visibility || "private",
    tags: tags || [],
  });

  res.status(201).json(
    new ApiResponse(201, "Collection created successfully", collection)
  );
});

/**
 * @desc Get all collections for the logged-in user
 * @route GET /api/collections
 * @access Private
 */
export const getUserCollections = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || "updatedAt"; // Default sort by last updated
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1; // Default to descending (newest first)
  const search = req.query.search || "";

  // Build query for searching - only show user's own collections
  let query = { user: req.user._id };
  
  if (search) {
    // Search by name, description, or tags
    query = {
      ...query,
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ]
    };
  }

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder;

  // Get collections with pagination
  const collections = await Collection.find(query)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .populate({
      path: 'images',
      select: 'imageUrl title',
      options: { limit: 1 } // Just get the first image for preview
    });

  // Count total collections matching the query
  const total = await Collection.countDocuments(query);

  // Build metadata for pagination
  const metadata = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };

  res.status(200).json(
    new ApiResponse(200, "Collections fetched successfully", collections, metadata)
  );
});

/**
 * @desc Get a collection by ID
 * @route GET /api/collections/:collectionId
 * @access Private
 */
export const getCollectionById = asyncHandler(async (req, res) => {
  const { collectionId } = req.params;

  // Find the collection and populate necessary fields
  const collection = await Collection.findById(collectionId)
    .populate({
      path: 'images',
      select: 'imageUrl title description user favoritesCount likesCount commentsCount'
    });

  if (!collection) {
    throw new ApiError(404, "Collection not found");
  }

  // Check if user has permission to view this collection
  const isOwner = collection.user.toString() === req.user._id.toString();

  if (!isOwner && collection.visibility === 'private') {
    throw new ApiError(403, "You don't have permission to view this collection");
  }

  // Update lastViewed timestamp
  collection.lastViewed = new Date();
  await collection.save();

  res.status(200).json(
    new ApiResponse(200, "Collection fetched successfully", collection)
  );
});

/**
 * @desc Update a collection
 * @route PUT /api/collections/:collectionId
 * @access Private
 */
export const updateCollection = asyncHandler(async (req, res) => {
  const { collectionId } = req.params;
  const { name, description, visibility, tags, isStarred, coverImage } = req.body;

  // Find the collection
  const collection = await Collection.findById(collectionId);

  if (!collection) {
    throw new ApiError(404, "Collection not found");
  }

  // Check if user has permission to update (only owner can update)
  if (collection.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to update this collection");
  }

  // Update fields if provided
  if (name) collection.name = name;
  if (description !== undefined) collection.description = description;
  if (visibility) collection.visibility = visibility;
  if (tags) collection.tags = tags;
  if (isStarred !== undefined) collection.isStarred = isStarred;
  if (coverImage) collection.coverImage = coverImage;

  // Save the updated collection
  await collection.save();

  res.status(200).json(
    new ApiResponse(200, "Collection updated successfully", collection)
  );
});

/**
 * @desc Delete a collection
 * @route DELETE /api/collections/:collectionId
 * @access Private
 */
export const deleteCollection = asyncHandler(async (req, res) => {
  const { collectionId } = req.params;

  // Find the collection
  const collection = await Collection.findById(collectionId);

  if (!collection) {
    throw new ApiError(404, "Collection not found");
  }

  // Check if user has permission to delete (only owner can delete)
  if (collection.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to delete this collection");
  }

  // Delete the collection
  await Collection.findByIdAndDelete(collectionId);

  res.status(200).json(
    new ApiResponse(200, "Collection deleted successfully", {})
  );
});

/**
 * @desc Add an image to a collection
 * @route POST /api/collections/:collectionId/images/:imageId
 * @access Private
 */
export const addImageToCollection = asyncHandler(async (req, res) => {
  const { collectionId, imageId } = req.params;

  // Find the collection
  const collection = await Collection.findById(collectionId);

  if (!collection) {
    throw new ApiError(404, "Collection not found");
  }

  // Check if user has permission to update (only owner can update)
  if (collection.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to update this collection");
  }

  // Check if the image exists
  const image = await Image.findById(imageId);
  if (!image) {
    throw new ApiError(404, "Image not found");
  }

  // Check if image is already in the collection
  if (collection.images.includes(imageId)) {
    throw new ApiError(400, "Image already exists in this collection");
  }

  // Add the image to the collection
  collection.images.push(imageId);
  
  // If no cover image set, use this image as cover
  if (!collection.coverImage) {
    collection.coverImage = image.imageUrl;
  }

  await collection.save();

  res.status(200).json(
    new ApiResponse(200, "Image added to collection successfully", collection)
  );
});

/**
 * @desc Remove an image from a collection
 * @route DELETE /api/collections/:collectionId/images/:imageId
 * @access Private
 */
export const removeImageFromCollection = asyncHandler(async (req, res) => {
  const { collectionId, imageId } = req.params;

  // Find the collection
  const collection = await Collection.findById(collectionId);

  if (!collection) {
    throw new ApiError(404, "Collection not found");
  }

  // Check if user has permission to update (only owner can update)
  if (collection.user.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to update this collection");
  }

  // Remove the image from the collection
  collection.images = collection.images.filter(img => img.toString() !== imageId);

  // If removed image was the cover image, update cover to first image if available
  if (collection.coverImage && collection.coverImage === imageId) {
    if (collection.images.length > 0) {
      const firstImage = await Image.findById(collection.images[0]);
      collection.coverImage = firstImage ? firstImage.imageUrl : null;
    } else {
      collection.coverImage = null;
    }
  }

  await collection.save();

  res.status(200).json(
    new ApiResponse(200, "Image removed from collection successfully", collection)
  );
});

/**
 * @desc Get collections containing a specific image
 * @route GET /api/collections/image/:imageId
 * @access Private
 */
export const getCollectionsByImage = asyncHandler(async (req, res) => {
  const { imageId } = req.params;

  // Find collections containing the image that belong to the user
  const collections = await Collection.find({
    user: req.user._id,
    images: { $in: [imageId] }
  }).select('_id name');

  res.status(200).json(
    new ApiResponse(200, "Collections fetched successfully", collections)
  );
});

/**
 * @desc Get public collections
 * @route GET /api/collections/public
 * @access Private
 */
export const getPublicCollections = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = req.query.search || "";

  // Build query for public collections
  let query = { visibility: 'public' };
  
  if (search) {
    query = {
      ...query,
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ]
    };
  }

  // Get public collections
  const collections = await Collection.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username profilePicture fullName')
    .populate({
      path: 'images',
      select: 'imageUrl title',
      options: { limit: 1 } // Just get one image for preview
    });

  // Count total public collections
  const total = await Collection.countDocuments(query);

  // Build metadata for pagination
  const metadata = {
    total,
    page, 
    limit,
    pages: Math.ceil(total / limit)
  };

  res.status(200).json(
    new ApiResponse(200, "Public collections fetched successfully", collections, metadata)
  );
});

/**
 * @desc Search collections
 * @route GET /api/collections/search
 * @access Private
 */
export const searchCollections = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!query) {
    throw new ApiError(400, "Search query is required");
  }

  // Search public collections by default
  let searchQuery = {
    visibility: 'public',
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ]
  };

  // If user is logged in, also include their private collections
  if (req.user) {
    searchQuery = {
      $or: [
        // Public collections
        {
          visibility: 'public',
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } }
          ]
        },
        // User's own collections (both public and private)
        {
          user: req.user._id,
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { tags: { $in: [new RegExp(query, 'i')] } }
          ]
        }
      ]
    };
  }

  const collections = await Collection.find(searchQuery)
    .populate('user', 'username profilePicture fullName')
    .populate({
      path: 'images',
      select: 'imageUrl title',
      options: { limit: 1 } // Just get one image for preview
    })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Collection.countDocuments(searchQuery);

  const metadata = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };

  res.status(200).json(
    new ApiResponse(200, "Collections search results", collections, metadata)
  );
}); 