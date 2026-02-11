"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "./AuthContext";
import { useSession } from "next-auth/react";

const ReelsContext = createContext();

export const ReelsProvider = ({ children }) => {
  const [reels, setReels] = useState([]);
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [feedType, setFeedType] = useState('for-you'); // 'for-you' or 'following'
  const fetchingRef = useRef(false);
  
  const api = useApi();
  const { user } = useAuth();
  const { data: session, status } = useSession();
  
  // Check if we have a valid session
  const hasValidSession = status === "authenticated" && session?.backendToken;

  // Fetch reels feed - only when explicitly called
  const fetchReels = useCallback(async (type = feedType, pageNum = 1, category = 'all') => {
    if (fetchingRef.current) return { reels: [], pagination: { hasMore: false } };
    if (!hasValidSession) {
      console.log("ReelsContext: No valid session, skipping fetch");
      return { reels: [], pagination: { hasMore: false } };
    }
    
    try {
      fetchingRef.current = true;
      setLoading(true);
      const endpoint = type === 'following' 
        ? '/api/reels/feed/following' 
        : '/api/reels/feed/for-you';
      
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
      });
      
      if (category && category !== 'all') {
        params.append('category', category);
      }
      
      const response = await api.get(`${endpoint}?${params}`);
      const { reels: newReels, pagination } = response.data?.data || { reels: [], pagination: { hasMore: false } };
      
      if (pageNum === 1) {
        setReels(newReels || []);
      } else {
        setReels(prev => [...prev, ...(newReels || [])]);
      }
      
      setHasMore(pagination?.hasMore || false);
      setPage(pageNum);
      
      return response.data?.data;
    } catch (error) {
      console.error("Error fetching reels:", error);
      // Don't throw - just return empty
      return { reels: [], pagination: { hasMore: false } };
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [api, feedType, hasValidSession]);

  // Load more reels
  const loadMoreReels = useCallback(async () => {
    if (!hasMore || loading || !hasValidSession) return;
    await fetchReels(feedType, page + 1);
  }, [hasMore, loading, feedType, page, fetchReels, hasValidSession]);

  // Get single reel
  const getReel = async (reelId) => {
    try {
      const response = await api.get(`/api/reels/${reelId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching reel:", error);
      throw error;
    }
  };

  // Upload reel - increased timeout for large video files
  const uploadReel = async (formData) => {
    try {
      setLoading(true);
      const response = await api.post("/api/reels", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 300000, // 5 minutes timeout for video uploads
      });
      
      // Add new reel to the beginning
      setReels(prev => [response.data.data, ...prev]);
      
      return response.data.data;
    } catch (error) {
      console.error("Error uploading reel:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Toggle like reel
  const toggleLikeReel = async (reelId) => {
    try {
      const response = await api.post(`/api/reels/${reelId}/like`);
      const { isLiked, likesCount } = response.data.data;
      
      // Update reel in state
      setReels(prev =>
        prev.map(reel =>
          reel._id === reelId
            ? { ...reel, isLiked, likesCount }
            : reel
        )
      );
      
      return response.data.data;
    } catch (error) {
      console.error("Error toggling like:", error);
      throw error;
    }
  };

  // Toggle save reel
  const toggleSaveReel = async (reelId) => {
    try {
      const response = await api.post(`/api/reels/${reelId}/save`);
      const { isSaved, savesCount } = response.data.data;
      
      // Update reel in state
      setReels(prev =>
        prev.map(reel =>
          reel._id === reelId
            ? { ...reel, isSaved, savesCount }
            : reel
        )
      );
      
      return response.data.data;
    } catch (error) {
      console.error("Error toggling save:", error);
      throw error;
    }
  };

  // Add comment to reel
  const addComment = async (reelId, text, parentCommentId = null) => {
    try {
      const response = await api.post(`/api/reels/${reelId}/comments`, {
        text,
        parentCommentId,
      });
      
      // Update comments count
      setReels(prev =>
        prev.map(reel =>
          reel._id === reelId
            ? { ...reel, commentsCount: reel.commentsCount + 1 }
            : reel
        )
      );
      
      return response.data.data;
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  };

  // Get reel comments
  const getComments = async (reelId, page = 1) => {
    try {
      const response = await api.get(
        `/api/reels/${reelId}/comments?page=${page}&limit=20`
      );
      return response.data.data;
    } catch (error) {
      console.error("Error fetching comments:", error);
      throw error;
    }
  };

  // Delete reel
  const deleteReel = async (reelId) => {
    try {
      await api.delete(`/api/reels/${reelId}`);
      setReels(prev => prev.filter(reel => reel._id !== reelId));
    } catch (error) {
      console.error("Error deleting reel:", error);
      throw error;
    }
  };

  // Get trending reels
  const getTrendingReels = async (limit = 20) => {
    try {
      const response = await api.get(`/api/reels/trending?limit=${limit}`);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching trending reels:", error);
      throw error;
    }
  };

  // Search reels
  const searchReels = async (query, category = 'all', page = 1) => {
    try {
      const params = new URLSearchParams({
        query,
        page: page.toString(),
        limit: '12',
      });
      
      if (category && category !== 'all') {
        params.append('category', category);
      }
      
      const response = await api.get(`/api/reels/search?${params}`);
      return response.data.data;
    } catch (error) {
      console.error("Error searching reels:", error);
      throw error;
    }
  };

  // Get user's reels
  const getUserReels = async (userId, page = 1) => {
    try {
      const response = await api.get(
        `/api/reels/user/${userId}?page=${page}&limit=12`
      );
      return response.data.data;
    } catch (error) {
      console.error("Error fetching user reels:", error);
      throw error;
    }
  };

  // Get saved reels
  const getSavedReels = async (page = 1) => {
    try {
      const response = await api.get(`/api/reels/saved/my-reels?page=${page}&limit=12`);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching saved reels:", error);
      throw error;
    }
  };

  // Navigate to next reel
  const nextReel = () => {
    if (currentReelIndex < reels.length - 1) {
      setCurrentReelIndex(prev => prev + 1);
      
      // Load more if near the end
      if (currentReelIndex >= reels.length - 3 && hasMore) {
        loadMoreReels();
      }
    }
  };

  // Navigate to previous reel
  const prevReel = () => {
    if (currentReelIndex > 0) {
      setCurrentReelIndex(prev => prev - 1);
    }
  };

  return (
    <ReelsContext.Provider
      value={{
        reels,
        setReels,
        currentReelIndex,
        setCurrentReelIndex,
        loading,
        hasMore,
        feedType,
        setFeedType,
        fetchReels,
        loadMoreReels,
        getReel,
        uploadReel,
        toggleLikeReel,
        toggleSaveReel,
        addComment,
        getComments,
        deleteReel,
        getTrendingReels,
        searchReels,
        getUserReels,
        getSavedReels,
        nextReel,
        prevReel,
      }}
    >
      {children}
    </ReelsContext.Provider>
  );
};

export const useReels = () => {
  const context = useContext(ReelsContext);
  if (!context) {
    throw new Error("useReels must be used within a ReelsProvider");
  }
  return context;
};
