"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { 
  X, 
  Heart, 
  MoreHorizontal, 
  Send,
  Smile,
  AlertTriangle,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';

// Individual Comment Component
const CommentItem = ({ 
  comment, 
  onLike, 
  onReply, 
  onDelete,
  isReply = false 
}) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(comment.isLiked || false);
  const [likesCount, setLikesCount] = useState(comment.likesCount || 0);
  const [showReplies, setShowReplies] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    onLike?.(comment._id, !isLiked);
  };

  const timeAgo = comment.createdAt 
    ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: false })
        .replace('about ', '')
        .replace(' hours', 'h')
        .replace(' hour', 'h')
        .replace(' minutes', 'm')
        .replace(' minute', 'm')
        .replace(' days', 'd')
        .replace(' day', 'd')
        .replace(' weeks', 'w')
        .replace(' week', 'w')
        .replace(' months', 'mo')
        .replace(' month', 'mo')
        .replace('less than a minute', 'now')
    : '';

  return (
    <div className={`flex gap-3 ${isReply ? 'ml-12' : ''}`}>
      <Link 
        href={`/profile/${comment.user?.username}`}
        className="flex-shrink-0"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden">
          <Image
            src={comment.user?.profilePicture || '/images/default-profile.jpg'}
            alt={comment.user?.username || 'User'}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
      </Link>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="text-sm">
              <Link 
                href={`/profile/${comment.user?.username}`}
                className="font-semibold text-foreground hover:text-foreground/80"
              >
                {comment.user?.username}
              </Link>{' '}
              <span className="text-foreground/90">{comment.content || comment.text}</span>
            </p>
            
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
              {likesCount > 0 && (
                <button className="text-xs text-muted-foreground font-medium hover:text-foreground">
                  {likesCount} {likesCount === 1 ? 'like' : 'likes'}
                </button>
              )}
              <button 
                onClick={() => onReply?.(comment.user?.username)}
                className="text-xs text-muted-foreground font-medium hover:text-foreground"
              >
                Reply
              </button>
              {user?._id === comment.user?._id && (
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
              )}
            </div>
            
            {/* Options dropdown */}
            <AnimatePresence>
              {showOptions && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-1"
                >
                  <button
                    onClick={() => {
                      onDelete?.(comment._id);
                      setShowOptions(false);
                    }}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            onClick={handleLike}
            className="p-1 -mr-1"
          >
            <Heart 
              className={`w-3 h-3 transition-colors ${
                isLiked 
                  ? 'fill-red-500 text-red-500' 
                  : 'text-muted-foreground hover:text-foreground'
              }`} 
            />
          </button>
        </div>
        
        {/* View Replies */}
        {comment.replies?.length > 0 && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-2 mt-2 text-xs text-muted-foreground"
          >
            <span className="w-6 h-[1px] bg-muted-foreground" />
            {showReplies ? 'Hide replies' : `View replies (${comment.replies.length})`}
          </button>
        )}
        
        {/* Replies */}
        <AnimatePresence>
          {showReplies && comment.replies && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-3"
            >
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply._id}
                  comment={reply}
                  onLike={onLike}
                  onReply={onReply}
                  onDelete={onDelete}
                  isReply
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Comments Modal Component
const CommentsModal = ({ 
  isOpen, 
  onClose, 
  post,
  comments = [],
  onAddComment,
  onLikeComment,
  onDeleteComment,
  isLoading = false 
}) => {
  const { user } = useAuth();
  const api = useApi();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [toxicityData, setToxicityData] = useState({ level: 'safe', score: 0, checking: false });
  const toxicityCheckTimer = useRef(null);
  const inputRef = useRef(null);
  const commentsRef = useRef(null);

  // Focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
      setNewComment(`@${replyingTo} `);
    }
  }, [replyingTo]);

  // Scroll to bottom when new comments added
  useEffect(() => {
    if (commentsRef.current) {
      commentsRef.current.scrollTop = commentsRef.current.scrollHeight;
    }
  }, [comments]);

  // Real-time toxicity check while typing
  useEffect(() => {
    if (toxicityCheckTimer.current) clearTimeout(toxicityCheckTimer.current);
    if (!newComment.trim() || newComment.length < 3) {
      setToxicityData({ level: 'safe', score: 0, checking: false });
      return;
    }
    setToxicityData(prev => ({ ...prev, checking: true }));
    toxicityCheckTimer.current = setTimeout(async () => {
      try {
        const response = await api.post('/api/comments/check-toxicity', { text: newComment });
        const data = response.data.data;
        setToxicityData({ level: data.level, score: data.toxicityScore, checking: false });
      } catch {
        setToxicityData({ level: 'safe', score: 0, checking: false });
      }
    }, 500);
    return () => { if (toxicityCheckTimer.current) clearTimeout(toxicityCheckTimer.current); };
  }, [newComment, api]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSending || toxicityData.level === 'high') return;

    setIsSending(true);
    try {
      await onAddComment?.(newComment.trim(), replyingTo);
      setNewComment('');
      setReplyingTo(null);
      setToxicityData({ level: 'safe', score: 0, checking: false });
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
    setIsSending(false);
  };

  const handleReply = (username) => {
    setReplyingTo(username);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[90]"
          />

          {/* Modal - Slide up on mobile, centered on desktop */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[91] bg-card rounded-t-xl md:rounded-xl max-h-[85vh] md:max-h-[80vh] md:w-full md:max-w-lg flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-center py-3 border-b border-border relative">
              {/* Drag handle (mobile) */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-muted-foreground/30 rounded-full md:hidden" />
              
              <h2 className="font-semibold text-foreground">Comments</h2>
              
              <button
                onClick={onClose}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Comments List */}
            <div 
              ref={commentsRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {isLoading ? (
                // Loading skeletons
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 bg-muted rounded" />
                        <div className="h-3 w-1/4 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length > 0 ? (
                comments.map((comment) => (
                  <CommentItem
                    key={comment._id}
                    comment={comment}
                    onLike={onLikeComment}
                    onReply={handleReply}
                    onDelete={onDeleteComment}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 mb-4 flex items-center justify-center border-2 border-foreground rounded-full">
                    <Send className="w-10 h-10 text-foreground -rotate-12" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">No comments yet</h3>
                  <p className="text-sm text-muted-foreground">Start the conversation.</p>
                </div>
              )}
            </div>

            {/* Replying to indicator */}
            <AnimatePresence>
              {replyingTo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-2 bg-secondary/50 border-t border-border flex items-center justify-between"
                >
                  <span className="text-sm text-muted-foreground">
                    Replying to <span className="text-primary">@{replyingTo}</span>
                  </span>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setNewComment('');
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Comment Input */}
            {user && (
              <div className="p-4 border-t border-border">
                {/* Real-time toxicity indicator */}
                {newComment.trim().length >= 3 && (
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
                      <><AlertTriangle className="w-4 h-4" /><span>High toxicity ({toxicityData.score}%) — Cannot post</span></>
                    ) : toxicityData.level === 'medium' ? (
                      <><AlertCircle className="w-4 h-4" /><span>Medium toxicity ({toxicityData.score}%) — Consider rewording</span></>
                    ) : toxicityData.level === 'low' ? (
                      <><AlertCircle className="w-4 h-4" /><span>Low toxicity ({toxicityData.score}%)</span></>
                    ) : (
                      <><CheckCircle className="w-4 h-4" /><span>Safe ({toxicityData.score}%)</span></>
                    )}
                  </div>
                )}
                <form 
                  onSubmit={handleSubmit}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={user.profilePicture || '/images/default-profile.jpg'}
                      alt={user.username}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className={`w-full bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none pr-8 ${
                        toxicityData.level === 'high' ? 'border-b border-red-500/50' : ''
                      }`}
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSending || toxicityData.level === 'high'}
                    className={`text-sm font-semibold transition-colors ${
                      newComment.trim() && !isSending && toxicityData.level !== 'high'
                        ? 'text-primary hover:text-primary/80'
                        : 'text-primary/50 cursor-not-allowed'
                    }`}
                  >
                    {isSending ? 'Posting...' : 'Post'}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export { CommentsModal, CommentItem };
export default CommentsModal;
