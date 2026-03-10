import { createChatCompletion, hasAIKeys } from './aiClient.js';
import { Image } from '../models/image.model.js';
import { Comment } from '../models/comment.model.js';
import { User } from '../models/user.model.js';

/**
 * AI Auto-Reply Suggestions
 * Generates smart reply suggestions for comments on posts
 * Considers the image context, comment sentiment, and user's tone
 */

/**
 * Analyze comment sentiment and intent
 * @param {string} commentText - The comment to analyze
 * @returns {Object} - Sentiment analysis result
 */
const analyzeCommentSentiment = (commentText) => {
  const text = commentText.toLowerCase();
  
  // Positive indicators
  const positiveWords = ['love', 'amazing', 'beautiful', 'great', 'awesome', 'stunning', 'incredible', 'fantastic', 'perfect', 'gorgeous', 'wow', 'nice', 'cool', 'fire', '🔥', '❤️', '😍', '👏', '💯'];
  
  // Question indicators
  const questionWords = ['how', 'what', 'where', 'when', 'why', 'which', 'can', 'could', 'would', 'is this', 'are you', '?'];
  
  // Critique indicators
  const critiqueWords = ['but', 'however', 'maybe', 'could be', 'try', 'suggest', 'improve'];
  
  let sentiment = 'neutral';
  let isQuestion = false;
  let isCritique = false;
  
  if (positiveWords.some(word => text.includes(word))) {
    sentiment = 'positive';
  }
  
  if (questionWords.some(word => text.includes(word))) {
    isQuestion = true;
  }
  
  if (critiqueWords.some(word => text.includes(word))) {
    isCritique = true;
  }
  
  return { sentiment, isQuestion, isCritique };
};

/**
 * Get context about the image for better reply suggestions
 * @param {string} imageId - Image ID
 * @returns {Object} - Image context
 */
const getImageContext = async (imageId) => {
  try {
    const image = await Image.findById(imageId)
      .select('title description category tags')
      .lean();
    
    if (!image) return null;
    
    return {
      title: image.title || 'Untitled',
      description: image.description || '',
      category: image.category || 'other',
      tags: image.tags || []
    };
  } catch (error) {
    console.error('Error getting image context:', error);
    return null;
  }
};

/**
 * Get the post owner's typical reply style from previous comments
 * @param {string} userId - Post owner's user ID
 * @returns {Object} - Reply style analysis
 */
const getUserReplyStyle = async (userId) => {
  try {
    // Get user's recent replies to comments on their posts
    const userImages = await Image.find({ user: userId }).select('_id').limit(10).lean();
    const imageIds = userImages.map(img => img._id);
    
    // Get comments on these images that the user replied to
    const replies = await Comment.find({
      image: { $in: imageIds },
      user: userId,
      parentComment: { $exists: true, $ne: null }
    })
    .select('content')
    .limit(20)
    .lean();
    
    if (replies.length === 0) {
      return { style: 'friendly', avgLength: 'short', usesEmoji: true };
    }
    
    // Analyze reply patterns
    const avgLength = replies.reduce((sum, r) => sum + r.content.length, 0) / replies.length;
    const emojiCount = replies.filter(r => /[\u{1F300}-\u{1F9FF}]/u.test(r.content)).length;
    
    return {
      style: avgLength > 100 ? 'detailed' : 'concise',
      avgLength: avgLength > 100 ? 'long' : avgLength > 50 ? 'medium' : 'short',
      usesEmoji: emojiCount > replies.length / 2
    };
  } catch (error) {
    console.error('Error analyzing user style:', error);
    return { style: 'friendly', avgLength: 'short', usesEmoji: true };
  }
};

/**
 * Generate fallback reply suggestions without AI
 * @param {string} commentText - Original comment
 * @param {Object} sentiment - Sentiment analysis
 * @returns {string[]} - Array of suggested replies
 */
const getFallbackSuggestions = (commentText, sentiment) => {
  if (sentiment.isQuestion) {
    return [
      "Great question! Let me explain...",
      "Thanks for asking! Here's the story behind it ✨",
      "Good question! I used natural lighting for this shot"
    ];
  }
  
  if (sentiment.sentiment === 'positive') {
    return [
      "Thank you so much! 🙏",
      "Means a lot! Thanks for the kind words ❤️",
      "Glad you like it! More coming soon 🚀"
    ];
  }
  
  if (sentiment.isCritique) {
    return [
      "Thanks for the feedback! I'll keep that in mind",
      "Appreciate the suggestion! Always learning 📸",
      "Good point! I'll try that next time"
    ];
  }
  
  return [
    "Thanks for stopping by! 🙌",
    "Appreciate you! ❤️",
    "Thank you! More content coming soon 🚀"
  ];
};

/**
 * Generate AI-powered reply suggestions for a comment
 * @param {string} commentId - Comment ID to reply to
 * @param {string} userId - User ID (post owner)
 * @returns {Object} - Array of suggested replies
 */
export const generateReplySuggestions = async (commentId, userId) => {
  try {
    // Get the comment
    const comment = await Comment.findById(commentId)
      .populate('user', 'username fullName')
      .populate('image', 'title description category tags user')
      .lean();
    
    if (!comment) {
      throw new Error('Comment not found');
    }
    
    // Verify user owns the image
    if (comment.image.user.toString() !== userId) {
      throw new Error('Not authorized to get suggestions for this comment');
    }
    
    const commentText = comment.content;
    const commenterName = comment.user?.fullName || comment.user?.username || 'User';
    
    // Analyze sentiment
    const sentiment = analyzeCommentSentiment(commentText);
    
    // Get image context
    const imageContext = {
      title: comment.image.title || 'Untitled',
      description: comment.image.description || '',
      category: comment.image.category || 'other',
      tags: comment.image.tags || []
    };
    
    // Get user's reply style
    const replyStyle = await getUserReplyStyle(userId);
    
    // Check if AI is available
    if (!hasAIKeys()) {
      console.warn('AI keys not configured, using fallback suggestions');
      return {
        suggestions: getFallbackSuggestions(commentText, sentiment),
        sentiment: sentiment.sentiment,
        isQuestion: sentiment.isQuestion
      };
    }
    
    const prompt = `You are helping a content creator reply to a comment on their ${imageContext.category} image titled "${imageContext.title}".

Comment from ${commenterName}: "${commentText}"

Image context:
- Category: ${imageContext.category}
- Tags: ${imageContext.tags.join(', ') || 'none'}
- Description: ${imageContext.description || 'No description'}

Creator's reply style: ${replyStyle.style}, ${replyStyle.avgLength} replies, ${replyStyle.usesEmoji ? 'uses emojis' : 'minimal emojis'}

Generate 3 different reply suggestions that:
1. Are authentic and conversational (not robotic)
2. Match the creator's typical style
3. Are appropriate for the comment's tone (${sentiment.sentiment})
4. ${sentiment.isQuestion ? 'Answer the question if possible' : 'Engage meaningfully'}
5. Are concise (under 150 characters each)
6. Include 1-2 relevant emojis if the creator typically uses them

Respond ONLY with valid JSON (no markdown):
{
  "suggestions": ["reply 1", "reply 2", "reply 3"],
  "sentiment": "${sentiment.sentiment}",
  "isQuestion": ${sentiment.isQuestion}
}`;

    const completion = await createChatCompletion({
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }]
    });
    const content = completion.choices[0].message.content;
    
    // Parse response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        suggestions: parsed.suggestions || getFallbackSuggestions(commentText, sentiment),
        sentiment: parsed.sentiment || sentiment.sentiment,
        isQuestion: parsed.isQuestion || sentiment.isQuestion,
        commenterName
      };
    }
    
    return {
      suggestions: getFallbackSuggestions(commentText, sentiment),
      sentiment: sentiment.sentiment,
      isQuestion: sentiment.isQuestion,
      commenterName
    };
    
  } catch (error) {
    console.error('Error generating reply suggestions:', error);
    throw error;
  }
};

/**
 * Generate quick reply options for common scenarios
 * @returns {Object} - Quick reply templates by category
 */
export const getQuickReplyTemplates = () => {
  return {
    gratitude: [
      "Thank you! 🙏",
      "Appreciate it! ❤️",
      "Means a lot! Thanks 😊",
      "So grateful for this! 💫"
    ],
    question: [
      "Great question! ",
      "Let me explain - ",
      "Good point! Here's the thing - ",
      "Thanks for asking! "
    ],
    encouragement: [
      "You got this! 💪",
      "Keep creating! 🚀",
      "Can't wait to see yours!",
      "Looking forward to more from you!"
    ],
    humor: [
      "Haha, thanks! 😂",
      "You made my day! 😄",
      "LOL appreciate it!",
      "That's hilarious! 🤣"
    ]
  };
};

export default { generateReplySuggestions, getQuickReplyTemplates };
