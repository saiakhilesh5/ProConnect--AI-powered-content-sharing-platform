"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "./AuthContext";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocket } from "./SocketContext";

const MessagesContext = createContext({
  conversations: [],
  archivedConversations: [],
  activeConversation: null,
  messages: [],
  pinnedMessages: [],
  starredMessages: [],
  unreadCount: 0,
  loading: false,
  messagesLoading: false,
  typingUsers: [],
  conversationInfo: null,
  // Core functions
  fetchConversations: () => Promise.resolve(),
  fetchArchivedConversations: () => Promise.resolve(),
  fetchUnreadCount: () => Promise.resolve(),
  startConversation: () => Promise.resolve(null),
  fetchMessages: () => Promise.resolve(),
  sendMessage: () => Promise.resolve(),
  deleteMessage: () => Promise.resolve(),
  markAsRead: () => Promise.resolve(),
  toggleMute: () => Promise.resolve(),
  archiveConversation: () => Promise.resolve(),
  deleteConversation: () => Promise.resolve(),
  blockConversation: () => Promise.resolve(),
  setActiveConversation: () => {},
  setMessages: () => {},
  // Advanced features
  addReaction: () => Promise.resolve(),
  removeReaction: () => Promise.resolve(),
  editMessage: () => Promise.resolve(),
  unsendMessage: () => Promise.resolve(),
  forwardMessage: () => Promise.resolve(),
  pinMessage: () => Promise.resolve(),
  starMessage: () => Promise.resolve(),
  fetchPinnedMessages: () => Promise.resolve(),
  fetchStarredMessages: () => Promise.resolve(),
  searchMessages: () => Promise.resolve([]),
  // Typing indicators
  updateTypingStatus: () => Promise.resolve(),
  // Voice & Image
  uploadVoiceMessage: () => Promise.resolve(),
  uploadMessageImage: () => Promise.resolve(),
  // Chat customization
  toggleVanishMode: () => Promise.resolve(),
  updateChatTheme: () => Promise.resolve(),
  setQuickEmoji: () => Promise.resolve(),
  setNickname: () => Promise.resolve(),
  // Message info
  getMessageInfo: () => Promise.resolve(null),
  // Groups
  createGroup: () => Promise.resolve(null),
  updateGroup: () => Promise.resolve(null),
  addGroupMembers: () => Promise.resolve(null),
  removeGroupMember: () => Promise.resolve(),
  leaveGroup: () => Promise.resolve(),
  makeGroupAdmin: () => Promise.resolve(),
  removeGroupAdmin: () => Promise.resolve(),
  // Online Status
  updateOnlineStatus: () => Promise.resolve(),
  getUserStatus: () => Promise.resolve(null),
  updatePrivacySettings: () => Promise.resolve(),
  // Polls
  createPoll: () => Promise.resolve(null),
  votePoll: () => Promise.resolve(null),
  removeVote: () => Promise.resolve(null),
  closePoll: () => Promise.resolve(null),
  getPoll: () => Promise.resolve(null),
  // Calls
  initiateCall: () => Promise.resolve(null),
  answerCall: () => Promise.resolve(null),
  declineCall: () => Promise.resolve(null),
  endCall: () => Promise.resolve(null),
  leaveCall: () => Promise.resolve(null),
  getCall: () => Promise.resolve(null),
  // Location
  sendLocation: () => Promise.resolve(null),
});

export const MessagesProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [starredMessages, setStarredMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [conversationInfo, setConversationInfo] = useState(null);
  
  const api = useApi();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const fetchingRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const typingPollingRef = useRef(null);
  const activeConversationRef = useRef(null);

  // Keep ref in sync with state for use inside socket callbacks
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // ==================== REAL-TIME SOCKET LISTENERS ====================
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ conversationId, message }) => {
      const currentConv = activeConversationRef.current;
      // If the message is for the active conversation, append it
      if (currentConv && currentConv._id === conversationId) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }
      // Update last message in conversations list
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv._id === conversationId) {
            return { ...conv, lastMessage: message, lastMessageAt: message.createdAt };
          }
          return conv;
        });
        // Bubble updated conversation to top
        const conv = updated.find(c => c._id === conversationId);
        const others = updated.filter(c => c._id !== conversationId);
        return conv ? [conv, ...others] : updated;
      });
    };

    const handleTyping = ({ conversationId, userId, user: typingUser, isTyping }) => {
      const currentConv = activeConversationRef.current;
      if (!currentConv || currentConv._id !== conversationId) return;
      setTypingUsers(prev => {
        if (isTyping) {
          if (prev.some(u => u._id === userId)) return prev;
          return [...prev, { _id: userId, ...typingUser }];
        } else {
          return prev.filter(u => u._id !== userId);
        }
      });
    };

    socket.on('message:new', handleNewMessage);
    socket.on('user:typing', handleTyping);

    // Re-fetch messages when socket reconnects (in case messages were missed during disconnect)
    const handleReconnect = () => {
      if (activeConversationRef.current) {
        fetchMessages(activeConversationRef.current._id, 1);
      }
      fetchConversations();
    };
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('user:typing', handleTyping);
      socket.off('connect', handleReconnect);
    };
  }, [socket]);

  // Check if we have a valid session with token
  const hasValidSession = status === "authenticated" && session?.backendToken && user;
  
  // Only fetch when on messages page or when explicitly needed
  const isMessagesPage = pathname?.startsWith('/messages');

  // ==================== CONVERSATION FUNCTIONS ====================

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (fetchingRef.current) return;
    if (!hasValidSession) return;
    
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
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [api, hasValidSession]);

  // Fetch archived conversations
  const fetchArchivedConversations = useCallback(async () => {
    if (!hasValidSession) return;
    
    try {
      const response = await api.get("/api/messages/conversations/archived");
      if (response.data?.data) {
        setArchivedConversations(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching archived conversations:", error);
    }
  }, [api, hasValidSession]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user || !hasValidSession) return;
    
    try {
      const response = await api.get("/api/messages/unread-count");
      if (response.data?.data) {
        setUnreadCount(response.data.data.unreadCount || 0);
      }
    } catch (error) {
      // Silently fail
    }
  }, [api, user, hasValidSession]);

  // Get or create conversation with a user
  const startConversation = async (userId) => {
    if (!hasValidSession) return null;
    
    try {
      const response = await api.post(`/api/messages/conversations/${userId}`);
      const conversation = response.data.data;
      
      if (!conversation) throw new Error("No conversation data returned");
      
      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c._id === conversation._id);
        if (existingIndex === -1) {
          return [conversation, ...prev];
        }
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...conversation };
        return updated;
      });
      
      return conversation;
    } catch (error) {
      console.error("Error starting conversation:", error);
      throw error;
    }
  };

  // Delete conversation
  const deleteConversation = async (conversationId) => {
    try {
      await api.delete(`/api/messages/conversations/${conversationId}`);
      setConversations(prev => prev.filter(c => c._id !== conversationId));
      if (activeConversation?._id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      throw error;
    }
  };

  // Block/unblock conversation
  const blockConversation = async (conversationId) => {
    try {
      const response = await api.patch(`/api/messages/conversations/${conversationId}/block`);
      
      setConversations(prev =>
        prev.map(conv =>
          conv._id === conversationId
            ? { ...conv, isBlocked: response.data.data.isBlocked }
            : conv
        )
      );
      
      return response.data.data.isBlocked;
    } catch (error) {
      console.error("Error blocking conversation:", error);
      throw error;
    }
  };

  // ==================== MESSAGE FUNCTIONS ====================

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId, page = 1) => {
    try {
      setMessagesLoading(true);
      const response = await api.get(
        `/api/messages/conversations/${conversationId}/messages?page=${page}&limit=50`
      );
      
      const data = response.data.data;
      
      if (page === 1) {
        setMessages(data.messages);
      } else {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m._id));
          const newOnes = data.messages.filter(m => !existingIds.has(m._id));
          return [...newOnes, ...prev];
        });
      }
      
      // Set conversation info
      if (data.conversationInfo) {
        setConversationInfo(data.conversationInfo);
      }
      
      return data;
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
      setMessages(prev =>
        prev.some(m => m._id === newMessage._id) ? prev : [...prev, newMessage]
      );
      
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
        const conv = updated.find(c => c._id === conversationId);
        const others = updated.filter(c => c._id !== conversationId);
        return conv ? [conv, ...others] : updated;
      });
      
      // Clear typing status after sending
      updateTypingStatus(conversationId, false);
      
      return newMessage;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  // Delete a message (for self)
  const deleteMessage = async (messageId) => {
    try {
      await api.delete(`/api/messages/${messageId}`);
      setMessages(prev => prev.filter(m => m._id !== messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  };

  // Edit a message
  const editMessage = async (messageId, content) => {
    try {
      const response = await api.patch(`/api/messages/${messageId}`, { content });
      
      setMessages(prev =>
        prev.map(m =>
          m._id === messageId
            ? { ...m, content, isEdited: true, editedAt: new Date().toISOString() }
            : m
        )
      );
      
      return response.data.data;
    } catch (error) {
      console.error("Error editing message:", error);
      throw error;
    }
  };

  // Unsend message (delete for everyone)
  const unsendMessage = async (messageId) => {
    try {
      await api.delete(`/api/messages/${messageId}/unsend`);
      
      setMessages(prev =>
        prev.map(m =>
          m._id === messageId
            ? { ...m, content: null, imageUrl: null, voiceUrl: null, isDeleted: true, deletedForEveryone: true }
            : m
        )
      );
    } catch (error) {
      console.error("Error unsending message:", error);
      throw error;
    }
  };

  // Forward message
  const forwardMessage = async (messageId, conversationIds) => {
    try {
      const response = await api.post(`/api/messages/${messageId}/forward`, { conversationIds });
      return response.data.data;
    } catch (error) {
      console.error("Error forwarding message:", error);
      throw error;
    }
  };

  // ==================== REACTIONS ====================

  // Add reaction to message
  const addReaction = async (messageId, emoji) => {
    try {
      const response = await api.post(`/api/messages/${messageId}/reactions`, { emoji });
      
      setMessages(prev =>
        prev.map(m =>
          m._id === messageId
            ? { ...m, reactions: response.data.data }
            : m
        )
      );
      
      return response.data.data;
    } catch (error) {
      console.error("Error adding reaction:", error);
      throw error;
    }
  };

  // Remove reaction from message
  const removeReaction = async (messageId) => {
    try {
      await api.delete(`/api/messages/${messageId}/reactions`);
      
      setMessages(prev =>
        prev.map(m => {
          if (m._id === messageId) {
            const filteredReactions = m.reactions?.filter(
              r => (r.user?._id || r.user) !== user?._id
            );
            return { ...m, reactions: filteredReactions };
          }
          return m;
        })
      );
    } catch (error) {
      console.error("Error removing reaction:", error);
      throw error;
    }
  };

  // ==================== PIN & STAR ====================

  // Pin/unpin message
  const pinMessage = async (messageId) => {
    try {
      const response = await api.post(`/api/messages/${messageId}/pin`);
      
      setMessages(prev =>
        prev.map(m =>
          m._id === messageId
            ? { ...m, isPinned: response.data.data.isPinned }
            : m
        )
      );
      
      // Refresh pinned messages
      if (activeConversation) {
        fetchPinnedMessages(activeConversation._id);
      }
      
      return response.data.data.isPinned;
    } catch (error) {
      console.error("Error pinning message:", error);
      throw error;
    }
  };

  // Star/unstar message
  const starMessage = async (messageId) => {
    try {
      const response = await api.post(`/api/messages/${messageId}/star`);
      
      setMessages(prev =>
        prev.map(m =>
          m._id === messageId
            ? { ...m, isStarred: response.data.data.isStarred }
            : m
        )
      );
      
      return response.data.data.isStarred;
    } catch (error) {
      console.error("Error starring message:", error);
      throw error;
    }
  };

  // Fetch pinned messages
  const fetchPinnedMessages = async (conversationId) => {
    try {
      const response = await api.get(`/api/messages/conversations/${conversationId}/pinned`);
      setPinnedMessages(response.data.data || []);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching pinned messages:", error);
    }
  };

  // Fetch starred messages
  const fetchStarredMessages = async () => {
    try {
      const response = await api.get("/api/messages/starred");
      setStarredMessages(response.data.data || []);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching starred messages:", error);
    }
  };

  // Search messages in conversation
  const searchMessages = async (conversationId, query) => {
    try {
      const response = await api.get(
        `/api/messages/conversations/${conversationId}/search?q=${encodeURIComponent(query)}`
      );
      return response.data.data.messages || [];
    } catch (error) {
      console.error("Error searching messages:", error);
      return [];
    }
  };

  // ==================== TYPING INDICATORS ====================

  // Update typing status
  const updateTypingStatus = async (conversationId, isTyping) => {
    try {
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      await api.post(`/api/messages/conversations/${conversationId}/typing`, { isTyping });
      
      // Auto-stop typing after 3 seconds of inactivity
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          updateTypingStatus(conversationId, false);
        }, 3000);
      }
    } catch (error) {
      // Silently fail
    }
  };

  // Fetch typing status
  const fetchTypingStatus = async (conversationId) => {
    try {
      const response = await api.get(`/api/messages/conversations/${conversationId}/typing`);
      setTypingUsers(response.data.data?.typingUsers || []);
    } catch (error) {
      // Silently fail
    }
  };

  // ==================== UPLOADS ====================

  // Upload voice message
  const uploadVoiceMessage = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('voice', audioBlob, 'voice-message.webm');
      
      const response = await api.post('/api/messages/upload-voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      return response.data.data;
    } catch (error) {
      console.error("Error uploading voice message:", error);
      throw error;
    }
  };

  // Upload message image
  const uploadMessageImage = async (imageFile) => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await api.post('/api/messages/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      return response.data.data;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  // ==================== CHAT CUSTOMIZATION ====================

  // Toggle vanish mode
  const toggleVanishMode = async (conversationId) => {
    try {
      const response = await api.patch(`/api/messages/conversations/${conversationId}/vanish`);
      
      setConversations(prev =>
        prev.map(conv =>
          conv._id === conversationId
            ? { ...conv, vanishMode: response.data.data.vanishMode }
            : conv
        )
      );
      
      setConversationInfo(prev => 
        prev ? { ...prev, vanishMode: response.data.data.vanishMode } : prev
      );
      
      return response.data.data.vanishMode;
    } catch (error) {
      console.error("Error toggling vanish mode:", error);
      throw error;
    }
  };

  // Update chat theme
  const updateChatTheme = async (conversationId, theme) => {
    try {
      await api.patch(`/api/messages/conversations/${conversationId}/theme`, theme);
      
      setConversations(prev =>
        prev.map(conv =>
          conv._id === conversationId
            ? { ...conv, theme }
            : conv
        )
      );
    } catch (error) {
      console.error("Error updating theme:", error);
      throw error;
    }
  };

  // Set quick emoji
  const setQuickEmoji = async (conversationId, emoji) => {
    try {
      const response = await api.patch(
        `/api/messages/conversations/${conversationId}/quick-emoji`,
        { emoji }
      );
      
      setConversations(prev =>
        prev.map(conv =>
          conv._id === conversationId
            ? { ...conv, quickEmoji: response.data.data.quickEmoji }
            : conv
        )
      );
      
      return response.data.data.quickEmoji;
    } catch (error) {
      console.error("Error setting quick emoji:", error);
      throw error;
    }
  };

  // Set nickname
  const setNickname = async (conversationId, targetUserId, nickname) => {
    try {
      await api.patch(`/api/messages/conversations/${conversationId}/nickname`, {
        targetUserId,
        nickname,
      });
    } catch (error) {
      console.error("Error setting nickname:", error);
      throw error;
    }
  };

  // ==================== EXISTING FUNCTIONS ====================

  // Mark conversation as read
  const markAsRead = async (conversationId) => {
    try {
      await api.patch(`/api/messages/conversations/${conversationId}/read`);
      
      setConversations(prev =>
        prev.map(conv =>
          conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );
      
      fetchUnreadCount();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  // Toggle mute conversation
  const toggleMute = async (conversationId, duration = null) => {
    try {
      const response = await api.patch(
        `/api/messages/conversations/${conversationId}/mute`,
        { duration }
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

  // Get message info (read receipts, etc.)
  const getMessageInfo = async (messageId) => {
    try {
      const response = await api.get(`/api/messages/${messageId}/info`);
      return response.data.data;
    } catch (error) {
      console.error("Error getting message info:", error);
      return null;
    }
  };

  // ==================== GROUP FUNCTIONS ====================

  // Create a group
  const createGroup = async (name, description, participants, groupImage = null) => {
    try {
      const response = await api.post('/api/messages/groups', {
        name,
        description,
        participants,
        groupImage,
      });
      
      const group = response.data.data;
      setConversations(prev => [group, ...prev]);
      return group;
    } catch (error) {
      console.error("Error creating group:", error);
      throw error;
    }
  };

  // Update group info
  const updateGroup = async (groupId, { name, description, groupImage }) => {
    try {
      const response = await api.patch(`/api/messages/groups/${groupId}`, {
        name,
        description,
        groupImage,
      });
      
      setConversations(prev =>
        prev.map(conv =>
          conv._id === groupId ? { ...conv, ...response.data.data } : conv
        )
      );
      
      return response.data.data;
    } catch (error) {
      console.error("Error updating group:", error);
      throw error;
    }
  };

  // Add members to group
  const addGroupMembers = async (groupId, userIds) => {
    try {
      const response = await api.post(`/api/messages/groups/${groupId}/members`, { userIds });
      
      setConversations(prev =>
        prev.map(conv =>
          conv._id === groupId ? response.data.data : conv
        )
      );
      
      return response.data.data;
    } catch (error) {
      console.error("Error adding members:", error);
      throw error;
    }
  };

  // Remove member from group
  const removeGroupMember = async (groupId, memberId) => {
    try {
      await api.delete(`/api/messages/groups/${groupId}/members/${memberId}`);
    } catch (error) {
      console.error("Error removing member:", error);
      throw error;
    }
  };

  // Leave group
  const leaveGroup = async (groupId) => {
    try {
      await api.post(`/api/messages/groups/${groupId}/leave`);
      setConversations(prev => prev.filter(c => c._id !== groupId));
      if (activeConversation?._id === groupId) {
        setActiveConversation(null);
      }
    } catch (error) {
      console.error("Error leaving group:", error);
      throw error;
    }
  };

  // Make user admin
  const makeGroupAdmin = async (groupId, memberId) => {
    try {
      await api.post(`/api/messages/groups/${groupId}/admins/${memberId}`);
    } catch (error) {
      console.error("Error making admin:", error);
      throw error;
    }
  };

  // Remove admin role
  const removeGroupAdmin = async (groupId, memberId) => {
    try {
      await api.delete(`/api/messages/groups/${groupId}/admins/${memberId}`);
    } catch (error) {
      console.error("Error removing admin:", error);
      throw error;
    }
  };

  // ==================== ONLINE STATUS FUNCTIONS ====================

  // Update online status
  const updateOnlineStatus = async (isOnline) => {
    try {
      await api.post('/api/messages/status/online', { isOnline });
    } catch (error) {
      console.error("Error updating online status:", error);
    }
  };

  // Get user status
  const getUserStatus = async (userId) => {
    try {
      const response = await api.get(`/api/messages/users/${userId}/status`);
      return response.data.data;
    } catch (error) {
      console.error("Error getting user status:", error);
      return null;
    }
  };

  // Update privacy settings
  const updatePrivacySettings = async (settings) => {
    try {
      await api.patch('/api/messages/settings/privacy', settings);
    } catch (error) {
      console.error("Error updating privacy:", error);
      throw error;
    }
  };

  // ==================== POLL FUNCTIONS ====================

  // Create poll
  const createPoll = async (conversationId, pollData) => {
    try {
      const response = await api.post(
        `/api/messages/conversations/${conversationId}/polls`,
        pollData
      );
      
      const { poll, message } = response.data.data;
      setMessages(prev => [...prev, message]);
      
      return { poll, message };
    } catch (error) {
      console.error("Error creating poll:", error);
      throw error;
    }
  };

  // Vote on poll
  const votePoll = async (pollId, optionIndexes) => {
    try {
      const response = await api.post(`/api/messages/polls/${pollId}/vote`, { optionIndexes });
      return response.data.data;
    } catch (error) {
      console.error("Error voting:", error);
      throw error;
    }
  };

  // Remove vote
  const removeVote = async (pollId) => {
    try {
      const response = await api.delete(`/api/messages/polls/${pollId}/vote`);
      return response.data.data;
    } catch (error) {
      console.error("Error removing vote:", error);
      throw error;
    }
  };

  // Close poll
  const closePoll = async (pollId) => {
    try {
      const response = await api.post(`/api/messages/polls/${pollId}/close`);
      return response.data.data;
    } catch (error) {
      console.error("Error closing poll:", error);
      throw error;
    }
  };

  // Get poll details
  const getPoll = async (pollId) => {
    try {
      const response = await api.get(`/api/messages/polls/${pollId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error getting poll:", error);
      return null;
    }
  };

  // ==================== CALL FUNCTIONS ====================

  // Initiate call
  const initiateCall = async (conversationId, callType) => {
    try {
      const response = await api.post(
        `/api/messages/conversations/${conversationId}/call`,
        { callType }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error initiating call:", error);
      throw error;
    }
  };

  // Answer call
  const answerCall = async (callId) => {
    try {
      const response = await api.post(`/api/messages/calls/${callId}/answer`);
      return response.data.data;
    } catch (error) {
      console.error("Error answering call:", error);
      throw error;
    }
  };

  // Decline call
  const declineCall = async (callId) => {
    try {
      const response = await api.post(`/api/messages/calls/${callId}/decline`);
      return response.data.data;
    } catch (error) {
      console.error("Error declining call:", error);
      throw error;
    }
  };

  // End call
  const endCall = async (callId) => {
    try {
      const response = await api.post(`/api/messages/calls/${callId}/end`);
      return response.data.data;
    } catch (error) {
      console.error("Error ending call:", error);
      throw error;
    }
  };

  // Leave call
  const leaveCall = async (callId) => {
    try {
      const response = await api.post(`/api/messages/calls/${callId}/leave`);
      return response.data.data;
    } catch (error) {
      console.error("Error leaving call:", error);
      throw error;
    }
  };

  // Get call details
  const getCall = async (callId) => {
    try {
      const response = await api.get(`/api/messages/calls/${callId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error getting call:", error);
      return null;
    }
  };

  // ==================== LOCATION FUNCTION ====================

  // Send location
  const sendLocation = async (conversationId, locationData) => {
    try {
      const response = await api.post(
        `/api/messages/conversations/${conversationId}/location`,
        locationData
      );
      
      const message = response.data.data;
      setMessages(prev => [...prev, message]);
      return message;
    } catch (error) {
      console.error("Error sending location:", error);
      throw error;
    }
  };

  // ==================== EFFECTS ====================

  // Initial fetch
  useEffect(() => {
    if (hasValidSession && isMessagesPage && !initialized) {
      fetchConversations();
    }
  }, [hasValidSession, isMessagesPage, initialized, fetchConversations]);

  // Reset when leaving messages page
  useEffect(() => {
    if (!isMessagesPage) {
      setInitialized(false);
      setTypingUsers([]);
    }
  }, [isMessagesPage]);

  // Fetch unread count on session change
  useEffect(() => {
    if (hasValidSession) {
      const timer = setTimeout(() => {
        fetchUnreadCount();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasValidSession, fetchUnreadCount]);

  // Poll for new messages and typing status
  useEffect(() => {
    if (!hasValidSession || !isMessagesPage) return;
    
    // Message polling at 8s as fallback when socket event is missed
    const messageInterval = setInterval(() => {
      fetchUnreadCount();
      if (activeConversation) {
        fetchMessages(activeConversation._id, 1);
      }
    }, 8000);
    
    // Typing status polling (2 seconds) - only when conversation is active
    if (activeConversation) {
      typingPollingRef.current = setInterval(() => {
        fetchTypingStatus(activeConversation._id);
      }, 2000);
    }
    
    return () => {
      clearInterval(messageInterval);
      if (typingPollingRef.current) {
        clearInterval(typingPollingRef.current);
      }
    };
  }, [hasValidSession, isMessagesPage, activeConversation]);

  // Clear typing polling when conversation changes
  useEffect(() => {
    if (typingPollingRef.current) {
      clearInterval(typingPollingRef.current);
    }
    setTypingUsers([]);
  }, [activeConversation?._id]);

  return (
    <MessagesContext.Provider
      value={{
        // State
        conversations,
        archivedConversations,
        activeConversation,
        setActiveConversation,
        messages,
        setMessages,
        pinnedMessages,
        starredMessages,
        unreadCount,
        loading,
        messagesLoading,
        typingUsers,
        conversationInfo,
        // Conversation functions
        fetchConversations,
        fetchArchivedConversations,
        fetchUnreadCount,
        startConversation,
        deleteConversation,
        blockConversation,
        markAsRead,
        toggleMute,
        archiveConversation,
        // Message functions
        fetchMessages,
        sendMessage,
        deleteMessage,
        editMessage,
        unsendMessage,
        forwardMessage,
        // Reactions
        addReaction,
        removeReaction,
        // Pin & Star
        pinMessage,
        starMessage,
        fetchPinnedMessages,
        fetchStarredMessages,
        searchMessages,
        // Typing
        updateTypingStatus,
        // Uploads
        uploadVoiceMessage,
        uploadMessageImage,
        // Customization
        toggleVanishMode,
        updateChatTheme,
        setQuickEmoji,
        setNickname,
        // Info
        getMessageInfo,
        // Groups
        createGroup,
        updateGroup,
        addGroupMembers,
        removeGroupMember,
        leaveGroup,
        makeGroupAdmin,
        removeGroupAdmin,
        // Online Status
        updateOnlineStatus,
        getUserStatus,
        updatePrivacySettings,
        // Polls
        createPoll,
        votePoll,
        removeVote,
        closePoll,
        getPoll,
        // Calls
        initiateCall,
        answerCall,
        declineCall,
        endCall,
        leaveCall,
        getCall,
        // Location
        sendLocation,
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
