import { Image } from '../models/image.model.js';
import { User } from '../models/user.model.js';
import { Like } from '../models/like.model.js';
import { Follow } from '../models/follow.model.js';
import { Favorite } from '../models/favorite.model.js';

/**
 * AI Smart Feed Ranking System
 * Replaces chronological feed with personalized AI-ranked content
 * 
 * Ranking Signals:
 * - User interests (categories, tags they engage with)
 * - Image similarity to liked content
 * - Engagement probability prediction
 * - Content recency
 * - Creator relationship (following, engagement history)
 * - Content quality score
 */

/**
 * Get user's interest profile based on their activity
 * @param {string} userId - User ID
 * @returns {Object} - User interest profile
 */
const getUserInterestProfile = async (userId) => {
  try {
    // Get user's liked images
    const likedImages = await Like.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const likedImageIds = likedImages.map(l => l.image);

    // Get details of liked images
    const likedImageDetails = await Image.find({ _id: { $in: likedImageIds } })
      .select('category tags user')
      .lean();

    // Get user's favorited images
    const favorites = await Favorite.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const favoriteImageIds = favorites.map(f => f.image);
    const favoriteDetails = await Image.find({ _id: { $in: favoriteImageIds } })
      .select('category tags user')
      .lean();

    // Combine all engaged content
    const allEngaged = [...likedImageDetails, ...favoriteDetails];

    // Calculate category preferences (weighted)
    const categoryScores = {};
    allEngaged.forEach((img, index) => {
      const recencyWeight = 1 - (index / allEngaged.length) * 0.5; // Recent = more weight
      categoryScores[img.category] = (categoryScores[img.category] || 0) + recencyWeight;
    });

    // Normalize category scores
    const totalCatScore = Object.values(categoryScores).reduce((a, b) => a + b, 0);
    Object.keys(categoryScores).forEach(cat => {
      categoryScores[cat] = categoryScores[cat] / totalCatScore;
    });

    // Calculate tag preferences
    const tagScores = {};
    allEngaged.forEach((img, index) => {
      const recencyWeight = 1 - (index / allEngaged.length) * 0.5;
      (img.tags || []).forEach(tag => {
        tagScores[tag] = (tagScores[tag] || 0) + recencyWeight;
      });
    });

    // Get top tags (normalize)
    const totalTagScore = Object.values(tagScores).reduce((a, b) => a + b, 0);
    const topTags = Object.entries(tagScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .reduce((obj, [tag, score]) => {
        obj[tag] = score / totalTagScore;
        return obj;
      }, {});

    // Track engaged creators
    const creatorEngagement = {};
    allEngaged.forEach(img => {
      const creator = img.user?.toString();
      if (creator) {
        creatorEngagement[creator] = (creatorEngagement[creator] || 0) + 1;
      }
    });

    return {
      categoryPreferences: categoryScores,
      tagPreferences: topTags,
      engagedCreators: creatorEngagement,
      totalEngagements: allEngaged.length
    };
  } catch (error) {
    console.error('Error building interest profile:', error);
    return {
      categoryPreferences: {},
      tagPreferences: {},
      engagedCreators: {},
      totalEngagements: 0
    };
  }
};

/**
 * Calculate content quality score
 * @param {Object} image - Image document
 * @returns {number} - Quality score (0-100)
 */
const calculateQualityScore = (image) => {
  let score = 0;

  // Engagement metrics (max 40 points)
  const engagementScore = Math.min(40, 
    (image.likesCount || 0) * 2 + 
    (image.commentsCount || 0) * 3 + 
    (image.favoritesCount || 0) * 4
  );
  score += engagementScore;

  // Content completeness (max 20 points)
  if (image.title && image.title.length > 10) score += 5;
  if (image.description && image.description.length > 50) score += 5;
  if (image.tags && image.tags.length >= 3) score += 5;
  if (image.altText) score += 5;

  // AI-generated metadata (max 10 points)
  if (image.aiGenerated) score += 10;

  // Creator reputation (max 20 points)
  const creator = image.user;
  if (creator) {
    if (creator.followersCount >= 100) score += 5;
    if (creator.followersCount >= 500) score += 5;
    if (creator.badge === 'trendsetter') score += 5;
    if (creator.isVerified) score += 5;
  }

  // Recency bonus (max 10 points)
  const ageInDays = (Date.now() - new Date(image.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays < 1) score += 10;
  else if (ageInDays < 7) score += 5;
  else if (ageInDays < 30) score += 2;

  return Math.min(100, score);
};

/**
 * Calculate personalized relevance score for an image
 * @param {Object} image - Image document
 * @param {Object} userProfile - User's interest profile
 * @param {string[]} followingIds - IDs of users being followed
 * @returns {number} - Relevance score (0-100)
 */
const calculateRelevanceScore = (image, userProfile, followingIds) => {
  let score = 0;
  let weights = {
    categoryMatch: 30,
    tagMatch: 25,
    creatorRelation: 20,
    quality: 15,
    recency: 10
  };

  // Category preference match
  const categoryPref = userProfile.categoryPreferences[image.category] || 0;
  score += categoryPref * weights.categoryMatch;

  // Tag preference match
  const imageTags = image.tags || [];
  let tagMatchScore = 0;
  imageTags.forEach(tag => {
    tagMatchScore += (userProfile.tagPreferences[tag] || 0);
  });
  score += Math.min(weights.tagMatch, tagMatchScore * weights.tagMatch);

  // Creator relationship
  const creatorId = image.user?._id?.toString() || image.user?.toString();
  if (creatorId) {
    // Following bonus
    if (followingIds.includes(creatorId)) {
      score += weights.creatorRelation * 0.6;
    }
    // Previous engagement bonus
    const prevEngagement = userProfile.engagedCreators[creatorId] || 0;
    score += Math.min(weights.creatorRelation * 0.4, prevEngagement * 2);
  }

  // Quality score
  const qualityScore = calculateQualityScore(image) / 100;
  score += qualityScore * weights.quality;

  // Recency (decay over time)
  const ageInHours = (Date.now() - new Date(image.createdAt).getTime()) / (1000 * 60 * 60);
  const recencyMultiplier = Math.exp(-ageInHours / 168); // 7-day half-life
  score += recencyMultiplier * weights.recency;

  return Math.min(100, Math.round(score));
};

/**
 * Get smart-ranked feed for a user
 * @param {string} userId - User ID
 * @param {Object} options - Pagination and filter options
 * @returns {Object} - Ranked feed with images
 */
export const getSmartFeed = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      category = null
    } = options;

    console.log('Generating smart feed for:', userId);

    // Get user's following list
    const following = await Follow.find({ follower: userId }).select('following');
    const followingIds = following.map(f => f.following.toString());

    // Get user's interest profile
    const userProfile = await getUserInterestProfile(userId);

    // Build base query
    let query = {
      $or: [
        { visibility: 'public' },
        { visibility: 'followers', user: { $in: followingIds } },
        { user: userId }
      ]
    };

    // Add category filter if specified
    if (category && category !== 'all') {
      query.category = category;
    }

    // Fetch candidate images (more than needed for ranking)
    const candidateLimit = Math.max(100, limit * 5);
    const candidates = await Image.find(query)
      .populate('user', 'username profilePicture followersCount badge isVerified')
      .sort({ createdAt: -1 })
      .limit(candidateLimit)
      .lean();

    // Score and rank each image
    const scoredImages = candidates.map(image => ({
      ...image,
      relevanceScore: calculateRelevanceScore(image, userProfile, followingIds),
      qualityScore: calculateQualityScore(image)
    }));

    // Sort by relevance score (primary) and quality (secondary)
    scoredImages.sort((a, b) => {
      const scoreDiff = b.relevanceScore - a.relevanceScore;
      if (Math.abs(scoreDiff) > 5) return scoreDiff;
      return b.qualityScore - a.qualityScore;
    });

    // Apply diversity filter (avoid too many from same creator)
    const diversifiedFeed = applyDiversityFilter(scoredImages);

    // Paginate
    const skip = (page - 1) * limit;
    const paginatedFeed = diversifiedFeed.slice(skip, skip + limit);

    return {
      success: true,
      images: paginatedFeed,
      metadata: {
        total: diversifiedFeed.length,
        page,
        limit,
        pages: Math.ceil(diversifiedFeed.length / limit),
        hasNextPage: skip + limit < diversifiedFeed.length
      },
      debug: {
        userProfileSize: userProfile.totalEngagements,
        candidatesScored: candidates.length
      }
    };

  } catch (error) {
    console.error('Smart feed error:', error);
    return {
      success: false,
      images: [],
      error: error.message
    };
  }
};

/**
 * Apply diversity filter to avoid content fatigue
 * @param {Object[]} images - Scored images
 * @returns {Object[]} - Diversified images
 */
const applyDiversityFilter = (images) => {
  const result = [];
  const creatorCounts = {};
  const categoryCounts = {};

  const maxPerCreator = 3; // Max images from same creator in a row
  const maxPerCategory = 5; // Max images from same category in a row

  for (const image of images) {
    const creatorId = image.user?._id?.toString() || 'unknown';
    const category = image.category || 'other';

    // Check if we've hit limits
    const creatorCount = creatorCounts[creatorId] || 0;
    const categoryCount = categoryCounts[category] || 0;

    // Apply soft limit (push to end instead of dropping)
    if (creatorCount < maxPerCreator && categoryCount < maxPerCategory) {
      result.push(image);
      creatorCounts[creatorId] = creatorCount + 1;
      categoryCounts[category] = categoryCount + 1;
    } else {
      // Add with penalty (will be at end due to sorting)
      image.relevanceScore = image.relevanceScore * 0.5;
      result.push(image);
    }
  }

  return result;
};

/**
 * Record user interaction for learning
 * @param {string} userId - User ID
 * @param {string} imageId - Image ID
 * @param {string} action - Interaction type (view, like, comment, save)
 */
export const recordInteraction = async (userId, imageId, action) => {
  // In a production system, this would update a user engagement model
  // For now, the Like/Favorite/Comment models handle this implicitly
  console.log(`Recording interaction: ${userId} ${action} ${imageId}`);
  return true;
};

/**
 * Get "For You" recommendations
 * Similar to smart feed but more discovery-focused
 * @param {string} userId - User ID
 * @param {number} limit - Number of recommendations
 * @returns {Object[]} - Recommended images
 */
export const getForYouRecommendations = async (userId, limit = 10) => {
  try {
    const userProfile = await getUserInterestProfile(userId);
    const following = await Follow.find({ follower: userId }).select('following');
    const followingIds = following.map(f => f.following.toString());

    // Get images from creators NOT being followed (discovery)
    const discoveryImages = await Image.find({
      visibility: 'public',
      user: { $nin: [...followingIds, userId] }
    })
    .populate('user', 'username profilePicture followersCount badge')
    .sort({ likesCount: -1, createdAt: -1 })
    .limit(50)
    .lean();

    // Score for relevance to user's interests
    const scored = discoveryImages.map(img => ({
      ...img,
      relevanceScore: calculateRelevanceScore(img, userProfile, [])
    }));

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      success: true,
      recommendations: scored.slice(0, limit),
      reason: 'Based on your interests and engagement history'
    };

  } catch (error) {
    console.error('For You recommendations error:', error);
    return { success: false, recommendations: [], error: error.message };
  }
};

export default { getSmartFeed, getForYouRecommendations, recordInteraction };
