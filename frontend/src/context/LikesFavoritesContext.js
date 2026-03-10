"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "./AuthContext";

// Create context
const LikesFavoritesContext = createContext();

// Provider component
export const LikesFavoritesProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const api = useApi();

  // Store liked and favorited images (state for reactive UI updates)
  const [likedImages, setLikedImages] = useState({});
  const [favoritedImages, setFavoritedImages] = useState({});

  // Ref-based caches so check callbacks don't depend on state
  // and don't re-create on every status update (avoids cascade re-renders)
  const likedCacheRef = useRef({});
  const favoritedCacheRef = useRef({});

  // Check if image is liked by user — uses ref cache, no loading state thrash
  const checkLikeStatus = useCallback(async (imageId) => {
    if (!user) return false;

    // Serve from cache if already known
    if (likedCacheRef.current[imageId] !== undefined) {
      return likedCacheRef.current[imageId];
    }

    try {
      const response = await api.get(`/api/likes/${imageId}/check`);
      const isLiked = response.data.data.isLiked;
      likedCacheRef.current[imageId] = isLiked;
      setLikedImages(prev => ({ ...prev, [imageId]: isLiked }));
      return isLiked;
    } catch {
      return false;
    }
  }, [api, user]);

  // Check if image is favorited by user — uses ref cache, no loading state thrash
  const checkFavoriteStatus = useCallback(async (imageId) => {
    if (!user) return false;

    if (favoritedCacheRef.current[imageId] !== undefined) {
      return favoritedCacheRef.current[imageId];
    }

    try {
      const response = await api.get(`/api/favorites/${imageId}/check`);
      const isFavorited = response.data.data.isFavorited;
      favoritedCacheRef.current[imageId] = isFavorited;
      setFavoritedImages(prev => ({ ...prev, [imageId]: isFavorited }));
      return isFavorited;
    } catch {
      return false;
    }
  }, [api, user]);

  // Toggle like status with optimistic UI updates
  const toggleLike = useCallback(async (imageId) => {
    if (!user) return { success: false, message: "You must be logged in" };

    const currentStatus = likedCacheRef.current[imageId] || false;
    const newStatus = !currentStatus;

    // Optimistically update both cache and state
    likedCacheRef.current[imageId] = newStatus;
    setLikedImages(prev => ({ ...prev, [imageId]: newStatus }));

    try {
      const response = await api.post(`/api/likes/${imageId}/toggle`);
      return { success: true, data: response.data.data };
    } catch (err) {
      // Revert on error
      likedCacheRef.current[imageId] = currentStatus;
      setLikedImages(prev => ({ ...prev, [imageId]: currentStatus }));
      const errorMessage = err.response?.data?.message || "Error toggling like";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [api, user]);

  // Toggle favorite status with optimistic UI updates
  const toggleFavorite = useCallback(async (imageId) => {
    if (!user) return { success: false, message: "You must be logged in" };

    const currentStatus = favoritedCacheRef.current[imageId] || false;
    const newStatus = !currentStatus;

    // Optimistically update both cache and state
    favoritedCacheRef.current[imageId] = newStatus;
    setFavoritedImages(prev => ({ ...prev, [imageId]: newStatus }));

    try {
      const response = await api.post(`/api/favorites/${imageId}/toggle`);
      return { success: true, data: response.data.data };
    } catch (err) {
      // Revert on error
      favoritedCacheRef.current[imageId] = currentStatus;
      setFavoritedImages(prev => ({ ...prev, [imageId]: currentStatus }));
      const errorMessage = err.response?.data?.message || "Error toggling favorite";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [api, user]);

  // Load user's likes
  const loadUserLikes = useCallback(async (page = 1, limit = 20) => {
    if (!user) return [];
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/likes?page=${page}&limit=${limit}`);
      const likes = response.data.data;
      likes.forEach(like => {
        likedCacheRef.current[like.image._id] = true;
      });
      setLikedImages(prev => {
        const next = { ...prev };
        likes.forEach(like => { next[like.image._id] = true; });
        return next;
      });
      return likes;
    } catch (err) {
      setError(err.response?.data?.message || "Error loading likes");
      return [];
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  // Load user's favorites
  const loadUserFavorites = useCallback(async (page = 1, limit = 20) => {
    if (!user) return [];
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/favorites?page=${page}&limit=${limit}`);
      const favorites = response.data.data;
      favorites.forEach(fav => {
        favoritedCacheRef.current[fav.image._id] = true;
      });
      setFavoritedImages(prev => {
        const next = { ...prev };
        favorites.forEach(fav => { next[fav.image._id] = true; });
        return next;
      });
      return favorites;
    } catch (err) {
      setError(err.response?.data?.message || "Error loading favorites");
      return [];
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  // Synchronous helpers for components that just want the cached value
  const getLikeStatus = useCallback((imageId) => {
    return likedCacheRef.current[imageId] ?? likedImages[imageId] ?? false;
  }, [likedImages]);

  const getFavoriteStatus = useCallback((imageId) => {
    return favoritedCacheRef.current[imageId] ?? favoritedImages[imageId] ?? false;
  }, [favoritedImages]);

  const value = {
    loading,
    error,
    likedImages,
    favoritedImages,
    checkLikeStatus,
    checkFavoriteStatus,
    toggleLike,
    toggleFavorite,
    loadUserLikes,
    loadUserFavorites,
    getLikeStatus,
    getFavoriteStatus,
  };

  return <LikesFavoritesContext.Provider value={value}>{children}</LikesFavoritesContext.Provider>;
};

// Custom hook to use the context
export const useLikesFavorites = () => {
  const context = useContext(LikesFavoritesContext);
  if (!context) {
    throw new Error("useLikesFavorites must be used within a LikesFavoritesProvider");
  }
  return context;
}; 