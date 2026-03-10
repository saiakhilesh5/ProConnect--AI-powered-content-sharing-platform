import OpenAI from 'openai';
import cloudinary from '../config/cloudinary.js';

// Valid categories for reels
const VALID_CATEGORIES = [
  'comedy', 'dance', 'music', 'food', 'fashion', 'travel', 'fitness', 
  'education', 'art', 'gaming', 'sports', 'nature', 'tech', 'beauty',
  'pets', 'diy', 'lifestyle', 'motivation', 'entertainment', 'other'
];

/**
 * Extract frames from a video URL using Cloudinary transformations
 * @param {string} videoUrl - Cloudinary video URL
 * @param {number} numFrames - Number of frames to extract
 * @returns {Promise<string[]>} - Array of frame URLs
 */
const extractVideoFrames = async (videoUrl, numFrames = 3) => {
  try {
    // Extract public ID from Cloudinary URL
    const urlParts = videoUrl.split('/');
    const uploadIndex = urlParts.findIndex(p => p === 'upload');
    const pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, ''); // Remove extension

    // Generate frame URLs at different timestamps
    const frames = [];
    const timestamps = ['so_0.5', 'so_3', 'so_auto']; // Start, middle, auto-detected interesting frame
    
    for (let i = 0; i < Math.min(numFrames, timestamps.length); i++) {
      const frameUrl = cloudinary.url(publicId, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [
          { width: 720, height: 1280, crop: 'fill' },
          { start_offset: timestamps[i] === 'so_auto' ? 'auto' : timestamps[i].replace('so_', '') }
        ]
      });
      frames.push(frameUrl);
    }

    console.log('Extracted frame URLs:', frames);
    return frames;
  } catch (error) {
    console.error('Error extracting video frames:', error);
    return [];
  }
};

/**
 * Fetch image from URL and convert to base64
 */
const fetchImageAsBase64 = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
};

/**
 * Analyze a video/reel using Gemini Vision API and generate metadata
 * @param {string} videoUrl - Cloudinary video URL
 * @param {string} thumbnailUrl - Video thumbnail URL
 * @returns {Object} - Generated caption, hashtags, category, etc.
 */
export const analyzeReel = async (videoUrl, thumbnailUrl) => {
  try {
    console.log('Analyzing reel with Grok...');
    
    if (!process.env.GROK_API_KEY) {
      console.warn('Grok API key not configured, using fallback');
      return getFallbackAnalysis();
    }

    // Initialize Grok (OpenAI-compatible)
    const openai = new OpenAI({ apiKey: process.env.GROK_API_KEY, baseURL: 'https://api.x.ai/v1' });

    // Use thumbnail for analysis (faster than extracting frames)
    let imageBase64;
    try {
      imageBase64 = await fetchImageAsBase64(thumbnailUrl);
    } catch (fetchError) {
      // Fallback: try extracting a frame
      const frames = await extractVideoFrames(videoUrl, 1);
      if (frames.length > 0) {
        imageBase64 = await fetchImageAsBase64(frames[0]);
      } else {
        return getFallbackAnalysis();
      }
    }

    const prompt = `You are an expert social media content analyst for a short-form video platform (like Instagram Reels/TikTok). 
Analyze this video thumbnail/frame and generate engaging metadata for the reel.

Provide:
1. A catchy, engaging caption (1-3 sentences, max 200 chars, conversational/fun tone, can include emojis)
2. Relevant trending hashtags for maximum reach (8-15 hashtags, lowercase, no # symbol)
3. The best matching category from: ${VALID_CATEGORIES.join(', ')}
4. 5-8 descriptive tags for search/discovery (single words or hyphenated)
5. Suggested music mood/genre that would fit this content

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "caption": "Engaging caption with emojis if appropriate ✨",
  "hashtags": ["viral", "trending", "fyp", "foryou", "explore"],
  "category": "one of the valid categories",
  "tags": ["tag1", "tag2", "tag3"],
  "musicMood": "upbeat pop / chill lofi / dramatic / etc"
}`;

    const completion = await openai.chat.completions.create({
      model: 'grok-2-vision-1212',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        ]
      }]
    });

    const content = completion.choices[0].message.content;
    
    console.log('Grok reel analysis raw:', content);

    if (!content) {
      return getFallbackAnalysis();
    }

    // Parse JSON response
    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const analysis = JSON.parse(jsonStr.trim());
    
    return {
      caption: sanitizeCaption(analysis.caption),
      hashtags: sanitizeHashtags(analysis.hashtags),
      category: sanitizeCategory(analysis.category),
      tags: sanitizeTags(analysis.tags),
      musicMood: analysis.musicMood || 'upbeat',
      aiGenerated: true
    };
  } catch (error) {
    console.error('Reel analysis error:', error);
    return getFallbackAnalysis();
  }
};

/**
 * Check video content for NSFW/inappropriate material
 * @param {string} videoUrl - Cloudinary video URL
 * @param {string} thumbnailUrl - Video thumbnail URL
 * @returns {Object} - Moderation result
 */
export const moderateReelContent = async (videoUrl, thumbnailUrl) => {
  try {
    console.log('Moderating reel content...');
    
    if (!process.env.GROK_API_KEY) {
      console.warn('Grok API key not configured, skipping moderation');
      return { safe: true, reason: null, confidence: 0 };
    }

    const openai = new OpenAI({ apiKey: process.env.GROK_API_KEY, baseURL: 'https://api.x.ai/v1' });

    // Extract multiple frames for thorough analysis
    let imagesToAnalyze = [];
    
    // Start with thumbnail
    try {
      const thumbnailBase64 = await fetchImageAsBase64(thumbnailUrl);
      imagesToAnalyze.push(thumbnailBase64);
    } catch (e) {
      console.log('Could not fetch thumbnail');
    }

    // Extract additional frames
    const frames = await extractVideoFrames(videoUrl, 3);
    for (const frameUrl of frames) {
      try {
        const frameBase64 = await fetchImageAsBase64(frameUrl);
        imagesToAnalyze.push(frameBase64);
      } catch (e) {
        console.log('Could not fetch frame');
      }
    }

    if (imagesToAnalyze.length === 0) {
      console.warn('No frames to analyze');
      return { safe: true, reason: null, confidence: 0 };
    }

    // Analyze frames for inappropriate content
    const prompt = `You are a strict content moderation AI for a family-friendly social media platform.
Analyze these video frames thoroughly and detect ANY of the following:

🔴 EXPLICIT CONTENT (immediate rejection):
- Full or partial nudity (including revealing/suggestive clothing)
- Sexual content or suggestive poses
- Pornographic or erotic material
- Intimate/sexual acts

🔴 VIOLENCE (immediate rejection):
- Graphic violence, blood, or gore
- Weapons being used aggressively
- Physical assault or abuse
- Self-harm or suicide content

🔴 HARMFUL CONTENT (immediate rejection):
- Drug use or promotion
- Hate symbols, racist imagery
- Terrorism or extremist content
- Animal cruelty
- Child exploitation (ZERO TOLERANCE)

🟡 BORDERLINE (flag for review):
- Excessive skin exposure (swim wear context matters)
- Mild violence in sports/games context
- Alcohol consumption

Be STRICT. When in doubt, flag as unsafe. This platform has users of all ages.

Respond ONLY with valid JSON:
{
  "safe": true/false,
  "reason": "specific reason if unsafe, null if safe",
  "confidence": 0.0-1.0,
  "category": "explicit/violence/harmful/borderline/safe",
  "details": "brief description of what was detected"
}`;

    const contentParts = [{ type: 'text', text: prompt }];
    for (const imgBase64 of imagesToAnalyze.slice(0, 4)) { // Max 4 frames
      contentParts.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imgBase64}` } });
    }

    const modCompletion = await openai.chat.completions.create({
      model: 'grok-2-vision-1212',
      messages: [{ role: 'user', content: contentParts }]
    });
    const content = modCompletion.choices[0].message.content;
    
    console.log('Moderation result:', content);

    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const modResult = JSON.parse(jsonStr.trim());
    
    return {
      safe: modResult.safe === true,
      reason: modResult.reason || null,
      confidence: modResult.confidence || 0,
      category: modResult.category || 'safe',
      details: modResult.details || null
    };
  } catch (error) {
    console.error('Reel moderation error:', error);
    // Fail OPEN - an API error does not mean the content is unsafe
    return { 
      safe: true, 
      reason: null,
      confidence: 0,
      category: 'safe'
    };
  }
};

// Sanitization helpers
const sanitizeCaption = (caption) => {
  if (!caption || typeof caption !== 'string') return '';
  return caption.slice(0, 500).trim();
};

const sanitizeHashtags = (hashtags) => {
  if (!Array.isArray(hashtags)) {
    return ['fyp', 'viral', 'trending', 'foryou', 'explore'];
  }
  return hashtags
    .filter(tag => typeof tag === 'string')
    .map(tag => tag.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30))
    .filter(tag => tag.length >= 2)
    .slice(0, 15);
};

const sanitizeCategory = (category) => {
  if (!category || typeof category !== 'string') return 'other';
  const normalized = category.toLowerCase().trim();
  return VALID_CATEGORIES.includes(normalized) ? normalized : 'other';
};

const sanitizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter(tag => typeof tag === 'string')
    .map(tag => tag.toLowerCase().trim().replace(/[^a-z0-9-]/g, ''))
    .filter(tag => tag.length >= 2)
    .slice(0, 10);
};

const getFallbackAnalysis = () => ({
  caption: '',
  hashtags: ['fyp', 'viral', 'trending', 'foryou'],
  category: 'other',
  tags: [],
  musicMood: 'upbeat',
  aiGenerated: false,
  fallback: true
});

export default { analyzeReel, moderateReelContent };
