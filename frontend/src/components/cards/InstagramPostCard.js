"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useLikesFavorites } from '@/context/LikesFavoritesContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Play,
  Smile,
  X,
  Flag,
  Link2,
  UserMinus,
  Share2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const InstagramPostCard = ({ 
  image, 
  onCommentClick,
  onShareClick,
  showComments = false 
}) => {
  const { user } = useAuth();
  const router = useRouter();
  const {
    toggleLike,
    toggleFavorite,
    checkLikeStatus,
    checkFavoriteStatus,
    likedImages,
    favoritedImages
  } = useLikesFavorites();

  // State
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(image.likesCount || 0);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const optionsRef = useRef(null);

  // Check initial like/save status
  useEffect(() => {
    if (user && image._id) {
      const checkStatus = async () => {
        if (likedImages[image._id] !== undefined) {
          setIsLiked(likedImages[image._id]);
        } else {
          const likedStatus = await checkLikeStatus(image._id);
          setIsLiked(likedStatus);
        }

        if (favoritedImages[image._id] !== undefined) {
          setIsSaved(favoritedImages[image._id]);
        } else {
          const savedStatus = await checkFavoriteStatus(image._id);
          setIsSaved(savedStatus);
        }
      };
      checkStatus();
    }
  }, [user, image._id, likedImages, favoritedImages]);

  // Close options on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle double tap to like
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!isLiked) {
        handleLike();
      }
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 1000);
    }
    setLastTap(now);
  };

  // Handle like
  const handleLike = async () => {
    if (!user) {
      toast.error('Please login to like');
      return;
    }

    const newLikedStatus = !isLiked;
    setIsLiked(newLikedStatus);
    setLikesCount(prev => newLikedStatus ? prev + 1 : prev - 1);

    const result = await toggleLike(image._id);
    if (!result.success) {
      setIsLiked(!newLikedStatus);
      setLikesCount(prev => newLikedStatus ? prev - 1 : prev + 1);
    }
  };

  // Handle save/bookmark
  const handleSave = async () => {
    if (!user) {
      toast.error('Please login to save');
      return;
    }

    const newSavedStatus = !isSaved;
    setIsSaved(newSavedStatus);

    const result = await toggleFavorite(image._id);
    if (!result.success) {
      setIsSaved(!newSavedStatus);
    } else {
      toast.success(newSavedStatus ? 'Saved' : 'Removed from saved');
    }
  };

  // Handle share
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: image.title || 'Check out this post',
        url: `${window.location.origin}/image/${image._id}`
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/image/${image._id}`);
      toast.success('Link copied!');
    }
  };

  // Handle copy link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/image/${image._id}`);
    toast.success('Link copied to clipboard');
    setShowOptions(false);
  };

  // Format caption with hashtags
  const formatCaption = (text) => {
    if (!text) return null;
    
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <Link 
            key={i} 
            href={`/tags/${part.slice(1)}`}
            className="text-primary hover:text-primary/80"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const caption = image.description || image.title || '';
  const shouldTruncate = caption.length > 100;
  const displayCaption = shouldTruncate && !isExpanded 
    ? caption.slice(0, 100) + '...' 
    : caption;

  return (
    <article className="bg-card border-b border-border md:border md:rounded-lg md:mb-4 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-3">
          <Link 
            href={`/profile/@${image.user?.username}`}
            className="relative"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary/20 hover:ring-primary/50 transition-all">
              <Image
                src={image.user?.profilePicture || '/images/default-profile.jpg'}
                alt={image.user?.username || 'User'}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
          </Link>
          <div className="flex flex-col">
            <Link 
              href={`/profile/@${image.user?.username}`}
              className="font-semibold text-sm text-foreground hover:text-foreground/80 flex items-center gap-1"
            >
              {image.user?.username}
              {image.user?.isVerified && (
                <svg className="w-3.5 h-3.5 text-primary fill-primary" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              )}
            </Link>
            {image.location && (
              <span className="text-xs text-muted-foreground">{image.location}</span>
            )}
          </div>
        </div>
        
        <div className="relative" ref={optionsRef}>
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="p-2 hover:bg-secondary rounded-full transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-foreground" />
          </button>

          {/* Options Dropdown */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-10 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <button 
                  onClick={handleCopyLink}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary text-sm text-foreground transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                  Copy link
                </button>
                <button 
                  onClick={() => {
                    router.push(`/image/${image._id}`);
                    setShowOptions(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary text-sm text-foreground transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Go to post
                </button>
                {user && user._id !== image.user?._id && (
                  <>
                    <div className="border-t border-border" />
                    <button 
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary text-sm text-destructive transition-colors"
                    >
                      <Flag className="w-4 h-4" />
                      Report
                    </button>
                    <button 
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary text-sm text-destructive transition-colors"
                    >
                      <UserMinus className="w-4 h-4" />
                      Unfollow
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Image */}
      <div 
        className="relative bg-black cursor-pointer"
        onClick={handleDoubleTap}
      >
        <div className="aspect-square md:aspect-[4/5] relative">
          <Image
            src={image.imageUrl}
            alt={image.altText || image.title || 'Post image'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 470px"
            priority
          />
        </div>

        {/* Double tap heart animation */}
        <AnimatePresence>
          {showLikeAnimation && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.3 }}
            >
              <Heart className="w-24 h-24 text-white fill-white drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="px-3 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className="group transition-transform active:scale-90"
            >
              <Heart 
                className={`w-6 h-6 transition-colors ${
                  isLiked 
                    ? 'text-red-500 fill-red-500' 
                    : 'text-foreground group-hover:text-foreground/70'
                }`} 
              />
            </button>
            <button 
              onClick={() => onCommentClick ? onCommentClick(image) : router.push(`/image/${image._id}`)}
              className="group transition-transform active:scale-90"
            >
              <MessageCircle className="w-6 h-6 text-foreground group-hover:text-foreground/70 transition-colors" />
            </button>
            <button 
              onClick={handleShare}
              className="group transition-transform active:scale-90"
            >
              <Send className="w-6 h-6 text-foreground group-hover:text-foreground/70 transition-colors -rotate-12" />
            </button>
          </div>
          <button 
            onClick={handleSave}
            className="group transition-transform active:scale-90"
          >
            <Bookmark 
              className={`w-6 h-6 transition-colors ${
                isSaved 
                  ? 'text-foreground fill-foreground' 
                  : 'text-foreground group-hover:text-foreground/70'
              }`} 
            />
          </button>
        </div>

        {/* Likes count */}
        {likesCount > 0 && (
          <button className="mt-2">
            <span className="font-semibold text-sm text-foreground">
              {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
            </span>
          </button>
        )}

        {/* Caption */}
        {caption && (
          <div className="mt-2">
            <p className="text-sm text-foreground">
              <Link 
                href={`/profile/@${image.user?.username}`}
                className="font-semibold mr-1 hover:text-foreground/80"
              >
                {image.user?.username}
              </Link>
              {formatCaption(displayCaption)}
              {shouldTruncate && (
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-muted-foreground ml-1"
                >
                  {isExpanded ? 'less' : 'more'}
                </button>
              )}
            </p>
          </div>
        )}

        {/* View comments */}
        {image.commentsCount > 0 && (
          <button 
            onClick={() => onCommentClick ? onCommentClick(image) : router.push(`/image/${image._id}`)}
            className="mt-1 text-sm text-muted-foreground hover:text-muted-foreground/80"
          >
            View all {image.commentsCount} comments
          </button>
        )}

        {/* Timestamp */}
        <p className="mt-2 mb-3 text-[10px] text-muted-foreground uppercase tracking-wide">
          {formatDistanceToNow(new Date(image.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Add comment (inline) */}
      <div className="hidden md:flex items-center border-t border-border px-3 py-3">
        <button className="mr-3">
          <Smile className="w-6 h-6 text-foreground" />
        </button>
        <input
          type="text"
          placeholder="Add a comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none"
        />
        {commentText && (
          <button className="text-primary font-semibold text-sm hover:text-primary/80 transition-colors">
            Post
          </button>
        )}
      </div>
    </article>
  );
};

export default InstagramPostCard;
