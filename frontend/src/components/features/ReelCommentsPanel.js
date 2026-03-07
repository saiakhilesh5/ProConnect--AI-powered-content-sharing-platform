"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useReels } from "@/context/ReelsContext";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import {
  Heart,
  X,
  Send,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Trash2,
  Reply,
  AtSign,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

/**
 * Instagram-style comments panel for reels
 * Features: Comments, Replies, Likes, @Mentions, Delete
 */
export default function ReelCommentsPanel({
  reelId,
  isOpen,
  onClose,
  reelOwner,
}) {
  const {
    getComments,
    addComment,
    toggleLikeComment,
    getCommentReplies,
    deleteComment,
    searchUsersForMention,
  } = useReels();
  const { user } = useAuth();
  const api = useApi();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [repliesData, setRepliesData] = useState({});
  const [loadingReplies, setLoadingReplies] = useState({});
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Toxicity checking state
  const [toxicityData, setToxicityData] = useState({ level: 'safe', score: 0, checking: false });
  const toxicityCheckTimer = useRef(null);

  const inputRef = useRef(null);
  const mentionRef = useRef(null);
  const commentsContainerRef = useRef(null);

  // Fetch comments on open
  useEffect(() => {
    if (isOpen && reelId) {
      loadComments();
    }
  }, [isOpen, reelId]);

  // Focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  // Handle @mention search
  useEffect(() => {
    if (mentionQuery.length > 0) {
      const searchMentions = async () => {
        const users = await searchUsersForMention(mentionQuery);
        setMentionUsers(users);
        setShowMentions(users.length > 0);
        setMentionIndex(0);
      };
      const timer = setTimeout(searchMentions, 200);
      return () => clearTimeout(timer);
    } else {
      setShowMentions(false);
      setMentionUsers([]);
    }
  }, [mentionQuery, searchUsersForMention]);

  // Real-time toxicity check while typing
  useEffect(() => {
    if (toxicityCheckTimer.current) {
      clearTimeout(toxicityCheckTimer.current);
    }

    if (!commentText.trim() || commentText.length < 3) {
      setToxicityData({ level: 'safe', score: 0, checking: false });
      return;
    }

    setToxicityData(prev => ({ ...prev, checking: true }));

    toxicityCheckTimer.current = setTimeout(async () => {
      try {
        const response = await api.post('/api/reels/comments/check-toxicity', { text: commentText });
        const data = response.data.data;
        setToxicityData({
          level: data.level,
          score: data.toxicityScore,
          safe: data.safe,
          reason: data.reason,
          checking: false
        });
      } catch (error) {
        setToxicityData({ level: 'safe', score: 0, checking: false });
      }
    }, 500); // Debounce 500ms

    return () => {
      if (toxicityCheckTimer.current) {
        clearTimeout(toxicityCheckTimer.current);
      }
    };
  }, [commentText, api]);

  const loadComments = async (pageNum = 1, append = false) => {
    try {
      setLoading(pageNum === 1);
      const data = await getComments(reelId, pageNum);
      
      if (append) {
        setComments(prev => [...prev, ...(data.comments || [])]);
      } else {
        setComments(data.comments || []);
      }
      
      setHasMore(pageNum < data.pagination?.pages);
      setPage(pageNum);
    } catch (error) {
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreComments = () => {
    if (hasMore && !loading) {
      loadComments(page + 1, true);
    }
  };

  const loadReplies = async (commentId) => {
    if (loadingReplies[commentId]) return;
    
    try {
      setLoadingReplies(prev => ({ ...prev, [commentId]: true }));
      const data = await getCommentReplies(commentId);
      setRepliesData(prev => ({
        ...prev,
        [commentId]: {
          replies: data.replies || [],
          hasMore: data.pagination?.hasMore,
          page: 1,
        },
      }));
      setExpandedReplies(prev => ({ ...prev, [commentId]: true }));
    } catch (error) {
      toast.error("Failed to load replies");
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setCommentText(value);

    // Check for @mention
    const lastAtIndex = value.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const afterAt = value.substring(lastAtIndex + 1);
      const spaceAfterAt = afterAt.indexOf(" ");
      if (spaceAfterAt === -1) {
        setMentionQuery(afterAt);
      } else {
        setMentionQuery("");
      }
    } else {
      setMentionQuery("");
    }
  };

  const insertMention = (user) => {
    const lastAtIndex = commentText.lastIndexOf("@");
    const beforeMention = commentText.substring(0, lastAtIndex);
    const newText = `${beforeMention}@${user.username} `;
    setCommentText(newText);
    setShowMentions(false);
    setMentionQuery("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (showMentions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex(prev => 
          prev < mentionUsers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (mentionUsers[mentionIndex]) {
          insertMention(mentionUsers[mentionIndex]);
        }
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submitting) return;

    try {
      setSubmitting(true);
      const newComment = await addComment(
        reelId,
        commentText.trim(),
        replyingTo?._id || null
      );

      if (replyingTo) {
        // Add reply to existing replies
        setRepliesData(prev => ({
          ...prev,
          [replyingTo._id]: {
            ...prev[replyingTo._id],
            replies: [...(prev[replyingTo._id]?.replies || []), newComment],
          },
        }));
        // Update reply count
        setComments(prev =>
          prev.map(c =>
            c._id === replyingTo._id
              ? { ...c, repliesCount: (c.repliesCount || 0) + 1 }
              : c
          )
        );
        setExpandedReplies(prev => ({ ...prev, [replyingTo._id]: true }));
      } else {
        // Add to main comments
        setComments(prev => [newComment, ...prev]);
      }

      setCommentText("");
      setReplyingTo(null);
      toast.success("Comment posted");
    } catch (error) {
      // Show the actual error message from backend (toxicity warnings, etc.)
      const errorMessage = error.response?.data?.message || "Failed to post comment";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId, isReply = false, parentId = null) => {
    try {
      const result = await toggleLikeComment(commentId);
      
      if (isReply && parentId) {
        setRepliesData(prev => ({
          ...prev,
          [parentId]: {
            ...prev[parentId],
            replies: prev[parentId]?.replies?.map(r =>
              r._id === commentId
                ? { ...r, isLiked: result.isLiked, likesCount: result.likesCount }
                : r
            ),
          },
        }));
      } else {
        setComments(prev =>
          prev.map(c =>
            c._id === commentId
              ? { ...c, isLiked: result.isLiked, likesCount: result.likesCount }
              : c
          )
        );
      }
    } catch (error) {
      toast.error("Failed to like comment");
    }
  };

  const handleDeleteComment = async (commentId, isReply = false, parentId = null) => {
    try {
      await deleteComment(commentId);
      
      if (isReply && parentId) {
        setRepliesData(prev => ({
          ...prev,
          [parentId]: {
            ...prev[parentId],
            replies: prev[parentId]?.replies?.filter(r => r._id !== commentId),
          },
        }));
        setComments(prev =>
          prev.map(c =>
            c._id === parentId
              ? { ...c, repliesCount: Math.max(0, (c.repliesCount || 0) - 1) }
              : c
          )
        );
      } else {
        setComments(prev => prev.filter(c => c._id !== commentId));
      }
      
      toast.success("Comment deleted");
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const formatTime = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  // Parse @mentions in text and render as links
  const renderCommentText = (text) => {
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <Link
          key={match.index}
          href={`/profile/${match[1]}`}
          className="text-blue-400 hover:underline"
        >
          @{match[1]}
        </Link>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const CommentItem = ({ comment, isReply = false, parentId = null }) => {
    const commentUserId = String(comment.user?._id || '');
    const currentUserId = String(user?._id || '');
    const reelOwnerId = String(reelOwner || '');
    
    const isOwner = commentUserId === currentUserId;
    const canDelete = isOwner || reelOwnerId === currentUserId;

    return (
      <div className={`flex gap-3 ${isReply ? "ml-12 mt-3" : "py-4 border-b border-border"}`}>
        <Link href={`/profile/${comment.user?.username}`}>
          <img
            src={comment.user?.profilePicture || "/images/default-profile.jpg"}
            alt={comment.user?.fullName}
            className={`rounded-full object-cover flex-shrink-0 ${
              isReply ? "w-8 h-8" : "w-10 h-10"
            }`}
          />
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <Link
                href={`/profile/${comment.user?.username}`}
                className="font-semibold text-sm text-foreground hover:underline"
              >
                {comment.user?.username}
                {comment.user?.isVerified && (
                  <span className="text-blue-400 ml-1">✓</span>
                )}
                {commentUserId === reelOwnerId && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-violet-600 rounded text-white">
                    Creator
                  </span>
                )}
              </Link>
              <p className="text-sm text-foreground/90 mt-0.5 break-words">
                {renderCommentText(comment.text)}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>{formatTime(comment.createdAt)}</span>
                {comment.likesCount > 0 && (
                  <span>{comment.likesCount} likes</span>
                )}
                {/* Toxicity indicator */}
                {comment.moderationScore > 0 && (
                  <span 
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      comment.moderationScore >= 70 
                        ? 'bg-red-500/20 text-red-500' 
                        : comment.moderationScore >= 40 
                          ? 'bg-yellow-500/20 text-yellow-500' 
                          : 'bg-green-500/20 text-green-500'
                    }`}
                    title={`Toxicity level: ${comment.moderationScore}%`}
                  >
                    {comment.moderationScore >= 70 ? '⚠️ High' : comment.moderationScore >= 40 ? '⚡ Med' : '✓ Low'}
                  </span>
                )}
                <button
                  onClick={() => {
                    setReplyingTo(isReply ? { _id: parentId, username: comment.user?.username } : comment);
                    setCommentText(`@${comment.user?.username} `);
                  }}
                  className="hover:text-foreground"
                >
                  Reply
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLikeComment(comment._id, isReply, parentId)}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Heart
                  className={`w-4 h-4 ${
                    comment.isLiked ? "text-red-500 fill-red-500" : "text-muted-foreground"
                  }`}
                />
              </button>
              
              {canDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-secondary rounded">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border-border">
                    <DropdownMenuItem
                      onClick={() => handleDeleteComment(comment._id, isReply, parentId)}
                      className="text-red-500 hover:bg-secondary cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Show replies toggle */}
          {!isReply && comment.repliesCount > 0 && (
            <button
              onClick={() => {
                if (expandedReplies[comment._id]) {
                  setExpandedReplies(prev => ({ ...prev, [comment._id]: false }));
                } else {
                  loadReplies(comment._id);
                }
              }}
              className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <div className="w-6 h-[1px] bg-border"></div>
              {loadingReplies[comment._id] ? (
                "Loading..."
              ) : expandedReplies[comment._id] ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Hide replies
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  View {comment.repliesCount} {comment.repliesCount === 1 ? "reply" : "replies"}
                </>
              )}
            </button>
          )}

          {/* Replies */}
          {expandedReplies[comment._id] && repliesData[comment._id]?.replies?.map(reply => (
            <CommentItem
              key={reply._id}
              comment={reply}
              isReply={true}
              parentId={comment._id}
            />
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full sm:w-[400px] h-[70vh] sm:h-[80vh] sm:max-h-[600px] bg-background border border-border rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-lg text-foreground">Comments</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-full text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div
          ref={commentsContainerRef}
          className="flex-1 overflow-y-auto px-4 custom-scrollbar"
        >
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <p className="text-lg font-medium">No comments yet</p>
              <p className="text-sm">Be the first to comment!</p>
            </div>
          ) : (
            <>
              {comments.map(comment => (
                <CommentItem key={comment._id} comment={comment} />
              ))}
              
              {hasMore && (
                <button
                  onClick={loadMoreComments}
                  className="w-full py-3 text-sm text-violet-400 hover:text-violet-300"
                >
                  Load more comments
                </button>
              )}
            </>
          )}
        </div>

        {/* Reply indicator */}
        {replyingTo && (
          <div className="px-4 py-2 bg-secondary border-t border-border flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              <Reply className="w-4 h-4 inline mr-1" />
              Replying to <span className="text-foreground">@{replyingTo.username}</span>
            </span>
            <button
              onClick={() => {
                setReplyingTo(null);
                setCommentText("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Mention suggestions */}
        {showMentions && mentionUsers.length > 0 && (
          <div
            ref={mentionRef}
            className="absolute bottom-16 left-4 right-4 max-h-48 overflow-y-auto bg-popover rounded-lg border border-border shadow-xl"
          >
            {mentionUsers.map((mentionUser, idx) => (
              <button
                key={mentionUser._id}
                onClick={() => insertMention(mentionUser)}
                className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary ${
                  idx === mentionIndex ? "bg-secondary" : ""
                }`}
              >
                <img
                  src={mentionUser.profilePicture || "/images/default-profile.jpg"}
                  alt={mentionUser.fullName}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{mentionUser.fullName}</p>
                  <p className="text-xs text-muted-foreground">@{mentionUser.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border bg-background">
          {/* Real-time toxicity indicator */}
          {commentText.trim().length >= 3 && (
            <div className={`flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
              toxicityData.checking 
                ? 'bg-muted text-muted-foreground'
                : toxicityData.level === 'high' 
                  ? 'bg-red-500/20 text-red-500 border border-red-500/30' 
                  : toxicityData.level === 'medium' 
                    ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30' 
                    : toxicityData.level === 'low'
                      ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                      : 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
            }`}>
              {toxicityData.checking ? (
                <>
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Checking...</span>
                </>
              ) : toxicityData.level === 'high' ? (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>High toxicity ({toxicityData.score}%) - Cannot post</span>
                </>
              ) : toxicityData.level === 'medium' ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Medium toxicity ({toxicityData.score}%) - Consider rewording</span>
                </>
              ) : toxicityData.level === 'low' ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Low toxicity ({toxicityData.score}%)</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Safe ({toxicityData.score}%)</span>
                </>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <img
              src={user?.profilePicture || "/images/default-profile.jpg"}
              alt="You"
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={commentText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
                className={`w-full bg-secondary text-foreground rounded-full px-4 py-2 pr-12 text-sm outline-none focus:ring-2 placeholder:text-muted-foreground transition-all ${
                  toxicityData.level === 'high' 
                    ? 'focus:ring-red-500/50 border border-red-500/50' 
                    : toxicityData.level === 'medium'
                      ? 'focus:ring-yellow-500/50 border border-yellow-500/50'
                      : 'focus:ring-violet-500/50'
                }`}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || submitting || toxicityData.level === 'high' || toxicityData.checking}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-violet-500 hover:text-violet-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Use @ to mention friends
          </p>
        </div>
      </div>

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
