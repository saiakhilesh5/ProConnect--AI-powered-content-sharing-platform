"use client";
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

// Quick reaction emojis
const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🔥', '💯', '🎉'];

// Message reactions display
export function MessageReactions({ 
  reactions = [], 
  onReact, 
  onRemoveReaction, 
  currentUserId,
  messageId,
  className = '' 
}) {
  const [showAllReactions, setShowAllReactions] = useState(false);
  
  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    const emoji = reaction.emoji;
    if (!acc[emoji]) {
      acc[emoji] = { emoji, users: [], count: 0, hasCurrentUser: false };
    }
    acc[emoji].users.push(reaction.user);
    acc[emoji].count++;
    if (reaction.user?._id === currentUserId || reaction.user === currentUserId) {
      acc[emoji].hasCurrentUser = true;
    }
    return acc;
  }, {});
  
  const reactionGroups = Object.values(groupedReactions);
  
  if (reactionGroups.length === 0) return null;
  
  return (
    <>
      <motion.div 
        className={`flex flex-wrap items-center gap-1 mt-1 ${className}`}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {reactionGroups.map((group, index) => (
          <motion.button
            key={group.emoji}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => {
              if (group.hasCurrentUser) {
                onRemoveReaction?.(messageId);
              } else {
                onReact?.(messageId, group.emoji);
              }
            }}
            onDoubleClick={() => setShowAllReactions(true)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
              group.hasCurrentUser 
                ? 'bg-blue-500/20 border border-blue-500/40' 
                : 'bg-zinc-700/50 border border-zinc-600/30 hover:bg-zinc-600/50'
            }`}
          >
            <span className="text-sm">{group.emoji}</span>
            {group.count > 1 && (
              <span className="text-zinc-300">{group.count}</span>
            )}
          </motion.button>
        ))}
      </motion.div>
      
      {/* Reactions detail modal */}
      <AnimatePresence>
        {showAllReactions && (
          <ReactionsDetailModal
            reactions={reactions}
            onClose={() => setShowAllReactions(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Modal showing all reactions with user details
function ReactionsDetailModal({ reactions, onClose }) {
  const modalRef = useRef(null);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  
  // Group reactions
  const groupedReactions = reactions.reduce((acc, reaction) => {
    const emoji = reaction.emoji;
    if (!acc[emoji]) {
      acc[emoji] = [];
    }
    acc[emoji].push(reaction.user);
    return acc;
  }, {});
  
  const emojiList = Object.keys(groupedReactions);
  const filteredUsers = selectedEmoji 
    ? groupedReactions[selectedEmoji] 
    : reactions.map(r => r.user);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-80 max-h-96 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
          <h3 className="font-semibold text-white">Reactions</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Emoji tabs */}
        <div className="flex items-center gap-2 p-2 border-b border-zinc-700 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedEmoji(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedEmoji === null 
                ? 'bg-blue-500 text-white' 
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            All ({reactions.length})
          </button>
          {emojiList.map(emoji => (
            <button
              key={emoji}
              onClick={() => setSelectedEmoji(emoji)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
                selectedEmoji === emoji 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <span>{emoji}</span>
              <span>{groupedReactions[emoji].length}</span>
            </button>
          ))}
        </div>
        
        {/* Users list */}
        <div className="max-h-60 overflow-y-auto p-2">
          {filteredUsers.map((user, index) => (
            <div
              key={user?._id || index}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-700">
                {user?.profilePicture ? (
                  <Image
                    src={user.profilePicture}
                    alt={user.fullName || 'User'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                    👤
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {user?.fullName || 'Unknown User'}
                </p>
                <p className="text-sm text-zinc-400 truncate">
                  @{user?.username || 'unknown'}
                </p>
              </div>
              {selectedEmoji === null && (
                <span className="text-lg">
                  {reactions.find(r => 
                    (r.user?._id || r.user) === (user?._id || user)
                  )?.emoji}
                </span>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Quick reaction picker that appears on hover/long press
export function QuickReactionPicker({ 
  onSelect, 
  onClose, 
  position = 'top',
  className = '' 
}) {
  const containerRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);
  
  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
  };
  
  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.8, y: position === 'top' ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: position === 'top' ? 10 : -10 }}
      className={`absolute ${positionClasses[position]} left-1/2 -translate-x-1/2 z-50 ${className}`}
    >
      <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-600 rounded-full px-2 py-1.5 shadow-xl">
        {QUICK_REACTIONS.map((emoji, index) => (
          <motion.button
            key={emoji}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              onSelect?.(emoji);
              onClose?.();
            }}
            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-zinc-700 rounded-full transition-colors"
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// Typing indicator with animated dots
export function TypingIndicator({ users = [], className = '' }) {
  if (users.length === 0) return null;
  
  const displayText = users.length === 1 
    ? `${users[0]?.fullName || users[0]?.username || 'Someone'} is typing`
    : users.length === 2
    ? `${users[0]?.fullName || users[0]?.username} and ${users[1]?.fullName || users[1]?.username} are typing`
    : `${users.length} people are typing`;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`flex items-center gap-2 ${className}`}
    >
      {/* Typing dots */}
      <div className="flex items-center gap-1 px-3 py-2 bg-zinc-700/50 rounded-2xl">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-zinc-400 rounded-full"
            animate={{
              y: [0, -5, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </div>
      
      {/* Text */}
      <span className="text-xs text-zinc-400">{displayText}</span>
    </motion.div>
  );
}

// Online status indicator
export function OnlineStatus({ 
  isOnline, 
  lastActive,
  showText = true,
  size = 'sm',
  className = '' 
}) {
  const sizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };
  
  const getLastActiveText = () => {
    if (!lastActive) return 'Offline';
    
    const diff = Date.now() - new Date(lastActive).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `Active ${minutes}m ago`;
    if (hours < 24) return `Active ${hours}h ago`;
    if (days < 7) return `Active ${days}d ago`;
    return 'Offline';
  };
  
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="relative flex items-center justify-center">
        <span
          className={`${sizeClasses[size]} rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-zinc-500'
          }`}
        />
        {isOnline && (
          <motion.span
            className={`absolute ${sizeClasses[size]} rounded-full bg-green-500`}
            animate={{ scale: [1, 1.5, 1.5], opacity: [0.8, 0, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </span>
      
      {showText && (
        <span className={`text-xs ${isOnline ? 'text-green-500' : 'text-zinc-400'}`}>
          {isOnline ? 'Online' : getLastActiveText()}
        </span>
      )}
    </div>
  );
}

// Message status indicators (sent, delivered, read)
export function MessageStatus({ 
  sent = false,
  delivered = false, 
  read = false, 
  readAt,
  className = '' 
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {read ? (
        // Double blue check
        <span className="text-blue-400 text-xs">✓✓</span>
      ) : delivered ? (
        // Double gray check
        <span className="text-zinc-400 text-xs">✓✓</span>
      ) : sent ? (
        // Single check
        <span className="text-zinc-400 text-xs">✓</span>
      ) : (
        // Clock/pending
        <span className="text-zinc-500 text-xs">○</span>
      )}
    </div>
  );
}

// Seen by indicator (shows who has seen the message)
export function SeenByIndicator({ seenBy = [], currentUserId, className = '' }) {
  const others = seenBy.filter(user => 
    (user?._id || user) !== currentUserId
  );
  
  if (others.length === 0) return null;
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex -space-x-1.5">
        {others.slice(0, 3).map((user, i) => (
          <div
            key={user?._id || i}
            className="relative w-4 h-4 rounded-full overflow-hidden border border-zinc-800 bg-zinc-700"
          >
            {user?.profilePicture ? (
              <Image
                src={user.profilePicture}
                alt=""
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-400">
                👤
              </div>
            )}
          </div>
        ))}
      </div>
      {others.length > 3 && (
        <span className="text-[10px] text-zinc-400">
          +{others.length - 3}
        </span>
      )}
    </div>
  );
}

export default MessageReactions;
