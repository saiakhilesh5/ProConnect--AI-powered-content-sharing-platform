// hooks/useAIFeatures.js
"use client";

import { useState, useCallback } from 'react';
import { useApi } from './useApi';

/**
 * Custom hook for AI-powered features
 * Includes: Copyright Detection, Semantic Search, Growth Agent, Smart Feed
 */
export const useAIFeatures = () => {
  const api = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Check image for copyright issues before upload
   * @param {string} imageUrl - Cloudinary URL of the image
   * @param {string} category - Optional category for narrowing search
   */
  const checkCopyright = useCallback(async (imageUrl, category = null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/images/check-copyright', {
        imageUrl,
        category
      });
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Copyright check failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  /**
   * Perform semantic search for images
   * @param {string} query - Natural language search query
   * @param {Object} options - Search options (page, limit)
   */
  const semanticSearch = useCallback(async (query, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/images/semantic-search', {
        params: { q: query, ...options }
      });
      return {
        results: response.data.data,
        metadata: response.data.metadata
      };
    } catch (err) {
      setError(err.response?.data?.message || 'Search failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  /**
   * Find similar images
   * @param {string} imageUrl - URL of reference image
   */
  const findSimilarImages = useCallback(async (imageUrl) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/images/find-similar', { imageUrl });
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to find similar images');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  /**
   * Get search suggestions
   * @param {string} query - Partial search query
   */
  const getSearchSuggestions = useCallback(async (query) => {
    try {
      const response = await api.get('/api/images/search-suggestions', {
        params: { q: query }
      });
      return response.data.data;
    } catch (err) {
      console.error('Search suggestions error:', err);
      return [];
    }
  }, [api]);

  /**
   * Get AI-ranked smart feed
   * @param {Object} options - Feed options (page, limit, category)
   */
  const getSmartFeed = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/images/smart-feed', {
        params: options
      });
      return {
        images: response.data.data,
        metadata: response.data.metadata
      };
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get smart feed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  /**
   * Get "For You" personalized recommendations
   * @param {number} limit - Number of recommendations
   */
  const getForYouRecommendations = useCallback(async (limit = 10) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/images/for-you', {
        params: { limit }
      });
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get recommendations');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  /**
   * Get AI creator growth recommendations
   */
  const getGrowthRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/users/growth-recommendations');
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get growth recommendations');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  /**
   * Get competitor insights
   */
  const getCompetitorInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/users/competitor-insights');
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get competitor insights');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  /**
   * Chat with AI assistant
   * @param {string} message - User message
   * @param {string} imageId - Optional image context
   */
  const chatWithAI = useCallback(async (message, imageId = null) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/images/ai-chat', {
        message,
        imageId
      });
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'AI chat failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  /**
   * Get AI caption suggestions for an image
   * @param {string} imageUrl - Image URL
   * @param {string} category - Image category
   */
  const getCaptionSuggestions = useCallback(async (imageUrl, category = 'other') => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/images/suggest-captions', {
        imageUrl,
        category
      });
      return response.data.data.captions;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get caption suggestions');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  /**
   * Analyze image with AI
   * @param {string} imageUrl - Image URL to analyze
   */
  const analyzeImage = useCallback(async (imageUrl) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/images/analyze', { imageUrl });
      return response.data.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Image analysis failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return {
    // State
    loading,
    error,
    
    // Copyright detection
    checkCopyright,
    
    // Semantic search
    semanticSearch,
    findSimilarImages,
    getSearchSuggestions,
    
    // Smart feed
    getSmartFeed,
    getForYouRecommendations,
    
    // Growth agent
    getGrowthRecommendations,
    getCompetitorInsights,
    
    // Chat & Analysis
    chatWithAI,
    getCaptionSuggestions,
    analyzeImage
  };
};

export default useAIFeatures;
