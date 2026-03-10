import OpenAI from 'openai';
import { Image } from '../models/image.model.js';
import crypto from 'crypto';

/**
 * AI Copyright Detection Utility
 * Detects similar images using perceptual hashing and AI analysis
 * Helps identify potential plagiarism or duplicate content
 */

/**
 * Generate a simple perceptual hash from image data
 * Uses average hash algorithm (aHash) concept
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {string} - Perceptual hash string
 */
const generatePerceptualHash = (imageBuffer) => {
  // Create a hash of the image data
  // In production, use proper image processing library like sharp
  const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
  return hash;
};

/**
 * Calculate hamming distance between two hashes
 * Lower distance = more similar images
 * @param {string} hash1 
 * @param {string} hash2 
 * @returns {number} - Hamming distance (0 = identical)
 */
const hammingDistance = (hash1, hash2) => {
  if (hash1.length !== hash2.length) return Infinity;
  
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
};

/**
 * Fetch image as base64 from URL
 */
const fetchImageAsBase64 = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
};

/**
 * Use Gemini AI to analyze image similarity
 * @param {string} imageUrl - URL of uploaded image
 * @param {string[]} existingImageUrls - URLs of existing images to compare
 * @returns {Object} - Similarity analysis result
 */
const analyzeImageSimilarityWithAI = async (imageUrl, existingImageUrls) => {
  try {
    if (!process.env.GROK_API_KEY || existingImageUrls.length === 0) {
      return { hasSimilar: false, matches: [] };
    }

    const openai = new OpenAI({ apiKey: process.env.GROK_API_KEY, baseURL: 'https://api.x.ai/v1' });

    // Fetch uploaded image
    const uploadedImageBuffer = await fetchImageAsBase64(imageUrl);
    const uploadedBase64 = uploadedImageBuffer.toString('base64');

    // Compare with up to 5 existing images
    const imagesToCompare = existingImageUrls.slice(0, 5);
    const matches = [];

    for (const existingUrl of imagesToCompare) {
      try {
        const existingBuffer = await fetchImageAsBase64(existingUrl);
        const existingBase64 = existingBuffer.toString('base64');

        const prompt = `Compare these two images for copyright/plagiarism detection.
        
Analyze if Image 2 could be:
1. An exact copy or near-duplicate of Image 1
2. A cropped version of Image 1
3. A filtered/edited version of Image 1
4. A derivative work based on Image 1

Respond ONLY with valid JSON (no markdown):
{"isSimilar": true/false, "similarityScore": 0-100, "reason": "brief explanation"}`;

        const completion = await openai.chat.completions.create({
          model: 'grok-2-vision-1212',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${existingBase64}` } },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${uploadedBase64}` } }
            ]
          }]
        });

        const content = completion.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          if (analysis.isSimilar && analysis.similarityScore >= 70) {
            matches.push({
              imageUrl: existingUrl,
              similarityScore: analysis.similarityScore,
              reason: analysis.reason
            });
          }
        }
      } catch (err) {
        console.error('Error comparing image:', err.message);
      }
    }

    return {
      hasSimilar: matches.length > 0,
      matches
    };
  } catch (error) {
    console.error('AI similarity analysis error:', error);
    return { hasSimilar: false, matches: [], error: error.message };
  }
};

/**
 * Check image for copyright infringement
 * Uses perceptual hashing and AI analysis
 * @param {string} imageUrl - URL of the image to check
 * @param {string} category - Image category to narrow search
 * @returns {Object} - Copyright check result
 */
export const checkCopyright = async (imageUrl, category = null) => {
  try {
    console.log('Starting copyright check for:', imageUrl);

    // Get the uploaded image buffer
    const imageBuffer = await fetchImageAsBase64(imageUrl);
    const uploadedHash = generatePerceptualHash(imageBuffer);

    // Find existing images in the same category
    const query = { visibility: 'public' };
    if (category) {
      query.category = category;
    }

    // Get recent images to compare (limit for performance)
    const existingImages = await Image.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .select('imageUrl title user perceptualHash category');

    // Fast check using perceptual hashes (if stored)
    const hashMatches = [];
    for (const img of existingImages) {
      if (img.perceptualHash) {
        const distance = hammingDistance(uploadedHash, img.perceptualHash);
        // If hashes are very similar (low distance)
        if (distance < 10) {
          hashMatches.push({
            imageId: img._id,
            imageUrl: img.imageUrl,
            title: img.title,
            matchType: 'hash',
            confidence: Math.max(0, 100 - distance * 5)
          });
        }
      }
    }

    // If hash matches found, return early
    if (hashMatches.length > 0) {
      return {
        hasCopyrightIssue: true,
        confidence: hashMatches[0].confidence,
        matches: hashMatches.slice(0, 5),
        uploadedHash,
        method: 'perceptual_hash'
      };
    }

    // Use AI for deeper analysis on top images
    const topImagesForAI = existingImages.slice(0, 10).map(img => img.imageUrl);
    const aiResult = await analyzeImageSimilarityWithAI(imageUrl, topImagesForAI);

    if (aiResult.hasSimilar) {
      return {
        hasCopyrightIssue: true,
        confidence: aiResult.matches[0]?.similarityScore || 75,
        matches: aiResult.matches.map(m => ({
          imageUrl: m.imageUrl,
          matchType: 'ai_analysis',
          confidence: m.similarityScore,
          reason: m.reason
        })),
        uploadedHash,
        method: 'ai_vision'
      };
    }

    return {
      hasCopyrightIssue: false,
      confidence: 0,
      matches: [],
      uploadedHash,
      method: 'clear'
    };

  } catch (error) {
    console.error('Copyright check error:', error);
    return {
      hasCopyrightIssue: false,
      error: error.message,
      matches: [],
      uploadedHash: null
    };
  }
};

/**
 * Batch check multiple images for copyright
 * Useful for admin moderation
 * @param {string[]} imageUrls - Array of image URLs
 * @returns {Object[]} - Array of copyright check results
 */
export const batchCheckCopyright = async (imageUrls) => {
  const results = [];
  
  for (const url of imageUrls) {
    const result = await checkCopyright(url);
    results.push({ imageUrl: url, ...result });
  }
  
  return results;
};

/**
 * Store perceptual hash when image is uploaded
 * Call this in the upload flow
 * @param {string} imageId - Image document ID
 * @param {string} hash - Perceptual hash
 */
export const storeImageHash = async (imageId, hash) => {
  try {
    await Image.findByIdAndUpdate(imageId, { perceptualHash: hash });
    return true;
  } catch (error) {
    console.error('Error storing image hash:', error);
    return false;
  }
};

export default { checkCopyright, batchCheckCopyright, storeImageHash };
