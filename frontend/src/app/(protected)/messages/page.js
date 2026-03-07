"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useMessages } from "@/context/MessagesContext";
import { useAuth } from "@/context/AuthContext";
import { useCall } from "@/context/CallContext";
import { useApi } from "@/hooks/useApi";
import { format, formatDistanceToNow } from "date-fns";
import EmojiPicker from "emoji-picker-react";
import {
  Search,
  Send,
  MoreVertical,
  ArrowLeft,
  Image as ImageIcon,
  Smile,
  Check,
  CheckCheck,
  Trash2,
  VolumeX,
  Volume2,
  Archive,
  ArchiveRestore,
  Plus,
  X,
  UserPlus,
  Phone,
  Video,
  Mic,
  Users,
  MapPin,
  BarChart2,
  Reply,
  Forward,
  ChevronDown,
  Circle,
  Paperclip,
  StopCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function MessagesPage() {
  const {
    conversations,
    archivedConversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    messagesLoading,
    fetchConversations,
    fetchArchivedConversations,
    fetchMessages,
    sendMessage,
    deleteMessage,
    markAsRead,
    toggleMute,
    archiveConversation,
    startConversation,
    addReaction,
    removeReaction,
    uploadMessageImage,
    uploadVoiceMessage,
    forwardMessage,
    createGroup,
    getUserStatus,
    createPoll,
    votePoll,
    getPoll,
    sendLocation,
  } = useMessages();
  
  const { user } = useAuth();
  const { initiateCall: startCall } = useCall();
  const api = useApi();
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showPollDialog, setShowPollDialog] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null); // { file, previewUrl }
  const [imageCaption, setImageCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [userStatus, setUserStatus] = useState(null);
  const [showReactions, setShowReactions] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  
  // Group creation state
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  
  // Poll creation state
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  
  // Voice recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  
  const messagesEndRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const imageInputRef = useRef(null);
  
  // Quick reaction emojis
  const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍', '🔥'];

  // Fetch user status when conversation changes
  useEffect(() => {
    const fetchStatus = async () => {
      if (activeConversation?.participant?._id) {
        const status = await getUserStatus(activeConversation.participant._id);
        setUserStatus(status);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [activeConversation?.participant?._id, getUserStatus]);

  // Handle image select — show preview modal
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;
    const previewUrl = URL.createObjectURL(file);
    setImagePreview({ file, previewUrl });
    setImageCaption("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // Send image from preview modal
  const handleImageSend = async () => {
    if (!imagePreview || !activeConversation) return;
    try {
      setUploading(true);
      const imageData = await uploadMessageImage(imagePreview.file);
      if (imageData?.imageUrl) {
        await sendMessage(activeConversation._id, {
          content: imageCaption.trim() || "Sent an image",
          messageType: "image",
          imageUrl: imageData.imageUrl,
        });
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(imagePreview.previewUrl);
      setImagePreview(null);
      setImageCaption("");
    }
  };

  // Handle emoji select
  const handleEmojiClick = (emojiData) => {
    setMessageText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Handle reaction
  const handleReaction = async (messageId, emoji) => {
    await addReaction(messageId, emoji);
    setShowReactions(null);
  };

  // Handle poll vote
  const handlePollVote = async (pollId, optionIndex) => {
    try {
      await votePoll(pollId, [optionIndex]);
      // Refresh messages to show updated poll
      if (activeConversation) {
        fetchMessages(activeConversation._id);
      }
    } catch (error) {
      console.error("Failed to vote:", error);
    }
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  // Stop voice recording and send
  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !activeConversation) return;
    
    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        clearInterval(recordingIntervalRef.current);
        setIsRecording(false);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'voice_message.webm', { type: 'audio/webm' });
        
        try {
          setUploading(true);
          const voiceData = await uploadVoiceMessage(audioFile, activeConversation._id);
          if (voiceData) {
            await fetchMessages(activeConversation._id);
          }
        } catch (error) {
          console.error("Failed to upload voice:", error);
        } finally {
          setUploading(false);
        }
        
        // Stop all tracks
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        resolve();
      };
      
      mediaRecorderRef.current.stop();
    });
  };

  // Cancel recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    clearInterval(recordingIntervalRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  // Format recording time
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle call
  const handleCall = async (type) => {
    if (!activeConversation) return;
    try {
      await startCall(activeConversation._id, type);
    } catch (error) {
      console.error("Failed to initiate call:", error);
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedGroupMembers.length === 0) return;
    
    try {
      const group = await createGroup(
        groupName,
        groupDescription,
        selectedGroupMembers.map(m => m._id)
      );
      if (group) {
        setShowNewGroup(false);
        setGroupName("");
        setGroupDescription("");
        setSelectedGroupMembers([]);
        setActiveConversation(group);
        setShowMobileChat(true);
      }
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };

  // Toggle member selection for group
  const toggleGroupMember = (member) => {
    setSelectedGroupMembers(prev => {
      const exists = prev.some(m => m._id === member._id);
      if (exists) {
        return prev.filter(m => m._id !== member._id);
      }
      return [...prev, member];
    });
  };

  // Create poll
  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
    
    try {
      await createPoll(activeConversation._id, {
        question: pollQuestion,
        options: pollOptions.filter(o => o.trim()),
        allowMultipleVotes,
      });
      setShowPollDialog(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setAllowMultipleVotes(false);
    } catch (error) {
      console.error("Failed to create poll:", error);
    }
  };

  // Add poll option
  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  // Update poll option
  const updatePollOption = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  // Remove poll option
  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  // Get user online status text
  const getStatusText = () => {
    if (!userStatus) return null;
    if (userStatus.isOnline) return "Online";
    if (userStatus.lastActive) {
      return `Last seen ${formatDistanceToNow(new Date(userStatus.lastActive), { addSuffix: true })}`;
    }
    return null;
  };

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch archived conversations when switching to archived view
  useEffect(() => {
    if (showArchived) {
      fetchArchivedConversations();
    }
  }, [showArchived, fetchArchivedConversations]);

  // Search for users to start a new conversation
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!userSearchQuery.trim()) {
      setSearchedUsers([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearchingUsers(true);
        const response = await api.get(`/api/users/search?query=${encodeURIComponent(userSearchQuery)}`);
        if (response.data?.data) {
          // Filter out current user
          const users = response.data.data.filter(u => u._id !== user?._id);
          setSearchedUsers(users);
        }
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setSearchingUsers(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [userSearchQuery, api, user]);

  // Handle starting a new conversation with a user
  const handleStartConversation = async (selectedUser) => {
    try {
      const conversation = await startConversation(selectedUser._id);
      if (conversation) {
        // Ensure conversation has participant data for the UI
        const conversationWithParticipant = {
          ...conversation,
          participant: conversation.participant || selectedUser,
        };
        setActiveConversation(conversationWithParticipant);
        setShowNewChat(false);
        setUserSearchQuery("");
        setSearchedUsers([]);
        setShowMobileChat(true);
        // Refresh conversations list
        fetchConversations();
      }
    } catch (error) {
      console.error("Failed to start conversation:", error);
    }
  };

  // Filter conversations by search
  const conversationsList = showArchived ? archivedConversations : conversations;
  const filteredConversations = conversationsList.filter((conv) =>
    conv.participant?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participant?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle unarchive/archive action
  const handleArchiveToggle = async (conversationId) => {
    await archiveConversation(conversationId);
    if (showArchived) {
      fetchArchivedConversations();
    } else {
      fetchConversations();
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation._id);
      markAsRead(activeConversation._id);
    }
  }, [activeConversation]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation) return;

    try {
      await sendMessage(activeConversation._id, {
        content: messageText.trim(),
        messageType: "text",
      });
      setMessageText("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleSelectConversation = (conv) => {
    setActiveConversation(conv);
    setShowMobileChat(true);
  };

  // Format time only (h:mm a) for message bubbles
  const formatMessageTime = (date) => {
    return format(new Date(date), "h:mm a");
  };

  // Format date for date separators
  const formatDateSeparator = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return format(messageDate, "MMMM d, yyyy");
  };

  // Check if we should show date separator
  const shouldShowDateSeparator = (message, index) => {
    if (index === 0) return true;
    const prevMessage = messages[index - 1];
    const prevDate = new Date(prevMessage.createdAt).toDateString();
    const currDate = new Date(message.createdAt).toDateString();
    return prevDate !== currDate;
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Conversations List */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col ${
          showMobileChat ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-foreground">Messages</h1>
            {/* Single dropdown for New Chat / Group */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-muted">
                  <Plus className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border w-48">
                <DropdownMenuItem onClick={() => setShowNewChat(true)} className="cursor-pointer">
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowNewGroup(true)} className="cursor-pointer">
                  <Users className="h-4 w-4 mr-2" />
                  New Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Search */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-card border border-border focus-within:ring-1 focus-within:ring-primary w-full">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              suppressHydrationWarning
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
              style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
            />
          </div>
          
          {/* Tabs for Regular / Archived */}
          <div className="flex mt-3 gap-2">
            <Button
              variant={!showArchived ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowArchived(false)}
              className={`flex-1 ${!showArchived ? "bg-violet-600 hover:bg-violet-700" : ""}`}
            >
              Chats
            </Button>
            <Button
              variant={showArchived ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowArchived(true)}
              className={`flex-1 ${showArchived ? "bg-violet-600 hover:bg-violet-700" : ""}`}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archived
            </Button>
          </div>
        </div>
        
        {/* Create Group Dialog */}
        <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
          <DialogTrigger asChild>
            <span className="hidden" />
          </DialogTrigger>
                <DialogContent className="bg-card border-border sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Create Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-foreground">Group Name</Label>
                      <Input
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Enter group name..."
                        className="mt-1 bg-muted border-border text-foreground"
                      />
                    </div>
                    <div>
                      <Label className="text-foreground">Description (optional)</Label>
                      <Input
                        value={groupDescription}
                        onChange={(e) => setGroupDescription(e.target.value)}
                        placeholder="What's this group about?"
                        className="mt-1 bg-muted border-border text-foreground"
                      />
                    </div>
                    <div>
                      <Label className="text-foreground">Add Members</Label>
                      <div className="flex items-center gap-2 mt-1 px-2.5 py-1.5 rounded-md bg-muted border border-border focus-within:ring-1 focus-within:ring-primary">
                        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <input
                          placeholder="Search users..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
                          style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                        />
                      </div>
                    </div>
                    {/* Selected Members */}
                    {selectedGroupMembers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedGroupMembers.map((member) => (
                          <span 
                            key={member._id}
                            className="flex items-center gap-1 bg-violet-600/20 text-violet-400 px-2 py-1 rounded-full text-sm"
                          >
                            {member.fullName}
                            <button onClick={() => toggleGroupMember(member)}>
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Search Results */}
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {searchedUsers.filter(u => !selectedGroupMembers.some(m => m._id === u._id)).map((searchedUser) => (
                        <div
                          key={searchedUser._id}
                          onClick={() => toggleGroupMember(searchedUser)}
                          className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        >
                          <img
                            src={searchedUser.profilePicture || "/images/default-profile.jpg"}
                            alt={searchedUser.fullName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <span className="text-foreground text-sm">{searchedUser.fullName}</span>
                          <Plus className="h-4 w-4 text-muted-foreground ml-auto" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewGroup(false)}>Cancel</Button>
                    <Button 
                      onClick={handleCreateGroup} 
                      className="bg-violet-600 hover:bg-violet-700"
                      disabled={!groupName.trim() || selectedGroupMembers.length === 0}
                    >
                      Create Group
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* New Chat Dialog */}
              <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
                <DialogTrigger asChild>
                  <span className="hidden" />
                </DialogTrigger>
                <DialogContent className="bg-card border-border sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Start New Conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted border border-border focus-within:ring-1 focus-within:ring-primary">
                    <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <input
                      placeholder="Search users by name or username..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
                      style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {searchingUsers ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
                      </div>
                    ) : searchedUsers.length > 0 ? (
                      searchedUsers.map((searchedUser) => (
                        <div
                          key={searchedUser._id}
                          onClick={() => handleStartConversation(searchedUser)}
                          className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                        >
                          <img
                            src={searchedUser.profilePicture || "/images/default-profile.jpg"}
                            alt={searchedUser.fullName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {searchedUser.fullName}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              @{searchedUser.username}
                            </p>
                          </div>
                          <UserPlus className="h-5 w-5 text-muted-foreground" />
                        </div>
                      ))
                    ) : userSearchQuery.trim() ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No users found</p>
                        <p className="text-sm">Try a different search term</p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Search for a user</p>
                        <p className="text-sm">Type a name or username to find users</p>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              {showArchived ? (
                <>
                  <Archive className="h-12 w-12 mb-3 opacity-50" />
                  <p>No archived conversations</p>
                  <p className="text-sm">Archived chats will appear here</p>
                </>
              ) : (
                <>
                  <p>No conversations yet</p>
                  <p className="text-sm">Start a conversation from a user profile</p>
                </>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv._id}
                onClick={() => handleSelectConversation(conv)}
                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-muted transition-colors ${
                  activeConversation?._id === conv._id ? "bg-muted" : ""
                }`}
              >
                <div className="relative">
                  <img
                    src={conv.participant?.profilePicture || "/images/default-profile.jpg"}
                    alt={conv.participant?.fullName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-violet-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground truncate">
                      {conv.participant?.fullName}
                    </p>
                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.lastMessage?.content || "Start a conversation"}
                  </p>
                </div>
                {conv.isMuted && (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`flex-1 flex flex-col ${
          !showMobileChat ? "hidden md:flex" : "flex"
        }`}
      >
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="md:hidden p-2 hover:bg-muted rounded-lg"
                >
                  <ArrowLeft className="h-5 w-5 text-foreground" />
                </button>
                <div className="relative">
                  <img
                    src={activeConversation.isGroup 
                      ? (activeConversation.groupImage || "/images/default-group.jpg")
                      : (activeConversation.participant?.profilePicture || "/images/default-profile.jpg")}
                    alt={activeConversation.isGroup ? activeConversation.groupName : activeConversation.participant?.fullName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {userStatus?.isOnline && !activeConversation.isGroup && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-zinc-900 rounded-full"></span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {activeConversation.isGroup 
                      ? activeConversation.groupName 
                      : activeConversation.participant?.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeConversation.isGroup 
                      ? `${activeConversation.participants?.length || 0} members`
                      : (getStatusText() || `@${activeConversation.participant?.username}`)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Audio Call Button */}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleCall('audio')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Phone className="h-5 w-5" />
                </Button>
                
                {/* Video Call Button */}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleCall('video')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Video className="h-5 w-5" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuItem
                      onClick={() => toggleMute(activeConversation._id)}
                      className="text-foreground hover:bg-muted"
                    >
                      {activeConversation.isMuted ? (
                        <>
                          <Volume2 className="h-4 w-4 mr-2" /> Unmute
                        </>
                      ) : (
                        <>
                          <VolumeX className="h-4 w-4 mr-2" /> Mute
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowPollDialog(true)}
                      className="text-foreground hover:bg-muted"
                    >
                      <BarChart2 className="h-4 w-4 mr-2" /> Create Poll
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        handleArchiveToggle(activeConversation._id);
                        setActiveConversation(null);
                      }}
                      className="text-foreground hover:bg-muted"
                    >
                      {showArchived ? (
                        <>
                          <ArchiveRestore className="h-4 w-4 mr-2" /> Unarchive
                        </>
                      ) : (
                        <>
                          <Archive className="h-4 w-4 mr-2" /> Archive
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p>No messages yet</p>
                  <p className="text-sm">Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender?._id === user?._id;
                  const showDateSeparator = shouldShowDateSeparator(message, index);
                  
                  return (
                    <div key={message._id}>
                      {/* Date Separator - WhatsApp Style */}
                      {showDateSeparator && (
                        <div className="flex justify-center my-4">
                          <span className="bg-muted/80 text-muted-foreground text-xs font-medium px-3 py-1 rounded-full shadow-sm">
                            {formatDateSeparator(message.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className={`group flex ${isOwn ? "justify-end" : "justify-start"} mb-1`}>
                        <div className="relative max-w-[75%]">
                          {/* Message Bubble */}
                          <div
                            className={`rounded-2xl px-3 py-2 ${
                              isOwn
                                ? "bg-violet-600 text-white rounded-br-sm"
                                : "bg-card text-foreground rounded-bl-sm border border-border shadow-sm"
                            }`}
                          >
                          {/* Image Message */}
                          {message.messageType === 'image' && message.imageUrl && (
                            <div>
                              <img 
                                src={message.imageUrl} 
                                alt="Sent image" 
                                className="rounded-lg max-w-full max-h-64 mb-1 cursor-pointer block"
                                style={{ outline: 'none', border: 'none' }}
                                onClick={() => window.open(message.imageUrl, '_blank')}
                              />
                              {message.content && message.content !== 'Sent an image' && (
                                <p className="text-sm mt-1">{message.content}</p>
                              )}
                            </div>
                          )}
                          
                          {/* Voice Message */}
                          {message.messageType === 'voice' && message.voiceUrl && (
                            <audio controls className="max-w-[200px] mb-2">
                              <source src={message.voiceUrl} type="audio/webm" />
                              Your browser does not support the audio element.
                            </audio>
                          )}
                          
                          {/* Poll Message - WhatsApp Style */}
                          {message.messageType === 'poll' && message.poll && (
                            <div className="min-w-[220px]">
                              <div className="flex items-center gap-2 mb-3">
                                <BarChart2 className="h-4 w-4" />
                                <p className="font-semibold">{message.poll.question}</p>
                              </div>
                              <div className="space-y-2">
                                {message.poll.options?.map((option, optIndex) => {
                                  const totalVotes = message.poll.options.reduce((sum, o) => sum + (o.votes?.length || o.voteCount || 0), 0);
                                  const optionVotes = option.votes?.length || option.voteCount || 0;
                                  const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                                  const hasVoted = option.votes?.some(v => v.toString() === user?._id || v._id === user?._id || v === user?._id);
                                  
                                  return (
                                    <button
                                      key={optIndex}
                                      onClick={() => handlePollVote(message.poll._id, optIndex)}
                                      className={`w-full text-left p-2 rounded-lg border transition-all ${
                                        hasVoted 
                                          ? (isOwn ? 'border-white/40 bg-white/20' : 'border-violet-500 bg-violet-500/10') 
                                          : (isOwn ? 'border-white/20 hover:border-white/40' : 'border-border hover:border-violet-500/50')
                                      }`}
                                    >
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm">{option.text}</span>
                                        <span className="text-xs opacity-75">{percentage}%</span>
                                      </div>
                                      <div className={`h-1 rounded-full ${isOwn ? 'bg-white/20' : 'bg-muted'}`}>
                                        <div 
                                          className={`h-full rounded-full transition-all ${isOwn ? 'bg-white' : 'bg-violet-500'}`}
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      {optionVotes > 0 && (
                                        <p className="text-xs opacity-60 mt-1">{optionVotes} vote{optionVotes !== 1 ? 's' : ''}</p>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-xs opacity-60 mt-2">
                                {message.poll.totalVotes || message.poll.options?.reduce((sum, o) => sum + (o.votes?.length || o.voteCount || 0), 0)} total votes
                              </p>
                            </div>
                          )}
                          
                          {/* Location Message */}
                          {message.messageType === 'location' && message.location && (
                            <div className="space-y-2 mb-2">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{message.location.name || message.location.address || 'Shared location'}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Call Message */}
                          {message.messageType === 'call' && (
                            <div className="flex items-center gap-2 mb-2">
                              {message.call?.callType === 'video' ? (
                                <Video className="h-4 w-4" />
                              ) : (
                                <Phone className="h-4 w-4" />
                              )}
                              <span>{message.content}</span>
                            </div>
                          )}
                          
                          {/* Story Reply Message */}
                          {message.messageType === 'storyReply' && (
                            <div className="mb-1">
                              <div className="relative rounded-xl overflow-hidden mb-2 border border-white/20">
                                <img
                                  src={message.imageUrl || message.sharedImage?.imageUrl}
                                  alt="Story"
                                  className="w-full max-h-36 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30" />
                                <div className="absolute bottom-1 left-2">
                                  <p className={`text-xs font-medium ${isOwn ? 'text-white/80' : 'text-muted-foreground'}`}>Story</p>
                                </div>
                              </div>
                              <p className="break-words whitespace-pre-wrap leading-relaxed text-sm" style={{ wordBreak: 'break-word' }}>{message.content}</p>
                            </div>
                          )}

                          {/* Text Message */}
                          {(message.messageType === 'text' || !message.messageType) && (
                            <p className="break-words whitespace-pre-wrap leading-relaxed" style={{ wordBreak: 'break-word' }}>{message.content}</p>
                          )}
                          
                          {/* Time and Read Status */}
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              isOwn ? "text-violet-200" : "text-muted-foreground"
                            }`}
                          >
                            <span>{formatMessageTime(message.createdAt)}</span>
                            {isOwn && (
                              message.read ? (
                                <CheckCheck className="h-3 w-3 text-blue-300" />
                              ) : message.delivered ? (
                                <CheckCheck className="h-3 w-3" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )
                            )}
                          </div>
                        </div>
                        </div>
                        
                        {/* Reactions Display */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div className={`absolute -bottom-3 ${isOwn ? 'left-2' : 'right-2'} flex bg-card rounded-full px-1 py-0.5 border border-border`}>
                            {message.reactions.slice(0, 3).map((r, i) => (
                              <span key={i} className="text-xs">{r.emoji}</span>
                            ))}
                            {message.reactions.length > 3 && (
                              <span className="text-xs text-muted-foreground ml-1">+{message.reactions.length - 3}</span>
                            )}
                          </div>
                        )}
                        
                        {/* Quick Reaction Button (on hover) */}
                        <div className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? '-left-10' : '-right-10'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <Popover open={showReactions === message._id} onOpenChange={(open) => setShowReactions(open ? message._id : null)}>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted">
                                <Smile className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2 bg-card border-border" side={isOwn ? 'left' : 'right'}>
                              <div className="flex gap-1">
                                {QUICK_REACTIONS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(message._id, emoji)}
                                    className="text-xl hover:scale-125 transition-transform p-1"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Hidden Image Input */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Image Preview Modal */}
            {imagePreview && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => { URL.revokeObjectURL(imagePreview.previewUrl); setImagePreview(null); }}>
                <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-foreground font-medium">Send Photo</span>
                    <button onClick={() => { URL.revokeObjectURL(imagePreview.previewUrl); setImagePreview(null); }} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {/* Image preview */}
                  <div className="p-4 flex items-center justify-center bg-black/20 max-h-80 overflow-hidden">
                    <img src={imagePreview.previewUrl} alt="Preview" className="max-h-72 max-w-full rounded-lg object-contain" style={{ outline: 'none', border: 'none' }} />
                  </div>
                  {/* Caption input */}
                  <div className="px-4 py-3 border-t border-border">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted border border-border focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500">
                      <input
                        type="text"
                        placeholder="Add a caption..."
                        value={imageCaption}
                        onChange={(e) => setImageCaption(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleImageSend(); }}
                        className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
                        style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                        autoFocus
                      />
                      <button
                        onClick={handleImageSend}
                        disabled={uploading}
                        className="flex-shrink-0 w-8 h-8 bg-violet-600 hover:bg-violet-700 rounded-full flex items-center justify-center disabled:opacity-50"
                      >
                        {uploading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 text-white" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
              {/* Recording UI */}
              {isRecording ? (
                <div className="flex items-center gap-4 bg-red-500/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="animate-pulse">
                      <Circle className="h-3 w-3 fill-red-500 text-red-500" />
                    </span>
                    <span className="text-red-500 font-medium">{formatRecordingTime(recordingTime)}</span>
                    <span className="text-muted-foreground">Recording...</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={cancelRecording} className="text-muted-foreground">
                    <X className="h-5 w-5" />
                  </Button>
                  <Button type="button" size="sm" onClick={stopRecording} className="bg-violet-600 hover:bg-violet-700">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Image Upload */}
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-500"></div>
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                  </Button>
                  
                  {/* Emoji Picker */}
                  <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <Smile className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-0" side="top" align="start">
                      <EmojiPicker 
                        onEmojiClick={handleEmojiClick}
                        theme="auto"
                        width={320}
                        height={400}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {/* Message Input */}
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-card border-border text-foreground"
                  />
                  
                  {/* Voice Recording / Send */}
                  {messageText.trim() ? (
                    <Button
                      type="submit"
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-foreground"
                      onClick={startRecording}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              )}
            </form>
            
            {/* Poll Creation Dialog */}
            <Dialog open={showPollDialog} onOpenChange={setShowPollDialog}>
              <DialogContent className="bg-card border-border sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Create Poll</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-foreground">Question</Label>
                    <Input
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder="Ask a question..."
                      className="mt-1 bg-muted border-border text-foreground"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-foreground">Options</Label>
                    {pollOptions.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={option}
                          onChange={(e) => updatePollOption(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1 bg-muted border-border text-foreground"
                        />
                        {pollOptions.length > 2 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removePollOption(index)}>
                            <X className="h-4 w-4 text-zinc-400" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {pollOptions.length < 6 && (
                      <Button type="button" variant="outline" size="sm" onClick={addPollOption} className="w-full">
                        <Plus className="h-4 w-4 mr-2" /> Add Option
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="multiVote" 
                      checked={allowMultipleVotes}
                      onCheckedChange={setAllowMultipleVotes}
                    />
                    <label htmlFor="multiVote" className="text-sm text-foreground">
                      Allow multiple votes
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPollDialog(false)}>Cancel</Button>
                  <Button onClick={handleCreatePoll} className="bg-violet-600 hover:bg-violet-700">
                    Create Poll
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Send className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Your Messages</h2>
            <p className="text-center max-w-sm">
              Select a conversation to start messaging or visit a user profile to send them a message.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
