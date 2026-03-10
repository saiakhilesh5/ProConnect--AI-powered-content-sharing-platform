import { createChatCompletion, hasAIKeys } from './aiClient.js';
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
 * Search images in the platform by keyword for chat results
 */
const searchImagesInPlatform = async (query, limit = 5) => {
  try {
    const keywords = query.split(/\s+/).filter(k => k.length > 2);
    if (keywords.length === 0) return [];

    const regex = new RegExp(keywords.join('|'), 'i');

    const images = await Image.find({
      visibility: 'public',
      $or: [
        { title: regex },
        { description: regex },
        { tags: { $in: keywords } },
        { category: regex },
      ]
    })
      .sort({ likesCount: -1 })
      .limit(limit)
      .populate('user', 'username fullName profilePicture')
      .select('title imageUrl likesCount category tags user _id');

    return images.map(img => ({
      _id: img._id,
      title: img.title,
      imageUrl: img.imageUrl,
      likesCount: img.likesCount || 0,
      category: img.category,
      author: {
        username: img.user?.username,
        fullName: img.user?.fullName,
        profilePicture: img.user?.profilePicture || null,
      }
    }));
  } catch (error) {
    console.error('Image search error:', error);
    return [];
  }
};

/**
 * Detect if message is asking to find/show images from the platform
 */
const detectImageSearchIntent = (message) => {
  const lower = message.toLowerCase();
  const intents = ['show', 'find', 'give', 'display', 'search', 'get', 'list', 'recommend', 'suggest', 'fetch', 'bring'];
  const imageWords = ['image', 'images', 'photo', 'photos', 'picture', 'pictures', 'post', 'posts', 'content', 'related'];
  const platformWords = ['website', 'platform', 'app', 'here', 'proconnect', 'in the', 'from the', 'on the'];

  const hasIntent = intents.some(w => lower.includes(w));
  const hasImageWord = imageWords.some(w => lower.includes(w));
  const hasPlatformWord = platformWords.some(w => lower.includes(w));

  // Also detect bare category queries like "nature images" or "landscape photos"
  const bareQuery = /\b(nature|landscape|portrait|food|travel|architecture|animals|sports|abstract|fashion|street|wildlife|ocean|mountain|forest|city|flowers|sunset|beach)\s+(images?|photos?|pictures?|posts?)\b/i.test(lower);

  return bareQuery || (hasIntent && (hasImageWord || hasPlatformWord));
};

/**
 * Extract search topic from message
 */
const extractSearchTopic = (message) => {
  return message
    .toLowerCase()
    .replace(/show me|give me|find me|search for|display|get me|list|recommend|suggest|fetch|bring me/g, '')
    .replace(/related images?|related photos?|related pictures?|images?|photos?|pictures?|posts?|content/g, '')
    .replace(/in the website|on the platform|on the app|from the website|in proconnect|here|from here/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};


export const chatWithAssistant = async (userId, message, imageId = null) => {
  try {
    if (!hasAIKeys()) {
      return {
        success: false,
        message: "AI Assistant is not configured. Please contact support."
      };
    }

    // Check if user is searching for images from the platform
    let platformImages = [];
    if (detectImageSearchIntent(message)) {
      const topic = extractSearchTopic(message);
      if (topic.length > 1) {
        platformImages = await searchImagesInPlatform(topic, 5);
      }
    }

    // Gather context
    const userContext = await getUserContext(userId);
    const imageContext = imageId ? await getImageContext(imageId) : null;
    const trendingContext = await getTrendingContext();

    // Build system prompt with context
    const systemPrompt = `You are ProConnect AI Assistant, a helpful and friendly assistant for the ProConnect professional networking platform. You help users with:
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

${platformImages.length > 0 ? `SEARCH RESULTS: Found ${platformImages.length} matching images from the platform. Tell the user you found these images and they are shown below. Mention the top image title and its like count.` : ''}

PLATFORM TRENDING DATA:
${trendingContext ? JSON.stringify(trendingContext, null, 2) : 'No trending data available'}

Current date: ${new Date().toLocaleDateString()}`;

    // Send message with system context
    const completion = await createChatCompletion({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    const response = completion.choices[0].message.content;

    return {
      success: true,
      message: response,
      images: platformImages.length > 0 ? platformImages : undefined,
      context: {
        hasUserData: !!userContext,
        hasImageData: !!imageContext,
        hasTrendingData: !!trendingContext
      }
    };
  } catch (error) {
    console.error('AI Chat error:', error?.status, error?.message);
    if (error?.status === 403) {
      return {
        success: false,
        message: "AI service quota exceeded or billing issue. Please contact the administrator."
      };
    }
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
    if (!hasAIKeys()) {
      return { success: false, captions: [] };
    }

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

    const completion = await createChatCompletion({
      model: 'gemini-2.5-flash',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        ]
      }]
    });

    const content = completion.choices[0].message.content;
    
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
