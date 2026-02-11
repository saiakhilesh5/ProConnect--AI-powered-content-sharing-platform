import { GoogleGenerativeAI } from '@google/generative-ai';
import { Image } from '../models/image.model.js';
import { User } from '../models/user.model.js';
import { Like } from '../models/like.model.js';
import { Follow } from '../models/follow.model.js';

/**
 * AI Chat Assistant
 * Helps users with image-related queries using their data and engagement stats
 */

/**
 * Get user context for AI responses
 */
const getUserContext = async (userId) => {
  try {
    const user = await User.findById(userId).select('username fullName postsCount followersCount followingCount likesCount badge isPremium createdAt');
    if (!user) return null;

    // Get user's recent images with stats
    const recentImages = await Image.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title description category tags viewsCount likesCount commentsCount sharesCount createdAt visibility');

    // Calculate average engagement
    const totalImages = recentImages.length;
    const avgViews = totalImages > 0 ? Math.round(recentImages.reduce((sum, img) => sum + (img.viewsCount || 0), 0) / totalImages) : 0;
    const avgLikes = totalImages > 0 ? Math.round(recentImages.reduce((sum, img) => sum + (img.likesCount || 0), 0) / totalImages) : 0;
    const avgComments = totalImages > 0 ? Math.round(recentImages.reduce((sum, img) => sum + (img.commentsCount || 0), 0) / totalImages) : 0;

    // Get best performing image
    const bestImage = recentImages.length > 0 
      ? recentImages.reduce((best, img) => (img.likesCount || 0) > (best.likesCount || 0) ? img : best, recentImages[0])
      : null;

    // Get most used categories and tags
    const categoryCount = {};
    const tagCount = {};
    recentImages.forEach(img => {
      categoryCount[img.category] = (categoryCount[img.category] || 0) + 1;
      (img.tags || []).forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });

    const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cat]) => cat);
    const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag);

    return {
      user: {
        username: user.username,
        fullName: user.fullName,
        postsCount: user.postsCount,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        likesCount: user.likesCount,
        badge: user.badge,
        isPremium: user.isPremium,
        accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) // days
      },
      engagement: {
        avgViews,
        avgLikes,
        avgComments,
        totalImages
      },
      bestImage: bestImage ? {
        title: bestImage.title,
        category: bestImage.category,
        likes: bestImage.likesCount,
        views: bestImage.viewsCount
      } : null,
      topCategories,
      topTags,
      recentImages: recentImages.slice(0, 5).map(img => ({
        title: img.title,
        category: img.category,
        likes: img.likesCount || 0,
        views: img.viewsCount || 0,
        comments: img.commentsCount || 0
      }))
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
};

/**
 * Get image context for specific image queries
 */
const getImageContext = async (imageId) => {
  try {
    const image = await Image.findById(imageId)
      .populate('user', 'username fullName followersCount')
      .select('title description category tags viewsCount likesCount commentsCount sharesCount createdAt visibility imageUrl');
    
    if (!image) return null;

    return {
      title: image.title,
      description: image.description,
      category: image.category,
      tags: image.tags,
      views: image.viewsCount || 0,
      likes: image.likesCount || 0,
      comments: image.commentsCount || 0,
      shares: image.sharesCount || 0,
      visibility: image.visibility,
      createdAt: image.createdAt,
      author: {
        username: image.user?.username,
        followers: image.user?.followersCount || 0
      }
    };
  } catch (error) {
    console.error('Error getting image context:', error);
    return null;
  }
};

/**
 * Get platform trending data
 */
const getTrendingContext = async () => {
  try {
    // Get trending images (most liked in last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trendingImages = await Image.find({ 
      createdAt: { $gte: weekAgo },
      visibility: 'public'
    })
    .sort({ likesCount: -1 })
    .limit(10)
    .select('title category tags likesCount viewsCount');

    // Get trending categories
    const categoryStats = {};
    trendingImages.forEach(img => {
      categoryStats[img.category] = (categoryStats[img.category] || 0) + (img.likesCount || 0);
    });

    // Get trending tags
    const tagStats = {};
    trendingImages.forEach(img => {
      (img.tags || []).forEach(tag => {
        tagStats[tag] = (tagStats[tag] || 0) + 1;
      });
    });

    return {
      trendingCategories: Object.entries(categoryStats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat]) => cat),
      trendingTags: Object.entries(tagStats).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag]) => tag),
      avgTrendingLikes: trendingImages.length > 0 
        ? Math.round(trendingImages.reduce((sum, img) => sum + (img.likesCount || 0), 0) / trendingImages.length)
        : 0
    };
  } catch (error) {
    console.error('Error getting trending context:', error);
    return null;
  }
};

/**
 * Main chat function
 */
export const chatWithAssistant = async (userId, message, imageId = null) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return {
        success: false,
        message: "AI Assistant is not configured. Please contact support."
      };
    }

    // Gather context
    const userContext = await getUserContext(userId);
    const imageContext = imageId ? await getImageContext(imageId) : null;
    const trendingContext = await getTrendingContext();

    // Build system prompt with context
    const systemPrompt = `You are Pixora AI Assistant, a helpful and friendly assistant for the Pixora image sharing platform. You help users with:
- Understanding their image performance and engagement
- Suggesting improvements for their content
- Explaining why posts may or may not be trending
- Providing caption and tag suggestions
- Offering growth tips and strategies

IMPORTANT RULES:
- Be concise and helpful (max 150 words per response)
- Use emojis sparingly for friendliness
- Give specific, actionable advice based on the data
- If asked about images, refer to the user's actual stats
- Be encouraging but honest

USER CONTEXT:
${userContext ? JSON.stringify(userContext, null, 2) : 'No user data available'}

${imageContext ? `CURRENT IMAGE CONTEXT:\n${JSON.stringify(imageContext, null, 2)}` : ''}

PLATFORM TRENDING DATA:
${trendingContext ? JSON.stringify(trendingContext, null, 2) : 'No trending data available'}

Current date: ${new Date().toLocaleDateString()}`;

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const chat = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    });

    // Send message with system context
    const result = await chat.sendMessage(`${systemPrompt}\n\nUser question: ${message}`);
    const response = result.response.text();

    return {
      success: true,
      message: response,
      context: {
        hasUserData: !!userContext,
        hasImageData: !!imageContext,
        hasTrendingData: !!trendingContext
      }
    };
  } catch (error) {
    console.error('AI Chat error:', error);
    return {
      success: false,
      message: "Sorry, I'm having trouble right now. Please try again later."
    };
  }
};

/**
 * Get caption suggestions for an image
 */
export const suggestCaptions = async (imageUrl, category = 'other') => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { success: false, captions: [] };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Fetch image as base64
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(arrayBuffer).toString('base64');

    const prompt = `Analyze this image and suggest 5 creative, engaging captions for social media. 
The image category is: ${category}

Return ONLY a JSON array of 5 caption strings, no markdown:
["caption1", "caption2", "caption3", "caption4", "caption5"]

Make captions:
- Engaging and creative
- Varied in style (funny, inspirational, descriptive, etc.)
- Include relevant emojis
- 50-100 characters each`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
    ]);

    const content = result.response.text();
    
    // Parse JSON array
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const captions = JSON.parse(jsonMatch[0]);
      return { success: true, captions };
    }

    return { success: false, captions: [] };
  } catch (error) {
    console.error('Caption suggestion error:', error);
    return { success: false, captions: [] };
  }
};

export default { chatWithAssistant, suggestCaptions };
