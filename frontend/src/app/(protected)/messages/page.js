"use client";

import React, { useState, useEffect, useRef } from "react";
import { useMessages } from "@/context/MessagesContext";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { format } from "date-fns";
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
  Plus,
  X,
  UserPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function MessagesPage() {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    messagesLoading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    deleteMessage,
    markAsRead,
    toggleMute,
    archiveConversation,
    startConversation,
  } = useMessages();
  
  const { user } = useAuth();
  const api = useApi();
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const messagesEndRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

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
  const filteredConversations = conversations.filter((conv) =>
    conv.participant?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participant?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const formatMessageTime = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    
    if (messageDate.toDateString() === today.toDateString()) {
      return format(messageDate, "h:mm a");
    }
    return format(messageDate, "MMM d, h:mm a");
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-background">
      {/* Conversations List */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-zinc-800 flex flex-col ${
          showMobileChat ? "hidden md:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white">Messages</h1>
            <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Chat
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Start New Conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name or username..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-10 bg-muted border-border text-foreground"
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
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border text-foreground"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <p>No conversations yet</p>
              <p className="text-sm">Start a conversation from a user profile</p>
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
                    <p className="font-medium text-white truncate">
                      {conv.participant?.fullName}
                    </p>
                    {conv.lastMessage && (
                      <span className="text-xs text-zinc-500">
                        {formatMessageTime(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 truncate">
                    {conv.lastMessage?.content || "Start a conversation"}
                  </p>
                </div>
                {conv.isMuted && (
                  <VolumeX className="h-4 w-4 text-zinc-500" />
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
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="md:hidden p-2 hover:bg-muted rounded-lg"
                >
                  <ArrowLeft className="h-5 w-5 text-foreground" />
                </button>
                <img
                  src={activeConversation.participant?.profilePicture || "/images/default-profile.jpg"}
                  alt={activeConversation.participant?.fullName}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium text-foreground">
                    {activeConversation.participant?.fullName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{activeConversation.participant?.username}
                  </p>
                </div>
              </div>
              
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
                    onClick={() => {
                      archiveConversation(activeConversation._id);
                      setActiveConversation(null);
                    }}
                    className="text-foreground hover:bg-muted"
                  >
                    <Archive className="h-4 w-4 mr-2" /> Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                  <p>No messages yet</p>
                  <p className="text-sm">Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.sender?._id === user?._id;
                  
                  return (
                    <div
                      key={message._id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? "bg-violet-600 text-white rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
                        <div
                          className={`flex items-center gap-1 mt-1 text-xs ${
                            isOwn ? "text-violet-200" : "text-muted-foreground"
                          }`}
                        >
                          <span>{formatMessageTime(message.createdAt)}</span>
                          {isOwn && (
                            message.read ? (
                              <CheckCheck className="h-3 w-3" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" className="text-zinc-400">
                  <ImageIcon className="h-5 w-5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="text-zinc-400">
                  <Smile className="h-5 w-5" />
                </Button>
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-card border-border text-foreground"
                />
                <Button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </form>
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
