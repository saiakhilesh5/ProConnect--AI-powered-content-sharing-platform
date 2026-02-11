/**
 * Content Moderation Utility
 * Uses Google Perspective API for text moderation
 * Uses image analysis for NSFW detection
 * Includes smart filter for transliterated profanity with fuzzy matching
 */

// Perspective API for comment moderation
const PERSPECTIVE_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

// Base bad words (will be matched with fuzzy logic)
const BAD_WORDS_BASE = [
  // Hindi transliterated
  'bhenchod', 'bhosdike', 'madarchod', 'chutiya', 'gaandu', 'randi', 
  'haramkhor', 'harami', 'kamina', 'lauda', 'lodu', 'jhatu',
  // English
  'fuck', 'shit', 'asshole', 'bitch', 'dick', 'cunt', 'whore', 'slut', 'nigger', 'faggot', 'retard'
];

// Short abbreviations (exact match after normalization)
const BAD_ABBREVIATIONS = ['mc', 'bc', 'bsdk', 'bkl', 'mkc', 'bkc', 'lnd', 'gnd'];

/**
 * Normalize text to catch spelling variations
 * Handles: leetspeak, repeated chars, spaces, special chars
 */
const normalizeText = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    // Remove spaces between letters (c h u t i y a -> chutiya)
    .replace(/\s+/g, '')
    // Leetspeak numbers to letters
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    // Similar looking characters
    .replace(/[çć]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[üù]/g, 'u')
    .replace(/[ïì]/g, 'i')
    .replace(/[éèê]/g, 'e')
    .replace(/[àá]/g, 'a')
    .replace(/[ø]/g, 'o')
    // Remove special characters and symbols
    .replace(/[^a-z]/g, '')
    // Collapse repeated characters (fuuuck -> fuck, chutiyaaa -> chutiya)
    .replace(/(.)\1{1,}/g, '$1');
};

/**
 * Calculate similarity between two strings (Levenshtein-based)
 */
const similarity = (s1, s2) => {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // If one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  return 1 - distance / Math.max(len1, len2);
};

/**
 * Check text against bad words with fuzzy matching
 * @param {string} text - Text to check
 * @returns {Object} - { hasBadWords: boolean, matchedWord: string|null }
 */
const checkCustomBadWords = (text) => {
  if (!text) return { hasBadWords: false, matchedWord: null };
  
  const normalized = normalizeText(text);
  
  // Check abbreviations (exact match in normalized text)
  for (const abbr of BAD_ABBREVIATIONS) {
    if (normalized.includes(abbr)) {
      return { hasBadWords: true, matchedWord: abbr };
    }
  }
  
  // Check bad words with fuzzy matching
  for (const badWord of BAD_WORDS_BASE) {
    const normalizedBadWord = normalizeText(badWord);
    
    // Exact match
    if (normalized.includes(normalizedBadWord)) {
      return { hasBadWords: true, matchedWord: badWord };
    }
    
    // Fuzzy match - check each "word-like" segment
    // Split normalized text into chunks and check similarity
    for (let i = 0; i <= normalized.length - normalizedBadWord.length + 2; i++) {
      const chunk = normalized.slice(i, i + normalizedBadWord.length + 2);
      if (chunk.length >= 3 && similarity(chunk, normalizedBadWord) > 0.75) {
        return { hasBadWords: true, matchedWord: badWord };
      }
    }
  }
  
  return { hasBadWords: false, matchedWord: null };
};

/**
 * Analyze comment text for toxicity using Perspective API
 * @param {string} text - The comment text to analyze
 * @returns {Object} - Moderation result with scores and verdict
 */
export const moderateComment = async (text) => {
  try {
    // First check custom bad words filter (catches transliterated abuse)
    const customCheck = checkCustomBadWords(text);
    if (customCheck.hasBadWords) {
      console.log('Custom filter caught bad word:', customCheck.matchedWord);
      return { 
        safe: false, 
        scores: { TOXICITY: 1.0, PROFANITY: 1.0 }, 
        reason: 'profane language' 
      };
    }

    if (!process.env.PERSPECTIVE_API_KEY) {
      console.warn('Perspective API key not configured, skipping moderation');
      return { safe: true, scores: {}, reason: null };
    }

    if (!text || text.trim().length === 0) {
      return { safe: true, scores: {}, reason: null };
    }

    const response = await fetch(`${PERSPECTIVE_API_URL}?key=${process.env.PERSPECTIVE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: { text },
        // Don't specify language - let Perspective API auto-detect
        // Supports 20+ languages: en, es, fr, de, pt, it, hi, ar, ru, zh, ja, ko, etc.
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          IDENTITY_ATTACK: {},
          INSULT: {},
          PROFANITY: {},
          THREAT: {},
          SEXUALLY_EXPLICIT: {},
          SPAM: {}
        },
        doNotStore: true // Privacy: don't store comments on Google servers
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Perspective API error:', error);
      return { safe: true, scores: {}, reason: null }; // Fail open - allow if API fails
    }

    const data = await response.json();
    const scores = {};
    
    // Extract scores
    for (const [attr, value] of Object.entries(data.attributeScores || {})) {
      scores[attr] = value.summaryScore?.value || 0;
    }

    console.log('Content moderation scores:', scores);

    // Define thresholds (0-1 scale)
    const THRESHOLDS = {
      TOXICITY: 0.7,
      SEVERE_TOXICITY: 0.5,
      IDENTITY_ATTACK: 0.6,
      INSULT: 0.7,
      PROFANITY: 0.8,
      THREAT: 0.5,
      SEXUALLY_EXPLICIT: 0.6,
      SPAM: 0.8
    };

    // Check if any score exceeds threshold
    let reason = null;
    let safe = true;

    for (const [attr, threshold] of Object.entries(THRESHOLDS)) {
      if (scores[attr] && scores[attr] >= threshold) {
        safe = false;
        reason = getReasonMessage(attr);
        break;
      }
    }

    return { safe, scores, reason };
  } catch (error) {
    console.error('Content moderation error:', error);
    return { safe: true, scores: {}, reason: null }; // Fail open
  }
};

/**
 * Get human-readable reason for content removal
 */
const getReasonMessage = (attribute) => {
  const messages = {
    TOXICITY: 'toxic content',
    SEVERE_TOXICITY: 'severely toxic content',
    IDENTITY_ATTACK: 'identity-based attack',
    INSULT: 'insulting content',
    PROFANITY: 'profane language',
    THREAT: 'threatening content',
    SEXUALLY_EXPLICIT: 'sexually explicit content',
    SPAM: 'spam'
  };
  return messages[attribute] || 'inappropriate content';
};

/**
 * Moderate image for NSFW content using Gemini Vision
 * @param {string} imageUrl - URL of the image to check
 * @returns {Object} - Moderation result
 */
export const moderateImage = async (imageUrl) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('Gemini API key not configured, skipping image moderation');
      return { safe: true, reason: null };
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Fetch image as base64
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const imageBase64 = Buffer.from(arrayBuffer).toString('base64');

    const prompt = `You are a content moderation AI. Analyze this image and determine if it contains any of the following:
1. Nudity or sexually explicit content
2. Violence or gore
3. Hate symbols or imagery
4. Drug use or illegal activities
5. Self-harm content

Respond ONLY with valid JSON (no markdown):
{"safe": true/false, "reason": "reason if not safe, null if safe", "confidence": 0.0-1.0}

Be strict about nudity and explicit content. Artistic nudity should still be flagged.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      }
    ]);

    const content = result.response.text();
    console.log('Image moderation response:', content);

    // Parse JSON response
    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const analysis = JSON.parse(jsonStr.trim());
    
    return {
      safe: analysis.safe === true,
      reason: analysis.reason || null,
      confidence: analysis.confidence || 0
    };
  } catch (error) {
    console.error('Image moderation error:', error);
    return { safe: true, reason: null }; // Fail open
  }
};

/**
 * Add warning to user for policy violation
 * @param {Object} User - User model
 * @param {string} userId - User ID
 * @param {string} reason - Reason for warning
 * @param {string} type - Type of violation (comment, image)
 */
export const addUserWarning = async (User, userId, reason, type) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Initialize warnings array if not exists
    if (!user.warnings) {
      user.warnings = [];
    }

    user.warnings.push({
      reason,
      type,
      date: new Date()
    });

    // Check if user should be banned (e.g., 3 warnings)
    if (user.warnings.length >= 3) {
      user.isBanned = true;
      user.banReason = 'Multiple policy violations';
    }

    await user.save();
    
    console.log(`Warning added to user ${userId}: ${reason}`);
    return user.warnings.length;
  } catch (error) {
    console.error('Error adding user warning:', error);
  }
};

export default {
  moderateComment,
  moderateImage,
  addUserWarning
};
