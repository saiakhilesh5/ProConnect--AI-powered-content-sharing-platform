import OpenAI from 'openai';

/**
 * Centralized AI Client with automatic key rotation
 * Uses multiple Gemini API keys - if one hits rate limit, switches to the next
 */

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

const getKeys = () => [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  process.env.GEMINI_API_KEY_6,
  process.env.GEMINI_API_KEY_7,
  process.env.GEMINI_API_KEY_8,
].filter(Boolean);

let currentKeyIndex = 0;

/**
 * Check if any AI keys are configured
 */
export const hasAIKeys = () => getKeys().length > 0;

/**
 * Make a chat completion with automatic key rotation on rate limit
 * @param {Object} params - OpenAI chat.completions.create params (model, messages, etc.)
 * @returns {Object} - The completion response
 */
export const createChatCompletion = async (params) => {
  const keys = getKeys();
  if (keys.length === 0) {
    throw new Error('No AI API keys configured');
  }

  let lastError;
  for (let i = 0; i < keys.length; i++) {
    const keyIndex = (currentKeyIndex + i) % keys.length;
    const client = new OpenAI({
      apiKey: keys[keyIndex],
      baseURL: GEMINI_BASE_URL,
    });

    try {
      const result = await client.chat.completions.create(params);
      // Round-robin: advance to next key for equal distribution
      currentKeyIndex = (keyIndex + 1) % keys.length;
      return result;
    } catch (error) {
      const status = error?.status || error?.response?.status;
      if (status === 429 || status === 403 || status === 503) {
        console.log(`AI key ${keyIndex + 1} rate limited (${status}), trying next key...`);
        lastError = error;
        continue;
      }
      throw error; // non-rate-limit error, don't retry
    }
  }

  throw lastError; // all keys exhausted
};
