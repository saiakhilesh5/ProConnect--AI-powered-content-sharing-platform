import OpenAI from 'openai';

/**
 * Advanced Multilingual Content Moderation
 * Uses Grok AI for comprehensive text analysis across all languages
 * Replaces Perspective API with more powerful multilingual detection
 */

// ============================================================================
// COMPREHENSIVE BAD WORDS DATABASE - MULTILINGUAL
// ============================================================================

// Hindi/Hinglish (transliterated)
const HINDI_WORDS = [
  'bhenchod', 'bhosdike', 'madarchod', 'chutiya', 'gaandu', 'randi', 
  'haramkhor', 'harami', 'kamina', 'lauda', 'lodu', 'jhatu', 'chod',
  'behenchod', 'bsdk', 'bc', 'mc', 'bkl', 'mkc', 'gand', 'chut',
  'laude', 'lavde', 'bhosda', 'bhosdiwala', 'bhosdiwale', 'gandu'
];

// Telugu
const TELUGU_WORDS = [
  'puku', 'pooku', 'lanja', 'modda', 'gudda', 'dengu', 'kukka',
  'bastard', 'lanjakoduku', 'lanjamunda', 'donga', 'erri', 'pukulo',
  'sulli', 'sulla', 'dengey', 'dengudu', 'bootha', 'porikodu'
];

// Tamil
const TAMIL_WORDS = [
  'punda', 'thevdiya', 'sunni', 'koothi', 'otha', 'oombu',
  'thevidiya', 'theevadi', 'baadu', 'pool', 'vundai', 'kena'
];

// Kannada
const KANNADA_WORDS = [
  'sule', 'magne', 'bhosdike', 'tumba', 'bolimaga', 'keya',
  'soolimaga', 'soolemaga', 'hendti', 'ninna'
];

// Malayalam
const MALAYALAM_WORDS = [
  'pooru', 'kunna', 'myre', 'thendi', 'koothichi', 'poorimol',
  'mandan', 'patti', 'kundi', 'andi', 'thayoli'
];

// Bengali
const BENGALI_WORDS = [
  'khankir', 'chele', 'magi', 'choda', 'baal', 'bhosda',
  'maagi', 'khanki', 'bokachoda', 'madarchod', 'banchod'
];

// Punjabi
const PUNJABI_WORDS = [
  'bhenchod', 'panchod', 'chutiya', 'gaandu', 'kutta', 'kutti',
  'lauda', 'phuddi', 'chod', 'harami', 'haramzada'
];

// Marathi
const MARATHI_WORDS = [
  'bhokachod', 'zavli', 'sattyanash', 'bhadvya', 'raand',
  'zhavadya', 'bhenchod', 'aai', 'madharchod'
];

// Gujarati
const GUJARATI_WORDS = [
  'bhosadchod', 'chutiya', 'gando', 'randvu', 'bhosdu',
  'gandu', 'lanjo', 'madarchod'
];

// Urdu/Arabic influenced
const URDU_WORDS = [
  'harami', 'haramzada', 'kutta', 'kutti', 'suar', 'ullu',
  'gadha', 'bhainchod', 'madarjaat', 'kanjar', 'kanjari'
];

// Spanish
const SPANISH_WORDS = [
  'puta', 'puto', 'mierda', 'cabron', 'pendejo', 'verga', 'chingar',
  'coño', 'joder', 'culo', 'maricon', 'perra', 'cojones', 'carajo',
  'chingada', 'culero', 'pinche', 'mamada', 'putamadre'
];

// Portuguese
const PORTUGUESE_WORDS = [
  'puta', 'caralho', 'merda', 'foda', 'cona', 'buceta', 'viado',
  'filho da puta', 'porra', 'cuzao', 'cabrão', 'paneleiro'
];

// French
const FRENCH_WORDS = [
  'merde', 'putain', 'connard', 'salope', 'bordel', 'enculer',
  'nique', 'bite', 'couilles', 'foutre', 'cul', 'baise', 'conasse'
];

// German
const GERMAN_WORDS = [
  'scheiße', 'scheisse', 'arschloch', 'hurensohn', 'fotze', 'wichser',
  'schlampe', 'schwanz', 'fick', 'ficken', 'hure', 'verfickt'
];

// Russian (transliterated)
const RUSSIAN_WORDS = [
  'suka', 'blyad', 'blyat', 'pidar', 'pizda', 'hui', 'huy',
  'yebat', 'mudak', 'dolboeb', 'zasranec', 'zhopa', 'ebat'
];

// Japanese (romanized)
const JAPANESE_WORDS = [
  'kuso', 'chikusho', 'kisama', 'baka', 'aho', 'shine', 'kutabare',
  'manko', 'chinko', 'kichiku', 'busu', 'debu'
];

// Korean (romanized)
const KOREAN_WORDS = [
  'shibal', 'ssibal', 'gaesaekki', 'byungshin', 'jiral', 'jot',
  'meongcheong', 'gaejashik', 'bitch', 'nyeon', 'sekki'
];

// Chinese (pinyin/romanized slang)
const CHINESE_WORDS = [
  'caonima', 'tamade', 'wocao', 'shabi', 'niubi', 'diaosi',
  'gundan', 'bichi', 'feiwu', 'shagua', 'hundan'
];

// Arabic (transliterated)
const ARABIC_WORDS = [
  'sharmouta', 'kussomak', 'ibn el sharmouta', 'kos', 'airy',
  'teez', 'kalb', 'hmar', 'manyak', 'zamel', 'ahbal'
];

// Indonesian/Malay
const INDONESIAN_WORDS = [
  'anjing', 'bangsat', 'babi', 'kampret', 'kontol', 'memek',
  'ngentot', 'jancuk', 'asu', 'sundal', 'goblok', 'perek'
];

// Combined all bad words
const ALL_BAD_WORDS = [
  ...HINDI_WORDS, ...TELUGU_WORDS, ...TAMIL_WORDS, ...KANNADA_WORDS,
  ...MALAYALAM_WORDS, ...BENGALI_WORDS, ...PUNJABI_WORDS, ...MARATHI_WORDS,
  ...GUJARATI_WORDS, ...URDU_WORDS, ...SPANISH_WORDS, ...PORTUGUESE_WORDS,
  ...FRENCH_WORDS, ...GERMAN_WORDS, ...RUSSIAN_WORDS, ...JAPANESE_WORDS,
  ...KOREAN_WORDS, ...CHINESE_WORDS, ...ARABIC_WORDS, ...INDONESIAN_WORDS
];

// Common abbreviations and leetspeak
const BAD_ABBREVIATIONS = [
  'mc', 'bc', 'bsdk', 'bkl', 'mkc', 'bkc', 'lnd', 'gnd', 'wtf', 'stfu',
  'gtfo', 'fk', 'fck', 'fuk', 'sh1t', 'a$$', 'b1tch', 'd1ck', 'p0rn'
];

// ============================================================================
// TEXT NORMALIZATION FOR EVASION DETECTION
// ============================================================================

/**
 * Advanced text normalization to catch:
 * - Leetspeak (f**k, 5h1t)
 * - Spaced letters (f u c k)
 * - Special characters (fück, shít)
 * - Repeated chars (fuuuck)
 * - Unicode lookalikes (fυck using Greek υ)
 * - Zero-width characters
 * - Emoji-based obfuscation
 */
const normalizeText = (text) => {
  if (!text) return '';
  
  let normalized = text.toLowerCase();
  
  // Remove zero-width characters
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Remove spaces between single letters
  normalized = normalized.replace(/(?<=^|\s)(\w)\s+(?=\w(\s|$))/g, '$1');
  
  // Leetspeak to letters
  const leetMap = {
    '0': 'o', '1': 'i', '2': 'z', '3': 'e', '4': 'a', '5': 's',
    '6': 'g', '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's',
    '!': 'i', '|': 'l', '+': 't', '€': 'e', '£': 'l', '¥': 'y'
  };
  for (const [leet, letter] of Object.entries(leetMap)) {
    normalized = normalized.replace(new RegExp(leet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), letter);
  }
  
  // Unicode lookalikes to ASCII
  const unicodeMap = {
    'α': 'a', 'а': 'a', 'ä': 'a', 'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a',
    'β': 'b', 'ß': 'b',
    'ç': 'c', 'с': 'c', 'ć': 'c',
    'đ': 'd',
    'ε': 'e', 'е': 'e', 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'ƒ': 'f',
    'ğ': 'g',
    'η': 'h',
    'ι': 'i', 'і': 'i', 'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'κ': 'k', 'к': 'k',
    'ł': 'l',
    'μ': 'm', 'м': 'm',
    'η': 'n', 'ñ': 'n', 'ń': 'n',
    'ο': 'o', 'о': 'o', 'ö': 'o', 'ó': 'o', 'ò': 'o', 'ô': 'o', 'ø': 'o',
    'ρ': 'p', 'р': 'p',
    'ř': 'r',
    'š': 's', 'ş': 's',
    'τ': 't', 'т': 't',
    'υ': 'u', 'ü': 'u', 'ú': 'u', 'ù': 'u', 'û': 'u',
    'ν': 'v',
    'ω': 'w',
    'χ': 'x', 'х': 'x',
    'γ': 'y', 'у': 'y', 'ý': 'y',
    'ž': 'z'
  };
  for (const [unicode, ascii] of Object.entries(unicodeMap)) {
    normalized = normalized.replace(new RegExp(unicode, 'g'), ascii);
  }
  
  // Remove all non-alphanumeric (except spaces for word boundary)
  const words = normalized.split(/\s+/);
  const normalizedWords = words.map(word => {
    return word
      .replace(/[^a-z0-9]/g, '')
      .replace(/(.)\1{2,}/g, '$1$1'); // Max 2 repeated chars
  });
  
  return normalizedWords.join(' ');
};

/**
 * Calculate Levenshtein similarity
 */
const calculateSimilarity = (s1, s2) => {
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
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

  return 1 - matrix[len1][len2] / Math.max(len1, len2);
};

/**
 * Check text against comprehensive bad words list with fuzzy matching
 * @param {string} text - Text to check
 * @returns {Object} - Detection result
 */
export const checkBadWords = (text) => {
  if (!text) return { detected: false, word: null, language: null };
  
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/);
  
  // Check abbreviations (exact match)
  for (const abbr of BAD_ABBREVIATIONS) {
    if (words.includes(abbr) || normalized.includes(abbr)) {
      return { detected: true, word: abbr, language: 'abbreviation' };
    }
  }
  
  // Check all bad words with fuzzy matching
  for (const badWord of ALL_BAD_WORDS) {
    const normalizedBadWord = normalizeText(badWord);
    
    // Exact match
    if (normalized.includes(normalizedBadWord)) {
      return { detected: true, word: badWord, language: 'detected' };
    }
    
    // Fuzzy match for each word
    for (const word of words) {
      if (word.length >= 3 && calculateSimilarity(word, normalizedBadWord) > 0.8) {
        return { detected: true, word: badWord, language: 'detected' };
      }
    }
  }
  
  return { detected: false, word: null, language: null };
};

// ============================================================================
// GROK-BASED CONTENT MODERATION
// ============================================================================

/**
 * Advanced content moderation using Grok AI
 * Analyzes text for toxicity, hate speech, violence, sexual content
 * Works across 50+ languages automatically
 * 
 * @param {string} text - Text to moderate
 * @returns {Object} - Moderation result
 */
export const moderateText = async (text) => {
  try {
    // First: Quick local check for obvious bad words
    const localCheck = checkBadWords(text);
    if (localCheck.detected) {
      console.log('Local filter detected:', localCheck.word);
      return {
        safe: false,
        scores: { PROFANITY: 1.0, TOXICITY: 1.0 },
        reason: 'profane language',
        detectedWord: localCheck.word,
        method: 'local'
      };
    }

    // Second: Grok AI analysis for complex cases
    if (!process.env.GROK_API_KEY) {
      console.warn('Grok API key not configured');
      return { safe: true, scores: {}, reason: null, method: 'fallback' };
    }

    if (!text || text.trim().length === 0) {
      return { safe: true, scores: {}, reason: null };
    }

    const openai = new OpenAI({ apiKey: process.env.GROK_API_KEY, baseURL: 'https://api.x.ai/v1' });

    const prompt = `You are an advanced content moderation AI. Analyze this text for harmful content.

TEXT TO ANALYZE: "${text}"

DETECT AND SCORE (0.0-1.0) each category:

1. TOXICITY: General toxic/rude/disrespectful content
2. SEVERE_TOXICITY: Extreme toxicity, very hateful
3. PROFANITY: Swear words, obscene language (ANY language including transliterated)
4. IDENTITY_ATTACK: Attacks based on identity (race, religion, gender, nationality)
5. INSULT: Personal attacks, name-calling
6. THREAT: Threats of violence or harm
7. SEXUALLY_EXPLICIT: Sexual content, innuendo, 18+ references
8. HATE_SPEECH: Promoting hate against groups

IMPORTANT:
- Detect profanity in ALL languages (Hindi, Telugu, Tamil, Spanish, etc.)
- Detect transliterated abuse (written in English letters but is regional language)
- Detect leetspeak and obfuscated text (f*ck, sh1t, etc.)
- Consider context but be strict for social media
- Detect subtle harassment and coded language

Respond ONLY with valid JSON:
{
  "safe": true/false,
  "scores": {
    "TOXICITY": 0.0,
    "SEVERE_TOXICITY": 0.0,
    "PROFANITY": 0.0,
    "IDENTITY_ATTACK": 0.0,
    "INSULT": 0.0,
    "THREAT": 0.0,
    "SEXUALLY_EXPLICIT": 0.0,
    "HATE_SPEECH": 0.0
  },
  "reason": "reason if unsafe, null if safe",
  "detected_issues": ["list of specific issues found"],
  "language_detected": "language of the text"
}`;

    const completion = await openai.chat.completions.create({
      model: 'grok-2-1212',
      messages: [{ role: 'user', content: prompt }]
    });
    const content = completion.choices[0].message.content;
    
    console.log('Grok moderation raw:', content);

    // Parse response
    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const analysis = JSON.parse(jsonStr.trim());

    // Define thresholds
    const THRESHOLDS = {
      TOXICITY: 0.7,
      SEVERE_TOXICITY: 0.5,
      PROFANITY: 0.7,
      IDENTITY_ATTACK: 0.6,
      INSULT: 0.75,
      THREAT: 0.5,
      SEXUALLY_EXPLICIT: 0.6,
      HATE_SPEECH: 0.5
    };

    // Check if any score exceeds threshold
    let safe = true;
    let reason = null;

    for (const [attr, threshold] of Object.entries(THRESHOLDS)) {
      if (analysis.scores?.[attr] && analysis.scores[attr] >= threshold) {
        safe = false;
        reason = getReasonMessage(attr);
        break;
      }
    }

    return {
      safe: safe && analysis.safe !== false,
      scores: analysis.scores || {},
      reason: reason || analysis.reason,
      detectedIssues: analysis.detected_issues || [],
      language: analysis.language_detected,
      method: 'grok'
    };
  } catch (error) {
    console.error('Grok moderation error:', error);
    // Fail OPEN for text - don't block on API error
    return { safe: true, scores: {}, reason: null, method: 'error-fallback' };
  }
};

/**
 * Moderate comment before posting
 * @param {string} comment - Comment text
 * @returns {Object} - Moderation result
 */
export const moderateComment = async (comment) => {
  // Use the full moderation pipeline
  return moderateText(comment);
};

/**
 * Check if caption/description is appropriate
 * @param {string} text - Caption or description
 * @returns {Object} - Moderation result
 */
export const moderateCaption = async (text) => {
  // Captions can be slightly more lenient
  const result = await moderateText(text);
  
  // Adjust for caption context (still block severe stuff)
  if (result.scores) {
    const severeIssues = ['SEVERE_TOXICITY', 'THREAT', 'HATE_SPEECH', 'SEXUALLY_EXPLICIT'];
    for (const issue of severeIssues) {
      if (result.scores[issue] && result.scores[issue] >= 0.5) {
        return { ...result, safe: false };
      }
    }
  }
  
  return result;
};

/**
 * Get human-readable reason messages
 */
const getReasonMessage = (attribute) => {
  const messages = {
    TOXICITY: 'toxic content detected',
    SEVERE_TOXICITY: 'severely toxic/hateful content',
    PROFANITY: 'profane language',
    IDENTITY_ATTACK: 'identity-based attack',
    INSULT: 'insulting content',
    THREAT: 'threatening content',
    SEXUALLY_EXPLICIT: 'sexually explicit content (18+)',
    HATE_SPEECH: 'hate speech'
  };
  return messages[attribute] || 'inappropriate content';
};

/**
 * Get moderation stats for a piece of content
 * @param {string} text - Text to analyze
 * @returns {Object} - Detailed moderation stats
 */
export const getDetailedModerationStats = async (text) => {
  const result = await moderateText(text);
  
  return {
    ...result,
    summary: result.safe ? 'Content is appropriate' : `Blocked: ${result.reason}`,
    wordCount: text.split(/\s+/).length,
    characterCount: text.length
  };
};

export default {
  checkBadWords,
  moderateText,
  moderateComment,
  moderateCaption,
  getDetailedModerationStats
};
