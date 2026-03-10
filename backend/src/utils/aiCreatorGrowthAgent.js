import { GoogleGenerativeAI } from '@google/generative-ai';
import { Image } from '../models/image.model.js';
import { User } from '../models/user.model.js';
import { Like } from '../models/like.model.js';
import { Follow } from '../models/follow.model.js';
import { Comment } from '../models/comment.model.js';

/**
 * AI Creator Growth Agent
 * Analyzes creator performance and provides growth recommendations
 * Features:
 * - Best posting time analysis
 * - Trending topics suggestions
 * - Hashtag strategy recommendations
 * - Engagement optimization tips
 */

/**
 * Analyze user's posting patterns and engagement
 * @param {string} userId - User ID
 * @returns {Object} - Posting analysis data
 */
const analyzePostingPatterns = async (userId) => {
  try {
    // Get user's images with timestamps and engagement
    const images = await Image.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('createdAt likesCount commentsCount viewsCount category tags')
      .lean();

    if (images.length === 0) {
      return null;
    }

    // Analyze posting times
    const postingHours = {};
    const postingDays = {};
    const engagementByHour = {};
    const engagementByDay = {};

    images.forEach(img => {
      const date = new Date(img.createdAt);
      const hour = date.getHours();
      const day = date.getDay(); // 0 = Sunday
      const engagement = (img.likesCount || 0) + (img.commentsCount || 0) * 2;

      // Count posts per hour/day
      postingHours[hour] = (postingHours[hour] || 0) + 1;
      postingDays[day] = (postingDays[day] || 0) + 1;

      // Sum engagement per hour/day
      if (!engagementByHour[hour]) engagementByHour[hour] = [];
      engagementByHour[hour].push(engagement);

      if (!engagementByDay[day]) engagementByDay[day] = [];
      engagementByDay[day].push(engagement);
    });

    // Calculate average engagement per time slot
    const avgEngagementByHour = {};
    Object.keys(engagementByHour).forEach(hour => {
      const arr = engagementByHour[hour];
      avgEngagementByHour[hour] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    });

    const avgEngagementByDay = {};
    Object.keys(engagementByDay).forEach(day => {
      const arr = engagementByDay[day];
      avgEngagementByDay[day] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    });

    // Find best posting times
    const sortedHours = Object.entries(avgEngagementByHour)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const sortedDays = Object.entries(avgEngagementByDay)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      totalPosts: images.length,
      bestHours: sortedHours.map(([hour, eng]) => ({
        hour: parseInt(hour),
        timeSlot: `${hour}:00 - ${(parseInt(hour) + 1) % 24}:00`,
        avgEngagement: eng
      })),
      bestDays: sortedDays.map(([day, eng]) => ({
        day: dayNames[parseInt(day)],
        avgEngagement: eng
      })),
      postingFrequency: {
        total: images.length,
        avgPerWeek: Math.round(images.length / 7)
      }
    };
  } catch (error) {
    console.error('Error analyzing posting patterns:', error);
    return null;
  }
};

/**
 * Get trending topics on the platform
 * @returns {Object} - Trending categories, tags, and themes
 */
const getTrendingTopics = async () => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get trending categories
    const trendingCategories = await Image.aggregate([
      { $match: { createdAt: { $gte: weekAgo }, visibility: 'public' } },
      {
        $group: {
          _id: '$category',
          totalEngagement: { $sum: { $add: ['$likesCount', { $multiply: ['$commentsCount', 2] }] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalEngagement: -1 } },
      { $limit: 5 }
    ]);

    // Get trending tags
    const trendingTags = await Image.aggregate([
      { $match: { createdAt: { $gte: weekAgo }, visibility: 'public' } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          count: { $sum: 1 },
          avgLikes: { $avg: '$likesCount' }
        }
      },
      { $sort: { count: -1, avgLikes: -1 } },
      { $limit: 15 }
    ]);

    // Get rising stars (new tags gaining traction)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const risingTags = await Image.aggregate([
      { $match: { createdAt: { $gte: dayAgo }, visibility: 'public' } },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          recentCount: { $sum: 1 },
          avgLikes: { $avg: '$likesCount' }
        }
      },
      { $match: { recentCount: { $gte: 2 } } },
      { $sort: { avgLikes: -1 } },
      { $limit: 5 }
    ]);

    return {
      categories: trendingCategories.map(c => ({
        name: c._id,
        engagement: c.totalEngagement,
        postCount: c.count
      })),
      tags: trendingTags.map(t => ({
        tag: t._id,
        usage: t.count,
        avgLikes: Math.round(t.avgLikes || 0)
      })),
      risingTags: risingTags.map(t => ({
        tag: t._id,
        recentUsage: t.recentCount,
        avgLikes: Math.round(t.avgLikes || 0)
      }))
    };
  } catch (error) {
    console.error('Error getting trending topics:', error);
    return { categories: [], tags: [], risingTags: [] };
  }
};

/**
 * Generate hashtag strategy based on user's niche
 * @param {string} userId - User ID
 * @returns {Object} - Hashtag recommendations
 */
const generateHashtagStrategy = async (userId) => {
  try {
    // Get user's top categories and tags
    const userImages = await Image.find({ user: userId })
      .select('category tags likesCount')
      .lean();

    if (userImages.length === 0) {
      return { recommended: [], avoid: [], strategy: 'Start posting to get personalized recommendations' };
    }

    // Analyze user's most successful tags
    const tagPerformance = {};
    userImages.forEach(img => {
      (img.tags || []).forEach(tag => {
        if (!tagPerformance[tag]) {
          tagPerformance[tag] = { uses: 0, totalLikes: 0 };
        }
        tagPerformance[tag].uses++;
        tagPerformance[tag].totalLikes += img.likesCount || 0;
      });
    });

    const tagStats = Object.entries(tagPerformance).map(([tag, data]) => ({
      tag,
      uses: data.uses,
      avgLikes: Math.round(data.totalLikes / data.uses)
    })).sort((a, b) => b.avgLikes - a.avgLikes);

    // Get user's primary category
    const categoryCount = {};
    userImages.forEach(img => {
      categoryCount[img.category] = (categoryCount[img.category] || 0) + 1;
    });
    const primaryCategory = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    // Get trending tags in user's category
    const trending = await getTrendingTopics();
    const categoryTrending = trending.tags.filter(t => 
      !tagPerformance[t.tag] // Tags user hasn't used yet
    ).slice(0, 5);

    return {
      topPerforming: tagStats.slice(0, 10),
      underperforming: tagStats.filter(t => t.avgLikes === 0).slice(0, 5),
      recommended: categoryTrending,
      primaryCategory,
      strategy: generateStrategyText(tagStats, primaryCategory)
    };
  } catch (error) {
    console.error('Error generating hashtag strategy:', error);
    return { recommended: [], strategy: 'Unable to generate strategy' };
  }
};

/**
 * Generate strategy text
 */
const generateStrategyText = (tagStats, category) => {
  const topTag = tagStats[0]?.tag;
  const avgLikes = tagStats.length > 0 
    ? Math.round(tagStats.reduce((sum, t) => sum + t.avgLikes, 0) / tagStats.length)
    : 0;

  if (!topTag) {
    return 'Start using 3-5 relevant tags per post to increase discoverability.';
  }

  return `Your best performing tag is "${topTag}". Focus on ${category || 'your niche'} content with similar tags. Use 5-7 tags per post for optimal reach.`;
};

/**
 * Get AI-powered growth recommendations
 * @param {string} userId - User ID
 * @returns {Object} - Comprehensive growth recommendations
 */
export const getGrowthRecommendations = async (userId) => {
  try {
    console.log('Generating growth recommendations for:', userId);

    // Gather all data
    const [user, postingPatterns, trendingTopics, hashtagStrategy] = await Promise.all([
      User.findById(userId).select('username followersCount followingCount postsCount likesCount badge createdAt'),
      analyzePostingPatterns(userId),
      getTrendingTopics(),
      generateHashtagStrategy(userId)
    ]);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Calculate engagement rate
    const engagementRate = user.postsCount > 0 
      ? Math.round((user.likesCount / user.postsCount) * 100) / 100 
      : 0;

    // Generate AI insights if available
    let aiInsights = null;
    if (process.env.GEMINI_API_KEY && postingPatterns) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Analyze this creator's data and provide 3 specific, actionable growth tips.

Creator Stats:
- Followers: ${user.followersCount}
- Posts: ${user.postsCount}
- Total Likes: ${user.likesCount}
- Engagement Rate: ${engagementRate} likes per post
- Best posting hours: ${postingPatterns.bestHours.map(h => h.timeSlot).join(', ')}
- Best days: ${postingPatterns.bestDays.map(d => d.day).join(', ')}
- Primary category: ${hashtagStrategy.primaryCategory || 'mixed'}

Trending on platform:
- Hot categories: ${trendingTopics.categories.slice(0, 3).map(c => c.name).join(', ')}
- Rising tags: ${trendingTopics.risingTags.slice(0, 5).map(t => t.tag).join(', ')}

Provide 3 concise, specific tips (one sentence each). Format as JSON:
{"tips": ["tip1", "tip2", "tip3"]}`;

        const result = await model.generateContent(prompt);
        const content = result.response.text();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          aiInsights = JSON.parse(jsonMatch[0]).tips;
        }
      } catch (err) {
        console.error('AI insights error:', err.message);
      }
    }

    return {
      success: true,
      userId,
      username: user.username,
      currentStats: {
        followers: user.followersCount,
        following: user.followingCount,
        posts: user.postsCount,
        totalLikes: user.likesCount,
        engagementRate,
        badge: user.badge,
        accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      },
      bestPostingTimes: postingPatterns?.bestHours || [],
      bestPostingDays: postingPatterns?.bestDays || [],
      trendingTopics: {
        categories: trendingTopics.categories.slice(0, 3),
        tags: trendingTopics.tags.slice(0, 10),
        rising: trendingTopics.risingTags
      },
      hashtagStrategy: {
        topPerforming: hashtagStrategy.topPerforming?.slice(0, 5) || [],
        recommended: hashtagStrategy.recommended || [],
        tip: hashtagStrategy.strategy
      },
      aiInsights: aiInsights || [
        'Post consistently to build audience engagement',
        'Engage with comments to boost visibility',
        'Use trending tags relevant to your content'
      ],
      recommendations: generateQuickRecommendations(user, postingPatterns, engagementRate)
    };

  } catch (error) {
    console.error('Growth recommendations error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate quick actionable recommendations
 */
const generateQuickRecommendations = (user, patterns, engagementRate) => {
  const recs = [];

  // Posting frequency
  if (patterns && patterns.postingFrequency.avgPerWeek < 3) {
    recs.push({
      type: 'frequency',
      priority: 'high',
      title: 'Post More Often',
      description: 'Try posting 3-5 times per week to increase visibility and engagement.'
    });
  }

  // Engagement rate
  if (engagementRate < 5) {
    recs.push({
      type: 'engagement',
      priority: 'high',
      title: 'Boost Engagement',
      description: 'Reply to comments and engage with other creators to build community.'
    });
  }

  // Follower ratio
  if (user.followingCount > user.followersCount * 2) {
    recs.push({
      type: 'growth',
      priority: 'medium',
      title: 'Focus on Quality',
      description: 'Create standout content rather than follow-for-follow strategies.'
    });
  }

  // Consistency
  if (patterns && patterns.bestHours.length > 0) {
    recs.push({
      type: 'timing',
      priority: 'medium',
      title: 'Optimize Timing',
      description: `Post around ${patterns.bestHours[0].timeSlot} for best engagement.`
    });
  }

  return recs.slice(0, 5);
};

/**
 * Get competitor analysis
 * @param {string} userId - User ID
 * @returns {Object} - Competitor insights
 */
export const getCompetitorInsights = async (userId) => {
  try {
    const user = await User.findById(userId).select('followersCount postsCount likesCount');
    
    // Find similar-sized creators
    const similarCreators = await User.find({
      _id: { $ne: userId },
      followersCount: { 
        $gte: Math.max(0, user.followersCount - 100),
        $lte: user.followersCount + 500 
      },
      postsCount: { $gte: 5 }
    })
    .select('username followersCount postsCount likesCount')
    .sort({ likesCount: -1 })
    .limit(10)
    .lean();

    // Calculate averages
    const avgFollowers = similarCreators.reduce((sum, c) => sum + c.followersCount, 0) / similarCreators.length || 0;
    const avgLikesPerPost = similarCreators.reduce((sum, c) => sum + (c.likesCount / c.postsCount), 0) / similarCreators.length || 0;

    const userLikesPerPost = user.postsCount > 0 ? user.likesCount / user.postsCount : 0;

    return {
      success: true,
      yourStats: {
        followers: user.followersCount,
        likesPerPost: Math.round(userLikesPerPost * 10) / 10
      },
      peerAverage: {
        followers: Math.round(avgFollowers),
        likesPerPost: Math.round(avgLikesPerPost * 10) / 10
      },
      comparison: {
        followersVsPeers: user.followersCount >= avgFollowers ? 'above' : 'below',
        engagementVsPeers: userLikesPerPost >= avgLikesPerPost ? 'above' : 'below'
      },
      topPerformers: similarCreators.slice(0, 3).map(c => ({
        username: c.username,
        followers: c.followersCount,
        engagement: Math.round((c.likesCount / c.postsCount) * 10) / 10
      }))
    };

  } catch (error) {
    console.error('Competitor insights error:', error);
    return { success: false, error: error.message };
  }
};

export default { getGrowthRecommendations, getCompetitorInsights };
