import { GoogleGenerativeAI } from '@google/generative-ai';

// Available categories in the app
const VALID_CATEGORIES = ['abstract', 'portrait', 'landscape', 'cyberpunk', 'minimal', 'other'];

/**
 * Fetch image from URL and convert to base64
 */
const fetchImageAsBase64 = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
};

/**
 * Analyze an image using Google Gemini Vision API and generate metadata
 * @param {string} imageUrl - The URL of the image to analyze
 * @returns {Object} - Generated caption, tags, category, and alt text
 */
export const analyzeImage = async (imageUrl) => {
  try {
    console.log('Gemini API Key present:', !!process.env.GEMINI_API_KEY);
    
    if (!process.env.GEMINI_API_KEY) {
      console.warn('Gemini API key not configured, using fallback');
      return getFallbackAnalysis();
    }

    console.log('Calling Gemini Vision API for image:', imageUrl);
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert image analyst for a creative image sharing platform. Analyze this image and provide:
1. A short, catchy title (max 50 characters, ONE LINE ONLY, no periods)
2. A detailed description (2-3 sentences, max 300 characters)
3. Relevant tags for discoverability (5-10 lowercase tags, single words or hyphenated)
4. The best matching category from: ${VALID_CATEGORIES.join(', ')}
5. Descriptive alt text for accessibility (max 150 characters)

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{"title": "Short catchy title", "description": "Detailed description of the image...", "tags": ["tag1", "tag2", "tag3"], "category": "one of the valid categories", "altText": "Descriptive alt text for accessibility"}`;

    // Fetch image and convert to base64
    const imageBase64 = await fetchImageAsBase64(imageUrl);
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      }
    ]);

    const response = await result.response;
    const content = response.text();
    
    console.log('Gemini raw response:', content);

    if (!content) {
      console.error('No content in Gemini response');
      return getFallbackAnalysis();
    }

    // Parse the JSON response
    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      // Also try to find JSON object directly
      const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonStr = jsonObjectMatch[0];
      }
      
      const analysis = JSON.parse(jsonStr.trim());
      
      console.log('Parsed Gemini analysis:', analysis);
      
      // Validate and sanitize the response
      return {
        title: sanitizeTitle(analysis.title),
        description: sanitizeDescription(analysis.description),
        tags: sanitizeTags(analysis.tags),
        category: sanitizeCategory(analysis.category),
        altText: sanitizeAltText(analysis.altText),
        aiGenerated: true
      };
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      console.error('Raw content:', content);
      return getFallbackAnalysis();
    }
  } catch (error) {
    console.error('Gemini Vision API error:', error.message);
    console.error('Full error:', error);
    return getFallbackAnalysis();
  }
};

/**
 * Sanitize title to ensure it's short and one line
 */
const sanitizeTitle = (title) => {
  if (!title || typeof title !== 'string') {
    return 'Untitled Image';
  }
  // Remove line breaks, limit to 50 chars
  return title.replace(/[\r\n]+/g, ' ').slice(0, 50).trim();
};

/**
 * Sanitize description
 */
const sanitizeDescription = (description) => {
  if (!description || typeof description !== 'string') {
    return '';
  }
  return description.slice(0, 500).trim();
};

/**
 * Sanitize tags to ensure they are valid
 */
const sanitizeTags = (tags) => {
  if (!Array.isArray(tags)) {
    return ['photography', 'creative', 'art'];
  }
  
  return tags
    .filter(tag => typeof tag === 'string')
    .map(tag => tag.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'))
    .filter(tag => tag.length > 0 && tag.length <= 30)
    .slice(0, 10);
};

/**
 * Sanitize category to ensure it's valid
 */
const sanitizeCategory = (category) => {
  if (!category || typeof category !== 'string') {
    return 'other';
  }
  
  const normalizedCategory = category.toLowerCase().trim();
  
  if (VALID_CATEGORIES.includes(normalizedCategory)) {
    return normalizedCategory;
  }
  
  // Try to match partial category names
  const match = VALID_CATEGORIES.find(cat => 
    normalizedCategory.includes(cat) || cat.includes(normalizedCategory)
  );
  
  return match || 'other';
};

/**
 * Sanitize alt text for accessibility
 */
const sanitizeAltText = (altText) => {
  if (!altText || typeof altText !== 'string') {
    return 'An uploaded image';
  }
  return altText.slice(0, 150).trim();
};

/**
 * Fallback analysis when AI is unavailable
 */
const getFallbackAnalysis = () => {
  return {
    title: '',
    description: '',
    tags: [],
    category: 'other',
    altText: 'An uploaded image',
    aiGenerated: false,
    fallback: true
  };
};

export default { analyzeImage };
