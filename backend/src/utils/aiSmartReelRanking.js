import { Reel } from '../models/reel.model.js';
import { User } from '../models/user.model.js';
import { ReelLike } from '../models/reelLike.model.js';
import { ReelSave } from '../models/reelSave.model.js';
import { Follow } from '../models/follow.model.js';
import { ReelComment } from '../models/reelComment.model.js';

/**
 * AI Smart Reel Ranking System
 * Personalized reel recommendations based on user interests and engagement patterns
 * 
 * Ranking Signals:
 * - User interests (categories, tags they engage with)
 * - Watch time patterns
 * - Engagement prediction (likes, comments, saves, shares)
 * - Content recency with decay
 * - Creator relationship (following, previous engagement)
 * - Content quality and trending scores
 * - Diversity to avoid content fatigue
 */

/**
 * Build user's reel interest profile based on their activity
 * @param {string} userId - User ID
 * @returns {Object} - User interest profile for reels
 */
const getUserReelInterestProfile = async (userId) => {
  try {
    // Get user's liked reels (most recent 100)
    const likedReels = await ReelLike.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const likedReelIds = likedReels.map(l => l.reel);

    // Get details of liked reels
    const likedReelDetails = await Reel.find({ _id: { $in: likedReelIds } })
      .select('category tags user duration')
      .lean();

    // Get user's saved reels (most recent 50)
    const savedReels = await ReelSave.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const savedReelIds = savedReels.map(s => s.reel);
    const savedReelDetails = await Reel.find({ _id: { $in: savedReelIds } })
      .select('category tags user duration')
      .lean();

    // Get user's commented reels (shows high engagement)
    const comments = await ReelComment.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .select('reel')
      .lean();

    const commentedReelIds = comments.map(c => c.reel);
    const commentedReelDetails = await Reel.find({ _id: { $in: commentedReelIds } })
      .select('category tags user duration')
      .lean();

    // Combine all engaged content with weights
    // Comments = highest engagement, then saves, then likes
    const allEngaged = [
      ...commentedReelDetails.map(r => ({ ...r, weight: 3 })),
      ...savedReelDetails.map(r => ({ ...r, weight: 2 })),
      ...likedReelDetails.map(r => ({ ...r, weight: 1 })),
    ];

    // Calculate category preferences (weighted by engagement type and recency)
    const categoryScores = {};
    allEngaged.forEach((reel, index) => {
      const recencyWeight = 1 - (index / allEngaged.length) * 0.5;
      const engagementWeight = reel.weight || 1;
      const totalWeight = recencyWeight * engagementWeight;
      
      if (reel.category) {
        categoryScores[reel.category] = (categoryScores[reel.category] || 0) + totalWeight;
      }
    });

    // Normalize category scores
    const totalCatScore = Object.values(categoryScores).reduce((a, b) => a + b, 0) || 1;
    Object.keys(categoryScores).forEach(cat => {
      categoryScores[cat] = categoryScores[cat] / totalCatScore;
    });

    // Calculate tag preferences
    const tagScores = {};
    allEngaged.forEach((reel, index) => {
      const recencyWeight = 1 - (index / allEngaged.length) * 0.5;
      const engagementWeight = reel.weight || 1;
      const totalWeight = recencyWeight * engagementWeight;
      
      (reel.tags || []).forEach(tag => {
        tagScores[tag] = (tagScores[tag] || 0) + totalWeight;
      });
    });

    // Get top 30 tags (normalized)
    const totalTagScore = Object.values(tagScores).reduce((a, b) => a + b, 0) || 1;
    const topTags = Object.entries(tagScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .reduce((obj, [tag, score]) => {
        obj[tag] = score / totalTagScore;
        return obj;
      }, {});

    // Track engaged creators (for boosting their content)
    const creatorEngagement = {};
    allEngaged.forEach(reel => {
      const creator = reel.user?.toString();
      if (creator) {
        creatorEngagement[creator] = (creatorEngagement[creator] || 0) + (reel.weight || 1);
      }
    });

    // Preferred duration range (average of engaged content)
    const durations = allEngaged.map(r => r.duration).filter(Boolean);
    const avgDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 30;

    return {
      categoryPreferences: categoryScores,
      tagPreferences: topTags,
      engagedCreators: creatorEngagement,
      preferredDuration: avgDuration,
      totalEngagements: allEngaged.length,
      isNewUser: allEngaged.length < 5
    };
  } catch (error) {
    console.error('Error building reel interest profile:', error);
    return {
      categoryPreferences: {},
      tagPreferences: {},
      engagedCreators: {},
      preferredDuration: 30,
      totalEngagements: 0,
      isNewUser: true
    };
  }
};

/**
 * Calculate reel quality score based on engagement metrics
 * @param {Object} reel - Reel document
 * @returns {number} - Quality score (0-100)
 */
const calculateReelQualityScore = (reel) => {
  let score = 0;

  // Engagement metrics (max 50 points)
  const viewEngagementRate = reel.viewsCount > 0 
    ? (reel.likesCount + reel.commentsCount + reel.savesCount) / reel.viewsCount 
    : 0;
  score += Math.min(25, viewEngagementRate * 100);
  
  // Raw engagement (for new content without many views)
  const rawEngagement = 
    (reel.likesCount || 0) * 2 + 
    (reel.commentsCount || 0) * 4 + 
    (reel.savesCount || 0) * 3 +
    (reel.sharesCount || 0) * 5;
  score += Math.min(25, rawEngagement / 10);

  // Content completeness (max 15 points)
  if (reel.caption && reel.caption.length > 10) score += 5;
  if (reel.tags && reel.tags.length >= 2) score += 5;
  if (reel.music?.name) score += 5;

  // Creator reputation (max 20 points)
  const creator = reel.user;
  if (creator) {
    if (creator.followersCount >= 100) score += 5;
    if (creator.followersCount >= 500) score += 5;
    if (creator.badge === 'trendsetter') score += 5;
    if (creator.isVerified) score += 5;
  }

  // Trending bonus (max 15 points)
  if (reel.isFeatured) score += 10;
  if (reel.trendingScore > 50) score += 5;

  return Math.min(100, score);
};

/**
 * Calculate personalized relevance score for a reel
 * @param {Object} reel - Reel document
 * @param {Object} userProfile - User's interest profile
 * @param {string[]} followingIds - IDs of users being followed
 * @returns {number} - Relevance score (0-100)
 */
const calculateReelRelevanceScore = (reel, userProfile, followingIds) => {
  // For new users with no engagement history, rely more on quality/trending
  if (userProfile.isNewUser) {
    return calculateReelQualityScore(reel) * 0.7 + 
           (reel.trendingScore || 0) / 10 * 0.3;
  }

  let score = 0;
  const weights = {
    categoryMatch: 25,
    tagMatch: 25,
    creatorRelation: 20,
    quality: 15,
    recency: 10,
    durationMatch: 5
  };

  // Category preference match
  const categoryPref = userProfile.categoryPreferences[reel.category] || 0;
  score += categoryPref * weights.categoryMatch * 100;

  // Tag preference match
  const reelTags = reel.tags || [];
  let tagMatchScore = 0;
  reelTags.forEach(tag => {
    tagMatchScore += (userProfile.tagPreferences[tag] || 0);
  });
  score += Math.min(weights.tagMatch, tagMatchScore * weights.tagMatch * 100);

  // Creator relationship
  const creatorId = reel.user?._id?.toString() || reel.user?.toString();
  if (creatorId) {
    // Following bonus (moderate - we want discovery too)
    if (followingIds.includes(creatorId)) {
      score += weights.creatorRelation * 0.5;
    }
    // Previous engagement bonus
    const prevEngagement = userProfile.engagedCreators[creatorId] || 0;
    score += Math.min(weights.creatorRelation * 0.5, prevEngagement * 3);
  }

  // Quality score
  const qualityScore = calculateReelQualityScore(reel) / 100;
  score += qualityScore * weights.quality;

  // Recency (decay over time - faster for reels)
  const ageInHours = (Date.now() - new Date(reel.createdAt).getTime()) / (1000 * 60 * 60);
  const recencyMultiplier = Math.exp(-ageInHours / 72); // 3-day half-life (faster than images)
  score += recencyMultiplier * weights.recency;

  // Duration preference match
  const durationDiff = Math.abs(reel.duration - userProfile.preferredDuration);
  const durationMatch = Math.max(0, 1 - durationDiff / 60);
  score += durationMatch * weights.durationMatch;

  return Math.min(100, Math.round(score));
};

/**
 * Apply diversity filter to avoid content fatigue
 * Ensures variety in creators and categories
 * @param {Object[]} reels - Scored reels
 * @returns {Object[]} - Diversified reels
 */
const applyDiversityFilter = (reels) => {
  const result = [];
  const creatorCounts = {};
  const categoryCounts = {};
  const seenReels = new Set();

  const maxPerCreator = 2; // Max reels from same creator consecutively
  const maxPerCategory = 4; // Max reels from same category consecutively

  for (const reel of reels) {
    // Skip duplicates
    const reelId = reel._id?.toString();
    if (seenReels.has(reelId)) continue;
    seenReels.add(reelId);

    const creatorId = reel.user?._id?.toString() || 'unknown';
    const category = reel.category || 'other';

    const creatorCount = creatorCounts[creatorId] || 0;
    const categoryCount = categoryCounts[category] || 0;

    // Check limits
    if (creatorCount < maxPerCreator && categoryCount < maxPerCategory) {
      result.push(reel);
      creatorCounts[creatorId] = creatorCount + 1;
      categoryCounts[category] = categoryCount + 1;
    } else {
      // Apply penalty and add later
      reel.relevanceScore = (reel.relevanceScore || 0) * 0.6;
      result.push(reel);
    }
  }

  // Re-sort to maintain relevance while respecting diversity
  result.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  return result;
};

/**
 * Get AI-ranked "For You" reel feed
 * @param {string} userId - User ID
 * @param {Object} options - Pagination and filter options
 * @returns {Object} - Ranked reels feed
 */
export const getSmartReelFeed = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      category = null
    } = options;

    console.log('Generating smart reel feed for:', userId);

    // Get user's following list
    const following = await Follow.find({ follower: userId }).select('following');
    const followingIds = following.map(f => f.following.toString());

    // Get user's interest profile
    const userProfile = await getUserReelInterestProfile(userId);

    // Build base query - public reels
    let query = { visibility: 'public' };

    // Add category filter if specified
    if (category && category !== 'all') {
      query.category = category;
    }

    // Fetch candidate reels (more than needed for ranking)
    const candidateLimit = Math.max(100, limit * 10);
    const candidates = await Reel.find(query)
      .populate('user', 'username fullName profilePicture followersCount badge isVerified')
      .sort({ createdAt: -1 })
      .limit(candidateLimit)
      .lean();

    // Score and rank each reel
    const scoredReels = candidates.map(reel => ({
      ...reel,
      relevanceScore: calculateReelRelevanceScore(reel, userProfile, followingIds),
      qualityScore: calculateReelQualityScore(reel)
    }));

    // Primary sort by relevance, secondary by quality, tertiary by trending
    scoredReels.sort((a, b) => {
      const relevanceDiff = b.relevanceScore - a.relevanceScore;
      if (Math.abs(relevanceDiff) > 5) return relevanceDiff;
      
      const qualityDiff = b.qualityScore - a.qualityScore;
      if (Math.abs(qualityDiff) > 5) return qualityDiff;
      
      return (b.trendingScore || 0) - (a.trendingScore || 0);
    });

    // Apply diversity filter
    const diversifiedFeed = applyDiversityFilter(scoredReels);

    // Paginate
    const skip = (page - 1) * limit;
    const paginatedFeed = diversifiedFeed.slice(skip, skip + limit);

    return {
      success: true,
      reels: paginatedFeed,
      metadata: {
        total: diversifiedFeed.length,
        page,
        limit,
        pages: Math.ceil(diversifiedFeed.length / limit),
        hasNextPage: skip + limit < diversifiedFeed.length
      },
      debug: {
        userProfileSize: userProfile.totalEngagements,
        isNewUser: userProfile.isNewUser,
        candidatesScored: candidates.length,
        topCategories: Object.entries(userProfile.categoryPreferences)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat]) => cat)
      }
    };

  } catch (error) {
    console.error('Smart reel feed error:', error);
    return {
      success: false,
      reels: [],
      error: error.message
    };
  }
};

/**
 * Get discovery/explore reels (content from non-followed creators)
 * @param {string} userId - User ID
 * @param {number} limit - Number of recommendations
 * @returns {Object} - Discovery reels
 */
export const getDiscoveryReels = async (userId, limit = 10) => {
  try {
    const userProfile = await getUserReelInterestProfile(userId);
    const following = await Follow.find({ follower: userId }).select('following');
    const followingIds = following.map(f => f.following.toString());

    // Get trending reels from creators NOT being followed
    const discoveryReels = await Reel.find({
      visibility: 'public',
      user: { $nin: [...followingIds, userId] }
    })
    .populate('user', 'username fullName profilePicture followersCount badge')
    .sort({ trendingScore: -1, viewsCount: -1, createdAt: -1 })
    .limit(50)
    .lean();

    // Score for relevance to user's interests
    const scored = discoveryReels.map(reel => ({
      ...reel,
      relevanceScore: calculateReelRelevanceScore(reel, userProfile, [])
    }));

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      success: true,
      reels: scored.slice(0, limit),
      reason: 'Trending content based on your interests'
    };

  } catch (error) {
    console.error('Discovery reels error:', error);
    return { success: false, reels: [], error: error.message };
  }
};

/**
 * Record user interaction for learning/analytics
 * @param {string} userId - User ID
 * @param {string} reelId - Reel ID
 * @param {string} action - Interaction type (view, like, comment, save, share, watchTime)
 * @param {Object} metadata - Additional interaction data
 */
export const recordReelInteraction = async (userId, reelId, action, metadata = {}) => {
  try {
    // Log interaction for analytics
    console.log(`Reel interaction: ${userId} ${action} ${reelId}`, metadata);
    
    // In production, this would update user preference models
    // and potentially trigger real-time recommendation updates
    
    return { success: true };
  } catch (error) {
    console.error('Error recording reel interaction:', error);
    return { success: false, error: error.message };
  }
};

export default { 
  getSmartReelFeed, 
  getDiscoveryReels, 
  recordReelInteraction,
  getUserReelInterestProfile 
};
