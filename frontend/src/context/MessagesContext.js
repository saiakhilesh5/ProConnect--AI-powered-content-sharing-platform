"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "./AuthContext";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const MessagesContext = createContext({
  conversations: [],
  activeConversation: null,
  messages: [],
  unreadCount: 0,
  loading: false,
  messagesLoading: false,
  fetchConversations: () => Promise.resolve(),
  fetchUnreadCount: () => Promise.resolve(),
  startConversation: () => Promise.resolve(null),
  fetchMessages: () => Promise.resolve(),
  sendMessage: () => Promise.resolve(),
  deleteMessage: () => Promise.resolve(),
  markAsRead: () => Promise.resolve(),
  toggleMute: () => Promise.resolve(),
  archiveConversation: () => Promise.resolve(),
  setActiveConversation: () => {},
  setMessages: () => {},
});

export const MessagesProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  const api = useApi();
  const { user } = useAuth();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const fetchingRef = useRef(false);

  // Check if we have a valid session with token
  const hasValidSession = status === "authenticated" && session?.backendToken && user;
  
  // Only fetch when on messages page or when explicitly needed
  const isMessagesPage = pathname?.startsWith('/messages');

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    // Don't fetch if already fetching or no valid session
    if (fetchingRef.current) return;
    if (!hasValidSession) {
      console.log("MessagesContext: No valid session, skipping fetch");
      return;
    }
    
    try {
      fetchingRef.current = true;
      setLoading(true);
      const response = await api.get("/api/messages/conversations");
      if (response.data?.data) {
        setConversations(response.data.data);
        setInitialized(true);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      // Don't throw - silently fail
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [api, hasValidSession]);

  // Fetch unread count - lightweight call
  const fetchUnreadCount = useCallback(async () => {
    if (!user || !hasValidSession) return;
    
    try {
      const response = await api.get("/api/messages/unread-count");
      if (response.data?.data) {
        setUnreadCount(response.data.data.unreadCount || 0);
      }
    } catch (error) {
      // Silently fail - not critical
    }
  }, [api, user, hasValidSession]);

  // Get or create conversation with a user
  const startConversation = async (userId) => {
    if (!hasValidSession) {
      console.warn("Cannot start conversation: no valid session");
      return null;
    }
    
    try {
      const response = await api.post(`/api/messages/conversations/${userId}`);
      const conversation = response.data.data;
      
      if (!conversation) {
        throw new Error("No conversation data returned");
      }
      
      // Add to conversations if not exists, or update if exists
      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c._id === conversation._id);
        if (existingIndex === -1) {
          // Add new conversation at the beginning
          return [conversation, ...prev];
        }
        // Update existing conversation
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...conversation };
        return updated;
      });
      
      // Return conversation with proper structure
      return conversation;
    } catch (error) {
      console.error("Error starting conversation:", error);
      throw error;
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId, page = 1) => {
    try {
      setMessagesLoading(true);
      const response = await api.get(
        `/api/messages/conversations/${conversationId}/messages?page=${page}&limit=50`
      );
      
      if (page === 1) {
        setMessages(response.data.data.messages);
      } else {
        setMessages(prev => [...response.data.data.messages, ...prev]);
      }
      
      return response.data.data;
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw error;
    } finally {
      setMessagesLoading(false);
    }
  };

  // Send a message
  const sendMessage = async (conversationId, messageData) => {
    try {
      const response = await api.post(
        `/api/messages/conversations/${conversationId}/messages`,
        messageData
      );
      
      const newMessage = response.data.data;
      setMessages(prev => [...prev, newMessage]);
      
      // Update conversation in list
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              lastMessage: newMessage,
              lastMessageAt: new Date().toISOString(),
            };
          }
          return conv;
        });
        // Move conversation to top
        const conv = updated.find(c => c._id === conversationId);
        const others = updated.filter(c => c._id !== conversationId);
        return conv ? [conv, ...others] : updated;
      });
      
      return newMessage;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  // Delete a message
  const deleteMessage = async (messageId) => {
    try {
      await api.delete(`/api/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m._id !== messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  };

  // Mark conversation as read
  const markAsRead = async (conversationId) => {
    try {
      await api.patch(`/api/messages/conversations/${conversationId}/read`);
      
      // Update local state
      setConversations(prev =>
        prev.map(conv =>
          conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );
      
      // Update total unread count
      fetchUnreadCount();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  // Toggle mute conversation
  const toggleMute = async (conversationId) => {
    try {
      const response = await api.patch(
        `/api/messages/conversations/${conversationId}/mute`
      );
      
      setConversations(prev =>
        prev.map(conv =>
          conv._id === conversationId
            ? { ...conv, isMuted: response.data.data.isMuted }
            : conv
        )
      );
      
      return response.data.data.isMuted;
    } catch (error) {
      console.error("Error toggling mute:", error);
      throw error;
    }
  };

  // Archive conversation
  const archiveConversation = async (conversationId) => {
    try {
      await api.patch(`/api/messages/conversations/${conversationId}/archive`);
      setConversations(prev => prev.filter(c => c._id !== conversationId));
    } catch (error) {
      console.error("Error archiving conversation:", error);
      throw error;
    }
  };

  // Initial fetch - when on messages page and session becomes valid
  useEffect(() => {
    if (hasValidSession && isMessagesPage && !initialized) {
      fetchConversations();
    }
  }, [hasValidSession, isMessagesPage, initialized, fetchConversations]);

  // Reset initialized when leaving messages page
  useEffect(() => {
    if (!isMessagesPage) {
      setInitialized(false);
    }
  }, [isMessagesPage]);

  // Fetch unread count on session change (lightweight, with delay)
  useEffect(() => {
    if (hasValidSession) {
      // Delay to avoid blocking render and prevent 401 on initial load
      const timer = setTimeout(() => {
        fetchUnreadCount();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasValidSession, fetchUnreadCount]);

  // Poll for new messages every 60 seconds (only on messages page)
  useEffect(() => {
    if (!hasValidSession || !isMessagesPage) return;
    
    const interval = setInterval(() => {
      fetchUnreadCount();
      if (activeConversation) {
        fetchMessages(activeConversation._id, 1);
      }
    }, 60000); // Reduced frequency to 60 seconds
    
    return () => clearInterval(interval);
  }, [hasValidSession, isMessagesPage, activeConversation, fetchUnreadCount, fetchMessages]);

  return (
    <MessagesContext.Provider
      value={{
        conversations,
        activeConversation,
        setActiveConversation,
        messages,
        setMessages,
        unreadCount,
        loading,
        messagesLoading,
        fetchConversations,
        fetchUnreadCount,
        startConversation,
        fetchMessages,
        sendMessage,
        deleteMessage,
        markAsRead,
        toggleMute,
        archiveConversation,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }
  return context;
};
