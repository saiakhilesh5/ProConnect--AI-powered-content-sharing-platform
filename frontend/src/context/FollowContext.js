"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "./AuthContext";
import { useSession } from "next-auth/react";

// Create follow context
const FollowContext = createContext();

// Follow provider component
export const FollowProvider = ({ children }) => {
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { data: session, status } = useSession();
  const api = useApi();
  const fetchingRef = useRef(false);
  
  // Check if we have a valid session
  const hasValidSession = status === "authenticated" && session?.backendToken;

  // Get all followers of a user
  const getFollowers = useCallback(async (userId) => {
    if (fetchingRef.current || !hasValidSession) return followers;
    
    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/follow/followers/${userId}`);
      const data = response.data?.data || [];
      setFollowers(data);
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Error fetching followers";
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [api, followers, hasValidSession]);

  // Get all users the current user is following
  const getFollowing = useCallback(async (userId) => {
    if (fetchingRef.current || !hasValidSession) return following;
    
    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);
      const response = await api.get(`/api/follow/following/${userId}`);
      const data = response.data?.data || [];
      setFollowing(data);
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Error fetching following";
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [api, following, hasValidSession]);

  // Follow a user with optimistic UI updates
  const followUser = useCallback(async (userId) => {
    if (!hasValidSession || !user) {
      return { success: false, error: "You must be logged in" };
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Optimistically update UI before API call completes
      const targetUser = {
        _id: userId
      };
      
      // Add to following list optimistically
      const newFollowingItem = {
        _id: Date.now().toString(), // Temporary ID
        follower: { _id: user._id },
        following: targetUser
      };
      
      setFollowing(prevFollowing => [...prevFollowing, newFollowingItem]);
      
      // Make the actual API call
      await api.post(`/api/follow/${userId}`);
      
      // Refresh following list with real data
      await getFollowing(user._id);
      
      return { success: true };
    } catch (err) {
      // Revert optimistic update on error
      setFollowing(prevFollowing => prevFollowing.filter(item => item.following._id !== userId));
      
      const errorMessage = err.response?.data?.message || "Error following user";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [api, user, getFollowing, hasValidSession]);

  // Unfollow a user with optimistic UI updates
  const unfollowUser = useCallback(async (userId) => {
    if (!hasValidSession || !user) {
      return { success: false, error: "You must be logged in" };
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Store current state for potential rollback
      const previousFollowing = [...following];
      
      // Optimistically update UI - Remove from following list
      setFollowing(prevFollowing => prevFollowing.filter(item => item.following._id !== userId));
      
      // Make the actual API call
      await api.delete(`/api/follow/${userId}`);
      
      // Refresh with real data after successful API call
      await getFollowing(user._id);
      
      return { success: true };
    } catch (err) {
      // Rollback optimistic update on error
      setFollowing(prevFollowing => {
        // Find if there was a relationship before the optimistic update
        const hadRelationship = prevFollowing.some(item => item.following._id === userId);
        
        if (hadRelationship) {
          return following; // Restore from the stored state 
        }
        return prevFollowing;
      });
      
      const errorMessage = err.response?.data?.message || "Error unfollowing user";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [api, user, following, getFollowing, hasValidSession]);

  // Check if the current user is following another user
  const checkFollowStatus = useCallback(async (userId) => {
    if (!hasValidSession) return false;
    
    try {
      setLoading(true);
      setError(null);
      
      // First check local state
      const isFollowingLocally = following.some(f => f.following._id === userId);
      if (isFollowingLocally) return true;
      
      // If not found in local state, check with API
      const response = await api.get(`/api/follow/status/${userId}`);
      return response.data.data.isFollowing;
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Error checking follow status";
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [api, following, hasValidSession]);

  const value = {
    followers,
    following,
    loading,
    error,
    getFollowers,
    getFollowing,
    followUser,
    unfollowUser,
    checkFollowStatus,
    setFollowers,
    setFollowing
  };

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>;
};

// Custom hook to use follow context
export const useFollow = () => {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error("useFollow must be used within a FollowProvider");
  }
  return context;
}; 