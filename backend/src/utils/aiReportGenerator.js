import { GoogleGenerativeAI } from '@google/generative-ai';
import { Image } from '../models/image.model.js';
import { User } from '../models/user.model.js';
import { Like } from '../models/like.model.js';
import { Comment } from '../models/comment.model.js';
import { Follow } from '../models/follow.model.js';

/**
 * AI Report Generator for Admin Dashboard
 * Generates comprehensive analytics reports using AI
 */

/**
 * Get platform statistics for a given time period
 */
const getPlatformStats = async (startDate, endDate) => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: startDate }
    });
    const bannedUsers = await User.countDocuments({ isBanned: true });
    const premiumUsers = await User.countDocuments({ isPremium: true });

    // User growth by day
    const userGrowthData = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Image statistics
    const totalImages = await Image.countDocuments();
    const newImages = await Image.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Engagement statistics
    const totalLikes = await Like.countDocuments();
    const newLikes = await Like.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const totalComments = await Comment.countDocuments();
    const newComments = await Comment.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const totalFollows = await Follow.countDocuments();
    const newFollows = await Follow.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Category breakdown
    const categoryStats = await Image.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalLikes: { $sum: "$likesCount" },
          totalViews: { $sum: "$viewsCount" },
          totalComments: { $sum: "$commentsCount" }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Top trending images
    const trendingImages = await Image.find({
      createdAt: { $gte: startDate, $lte: endDate }
    })
      .sort({ likesCount: -1 })
      .limit(10)
      .select('title category likesCount viewsCount commentsCount')
      .populate('user', 'username');

    // Top creators
    const topCreators = await Image.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$user",
          totalPosts: { $sum: 1 },
          totalLikes: { $sum: "$likesCount" },
          totalViews: { $sum: "$viewsCount" }
        }
      },
      { $sort: { totalLikes: -1 } },
      { $limit: 10 }
    ]);

    // Populate top creators
    const populatedCreators = await User.populate(topCreators, {
      path: '_id',
      select: 'username fullName profilePicture badge'
    });

    // Trending tags
    const trendingTags = await Image.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: "$tags" },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 },
          totalLikes: { $sum: "$likesCount" }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // Badge distribution
    const badgeDistribution = await User.aggregate([
      {
        $group: {
          _id: "$badge",
          count: { $sum: 1 }
        }
      }
    ]);

    // Engagement by day of week
    const engagementByDay = await Image.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          posts: { $sum: 1 },
          avgLikes: { $avg: "$likesCount" },
          avgViews: { $avg: "$viewsCount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Content moderation stats
    const warningCount = await User.aggregate([
      { $unwind: "$warnings" },
      {
        $match: {
          "warnings.date": { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$warnings.type",
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      users: {
        total: totalUsers,
        new: newUsers,
        active: activeUsers,
        banned: bannedUsers,
        premium: premiumUsers,
        growthRate: totalUsers > 0 ? ((newUsers / totalUsers) * 100).toFixed(2) : 0,
        dailyGrowth: userGrowthData
      },
      content: {
        totalImages,
        newImages,
        avgImagesPerDay: Math.round(newImages / 7),
        categoryBreakdown: categoryStats
      },
      engagement: {
        totalLikes,
        newLikes,
        totalComments,
        newComments,
        totalFollows,
        newFollows,
        avgLikesPerImage: newImages > 0 ? (newLikes / newImages).toFixed(2) : 0,
        avgCommentsPerImage: newImages > 0 ? (newComments / newImages).toFixed(2) : 0,
        engagementByDay
      },
      trending: {
        topImages: trendingImages,
        topCreators: populatedCreators,
        topTags: trendingTags,
        topCategories: categoryStats.slice(0, 5)
      },
      badges: badgeDistribution,
      moderation: warningCount
    };
  } catch (error) {
    console.error('Error getting platform stats:', error);
    throw error;
  }
};

/**
 * Generate AI-powered insights from the statistics
 */
const generateAIInsights = async (stats, period) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return {
        success: false,
        insights: "AI insights not available. GEMINI_API_KEY not configured."
      };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an analytics expert for Pixora, an image sharing platform. Analyze the following platform statistics and generate a comprehensive report with actionable insights.

PERIOD: ${period}

PLATFORM STATISTICS:
${JSON.stringify(stats, null, 2)}

Generate a detailed report with the following sections. Use markdown formatting:

## 📊 Executive Summary
- Brief overview of platform health (2-3 sentences)
- Key highlight of the period

## 👥 User Growth Analysis
- User growth trends
- New vs returning user ratio
- Notable patterns

## 📸 Content Performance
- Most successful content categories
- Upload trends
- Content quality indicators

## 💫 Engagement Insights
- Engagement rate analysis
- Peak activity times
- User interaction patterns

## 🔥 Trending Analysis
- Top performing categories
- Emerging trends
- Popular tags analysis

## ⚠️ Areas of Concern
- Any declining metrics
- Content moderation issues
- Potential problems to address

## 💡 Recommendations
- 3-5 actionable recommendations
- Growth opportunities
- Platform improvement suggestions

## 📈 Predictions
- Expected trends for next period
- Growth forecast

Keep the report concise but insightful. Use emojis sparingly for visual appeal. Include specific numbers from the data.`;

    const result = await model.generateContent(prompt);
    const insights = result.response.text();

    return {
      success: true,
      insights
    };
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return {
      success: false,
      insights: "Failed to generate AI insights. Please try again."
    };
  }
};

/**
 * Main function to generate the complete report
 */
export const generateAdminReport = async (period = 'weekly') => {
  try {
    const now = new Date();
    let startDate;
    let periodLabel;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        periodLabel = 'Last 24 Hours';
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        periodLabel = 'Last 7 Days';
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        periodLabel = 'Last 30 Days';
        break;
      case 'quarterly':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        periodLabel = 'Last 90 Days';
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        periodLabel = 'Last 7 Days';
    }

    // Get platform statistics
    const stats = await getPlatformStats(startDate, now);

    // Generate AI insights
    const aiResult = await generateAIInsights(stats, periodLabel);

    return {
      success: true,
      report: {
        generatedAt: now.toISOString(),
        period: periodLabel,
        periodStart: startDate.toISOString(),
        periodEnd: now.toISOString(),
        statistics: stats,
        aiInsights: aiResult.insights,
        aiGenerated: aiResult.success
      }
    };
  } catch (error) {
    console.error('Error generating admin report:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get quick stats for dashboard widgets
 */
export const getQuickStats = async () => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Current week stats
    const currentWeekUsers = await User.countDocuments({
      createdAt: { $gte: weekAgo }
    });
    const currentWeekImages = await Image.countDocuments({
      createdAt: { $gte: weekAgo }
    });
    const currentWeekLikes = await Like.countDocuments({
      createdAt: { $gte: weekAgo }
    });

    // Previous week stats for comparison
    const prevWeekUsers = await User.countDocuments({
      createdAt: { $gte: twoWeeksAgo, $lt: weekAgo }
    });
    const prevWeekImages = await Image.countDocuments({
      createdAt: { $gte: twoWeeksAgo, $lt: weekAgo }
    });
    const prevWeekLikes = await Like.countDocuments({
      createdAt: { $gte: twoWeeksAgo, $lt: weekAgo }
    });

    // Calculate percentage changes
    const calcChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return (((current - previous) / previous) * 100).toFixed(1);
    };

    return {
      success: true,
      stats: {
        totalUsers: await User.countDocuments(),
        totalImages: await Image.countDocuments(),
        totalLikes: await Like.countDocuments(),
        totalComments: await Comment.countDocuments(),
        newUsersThisWeek: currentWeekUsers,
        newImagesThisWeek: currentWeekImages,
        newLikesThisWeek: currentWeekLikes,
        userGrowthChange: calcChange(currentWeekUsers, prevWeekUsers),
        imageGrowthChange: calcChange(currentWeekImages, prevWeekImages),
        engagementChange: calcChange(currentWeekLikes, prevWeekLikes)
      }
    };
  } catch (error) {
    console.error('Error getting quick stats:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default { generateAdminReport, getQuickStats };
