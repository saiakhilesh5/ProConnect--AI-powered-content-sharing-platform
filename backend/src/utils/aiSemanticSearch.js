import { GoogleGenerativeAI } from '@google/generative-ai';
import { Image } from '../models/image.model.js';

/**
 * AI Semantic Image Search Utility
 * Allows natural language queries to find relevant images
 * Uses Gemini AI for query understanding and semantic matching
 */

/**
 * Parse natural language query into search parameters
 * @param {string} query - User's natural language query
 * @returns {Object} - Parsed search parameters
 */
const parseNaturalLanguageQuery = async (query) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { keywords: query.split(' '), category: null, mood: null, style: null };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Analyze this image search query and extract search parameters.
Query: "${query}"

Valid categories: abstract, portrait, landscape, cyberpunk, minimal, other

Respond ONLY with valid JSON (no markdown):
{
  "keywords": ["keyword1", "keyword2"],
  "category": "category or null",
  "mood": "happy/sad/dramatic/calm/energetic/mysterious or null",
  "style": "photography/digital-art/illustration/3d/painting or null",
  "colors": ["color1", "color2"] or [],
  "timeContext": "day/night/sunrise/sunset or null",
  "subject": "person/animal/nature/architecture/object or null"
}`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return { keywords: query.split(' '), category: null };
  } catch (error) {
    console.error('Error parsing query:', error);
    return { keywords: query.split(' '), category: null };
  }
};

/**
 * Calculate semantic relevance score between query and image
 * @param {Object} queryParams - Parsed query parameters
 * @param {Object} image - Image document
 * @returns {number} - Relevance score (0-100)
 */
const calculateRelevanceScore = (queryParams, image) => {
  let score = 0;
  let maxScore = 0;

  // Keyword matching in title and description
  const keywords = queryParams.keywords || [];
  const titleLower = (image.title || '').toLowerCase();
  const descLower = (image.description || '').toLowerCase();
  const tagsLower = (image.tags || []).map(t => t.toLowerCase());

  keywords.forEach(keyword => {
    const kw = keyword.toLowerCase();
    maxScore += 30;
    
    if (titleLower.includes(kw)) score += 30;
    else if (descLower.includes(kw)) score += 20;
    else if (tagsLower.some(t => t.includes(kw))) score += 25;
  });

  // Category matching
  if (queryParams.category && image.category) {
    maxScore += 25;
    if (image.category.toLowerCase() === queryParams.category.toLowerCase()) {
      score += 25;
    }
  }

  // Tag overlap
  if (queryParams.keywords && image.tags) {
    maxScore += 20;
    const matchingTags = image.tags.filter(tag => 
      keywords.some(kw => tag.toLowerCase().includes(kw.toLowerCase()))
    );
    score += Math.min(20, matchingTags.length * 5);
  }

  // Color matching (if colors are stored in tags)
  if (queryParams.colors && queryParams.colors.length > 0) {
    maxScore += 15;
    const colorMatches = queryParams.colors.filter(c => 
      tagsLower.some(t => t.includes(c.toLowerCase()))
    );
    score += colorMatches.length * 5;
  }

  // Normalize score to 0-100
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
};

/**
 * Perform semantic image search
 * @param {string} query - Natural language search query
 * @param {Object} options - Search options
 * @returns {Object} - Search results with relevance scores
 */
export const semanticSearch = async (query, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      userId = null,
      followingIds = []
    } = options;

    console.log('Performing semantic search for:', query);

    // Parse the natural language query
    const queryParams = await parseNaturalLanguageQuery(query);
    console.log('Parsed query params:', queryParams);

    // Build base MongoDB query
    let mongoQuery = { visibility: 'public' };

    // If user is logged in, include their images and followers-only content
    if (userId) {
      mongoQuery = {
        $or: [
          { visibility: 'public' },
          { visibility: 'followers', user: { $in: followingIds } },
          { user: userId }
        ]
      };
    }

    // Add category filter if detected
    if (queryParams.category) {
      mongoQuery.category = queryParams.category;
    }

    // Build text search query from keywords
    const keywords = queryParams.keywords || [];
    if (keywords.length > 0) {
      const keywordRegex = keywords.map(k => new RegExp(k, 'i'));
      
      mongoQuery.$or = [
        { title: { $in: keywordRegex } },
        { description: { $in: keywordRegex } },
        { tags: { $in: keywords.map(k => new RegExp(k, 'i')) } }
      ];
    }

    // Fetch candidates (more than needed for re-ranking)
    const candidates = await Image.find(mongoQuery)
      .populate('user', 'username profilePicture')
      .sort({ likesCount: -1, createdAt: -1 })
      .limit(100)
      .lean();

    // Score each candidate for semantic relevance
    const scoredResults = candidates.map(image => ({
      ...image,
      relevanceScore: calculateRelevanceScore(queryParams, image)
    }));

    // Sort by relevance score
    scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Filter out low relevance results
    const relevantResults = scoredResults.filter(r => r.relevanceScore >= 20);

    // Paginate
    const skip = (page - 1) * limit;
    const paginatedResults = relevantResults.slice(skip, skip + limit);

    return {
      success: true,
      query: query,
      parsedQuery: queryParams,
      results: paginatedResults,
      metadata: {
        total: relevantResults.length,
        page,
        limit,
        pages: Math.ceil(relevantResults.length / limit)
      }
    };

  } catch (error) {
    console.error('Semantic search error:', error);
    return {
      success: false,
      query,
      results: [],
      error: error.message
    };
  }
};

/**
 * Find visually similar images using AI
 * @param {string} imageUrl - URL of reference image
 * @param {number} limit - Maximum results
 * @returns {Object} - Similar images
 */
export const findSimilarImages = async (imageUrl, limit = 10) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { success: false, results: [], error: 'AI not configured' };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Analyze the reference image
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(arrayBuffer).toString('base64');

    const prompt = `Analyze this image and provide search parameters to find similar images.

Respond ONLY with valid JSON (no markdown):
{
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "category": "abstract/portrait/landscape/cyberpunk/minimal/other",
  "style": "description of visual style",
  "mood": "mood of the image",
  "colors": ["dominant_color1", "dominant_color2"]
}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
    ]);

    const content = result.response.text();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return { success: false, results: [], error: 'Failed to analyze image' };
    }

    const imageParams = JSON.parse(jsonMatch[0]);

    // Search for similar images using extracted parameters
    const searchQuery = imageParams.keywords.join(' ') + ' ' + (imageParams.style || '');
    const searchResults = await semanticSearch(searchQuery, { limit });

    return {
      success: true,
      referenceAnalysis: imageParams,
      results: searchResults.results.filter(img => img.imageUrl !== imageUrl)
    };

  } catch (error) {
    console.error('Find similar images error:', error);
    return {
      success: false,
      results: [],
      error: error.message
    };
  }
};

/**
 * Get search suggestions based on partial query
 * @param {string} partialQuery - Partial search query
 * @returns {string[]} - Array of suggestions
 */
export const getSearchSuggestions = async (partialQuery) => {
  try {
    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }

    // Get popular tags that match
    const matchingTags = await Image.aggregate([
      { $unwind: '$tags' },
      { 
        $match: { 
          tags: { $regex: partialQuery, $options: 'i' },
          visibility: 'public'
        } 
      },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Get matching titles
    const matchingTitles = await Image.find({
      title: { $regex: partialQuery, $options: 'i' },
      visibility: 'public'
    })
    .select('title')
    .limit(5)
    .lean();

    const suggestions = [
      ...matchingTags.map(t => t._id),
      ...matchingTitles.map(i => i.title)
    ];

    // Remove duplicates and limit
    return [...new Set(suggestions)].slice(0, 8);

  } catch (error) {
    console.error('Search suggestions error:', error);
    return [];
  }
};

export default { semanticSearch, findSimilarImages, getSearchSuggestions };
