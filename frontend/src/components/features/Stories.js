"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Heart,
  Send,
  MoreHorizontal,
  Share2,
  Eye
} from 'lucide-react';

// ====== STORY RING ======
const StoryRing = ({ user, hasNewStory = true, isOwn = false, onClick, size = 'normal' }) => {
  const sizeClasses = {
    small: 'w-14 h-14',
    normal: 'w-16 h-16 md:w-[66px] md:h-[66px]',
    large: 'w-20 h-20'
  };

  const innerSizeClasses = {
    small: 'w-[52px] h-[52px]',
    normal: 'w-[58px] h-[58px] md:w-[60px] md:h-[60px]',
    large: 'w-[72px] h-[72px]'
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 flex-shrink-0"
    >
      <div className={`relative ${sizeClasses[size]} rounded-full p-[2px] ${
        hasNewStory 
          ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600' 
          : isOwn ? 'bg-border' : 'bg-border'
      }`}>
        <div className={`${innerSizeClasses[size]} rounded-full bg-background p-[2px]`}>
          <div className="w-full h-full rounded-full overflow-hidden relative">
            <Image
              src={user.profilePicture || '/images/default-profile.jpg'}
              alt={user.username || 'User'}
              fill
              className="object-cover"
            />
          </div>
        </div>
        {isOwn && (
          <div className="absolute -bottom-0.5 -right-0.5 z-20">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-[2.5px] border-background shadow-lg">
              <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
            </div>
          </div>
        )}
      </div>
      <span className="text-xs text-foreground truncate w-16 text-center">
        {isOwn ? 'Your story' : user.username}
      </span>
    </button>
  );
};

// ====== STORIES BAR ======
const StoriesBar = ({ stories = [], onStoryClick, onAddStory }) => {
  const { user } = useAuth();
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      el?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [stories]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative bg-card border-b border-border md:border md:rounded-lg md:mb-4">
      <div 
        ref={scrollRef}
        className="flex gap-3 py-4 px-4 overflow-x-auto scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {user && (
          <StoryRing
            user={user}
            hasNewStory={false}
            isOwn={true}
            onClick={onAddStory}
          />
        )}
        {stories.map((story, index) => (
          <StoryRing
            key={story._id || index}
            user={story.user}
            hasNewStory={!story.viewed}
            onClick={() => onStoryClick(index)}
          />
        ))}
      </div>

      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-card border border-border rounded-full items-center justify-center shadow-md hover:bg-secondary transition-colors z-10"
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
      )}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-card border border-border rounded-full items-center justify-center shadow-md hover:bg-secondary transition-colors z-10"
        >
          <ChevronRight className="w-4 h-4 text-foreground" />
        </button>
      )}
    </div>
  );
};

// ====== STORY VIEWER (Full Instagram-like) ======
const StoryViewer = ({ stories, initialIndex = 0, onClose }) => {
  const api = useApi();
  const { user } = useAuth();

  // Navigation state
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialIndex);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState(0);

  // Playback state
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  // Like state
  const [isLiked, setIsLiked] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [likedStories, setLikedStories] = useState(new Set());
  const [unlikedStories, setUnlikedStories] = useState(new Set());

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [showReplySent, setShowReplySent] = useState(false);

  // UI state
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  // Refs
  const progressRef = useRef(0);
  const timerRef = useRef(null);
  const holdTimerRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const replyInputRef = useRef(null);
  const lastTapTime = useRef(0);
  const lastTapX = useRef(0);
  const videoRef = useRef(null);

  const STORY_DURATION = 5000;

  // Derived
  const currentStory = stories[currentStoryIndex];
  const currentItem = currentStory?.items?.[currentItemIndex] || currentStory;
  const items = currentStory?.items || [currentStory];
  const isOwnStory = currentStory?.user?._id === user?._id;
  const currentImageId = currentItem?._id || currentItem?.imageId || null;

  // ====== PROGRESS TIMER (with proper pause/resume) ======
  const startTimer = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);

    let startTime = Date.now();
    let startProgress = progressRef.current;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const additionalProgress = (elapsed / STORY_DURATION) * 100;
      const newProgress = Math.min(startProgress + additionalProgress, 100);
      progressRef.current = newProgress;
      setProgress(newProgress);

      if (newProgress >= 100) {
        // Use functional navigation to avoid stale closures
        setCurrentItemIndex(prevItem => {
          const storyItems = stories[currentStoryIndex]?.items || [stories[currentStoryIndex]];
          if (prevItem < storyItems.length - 1) {
            progressRef.current = 0;
            setProgress(0);
            setReplyText('');
            return prevItem + 1;
          }
          // Move to next story
          setCurrentStoryIndex(prevStory => {
            if (prevStory < stories.length - 1) {
              setSlideDirection(1);
              progressRef.current = 0;
              setProgress(0);
              setReplyText('');
              setCurrentItemIndex(0);
              return prevStory + 1;
            }
            // End of all stories
            onClose();
            return prevStory;
          });
          return 0;
        });
        return;
      }
      timerRef.current = requestAnimationFrame(tick);
    };

    timerRef.current = requestAnimationFrame(tick);
  }, [currentStoryIndex, stories, onClose]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Run/pause timer based on state
  useEffect(() => {
    const shouldPause = isPaused || isHolding || showMoreMenu || showShareMenu;
    if (shouldPause) {
      stopTimer();
    } else {
      startTimer();
    }
    return () => stopTimer();
  }, [isPaused, isHolding, showMoreMenu, showShareMenu, startTimer, stopTimer]);

  // Reset progress on story/item change
  useEffect(() => {
    progressRef.current = 0;
    setProgress(0);
    setShowMoreMenu(false);
    setShowShareMenu(false);
  }, [currentStoryIndex, currentItemIndex]);

  // ====== CHECK LIKE STATE FROM DB ======
  useEffect(() => {
    const key = `${currentStoryIndex}-${currentItemIndex}`;
    if (likedStories.has(key)) { setIsLiked(true); return; }
    if (unlikedStories.has(key)) { setIsLiked(false); return; }

    const imageId = currentItem?._id || currentItem?.imageId;
    if (!imageId) { setIsLiked(false); return; }

    let cancelled = false;
    api.get(`/api/likes/${imageId}/check`)
      .then(res => {
        if (!cancelled) {
          const liked = res.data?.data?.isLiked || res.data?.data?.liked || false;
          setIsLiked(liked);
          if (liked) setLikedStories(prev => new Set(prev).add(key));
        }
      })
      .catch(() => { if (!cancelled) setIsLiked(false); });

    return () => { cancelled = true; };
  }, [currentStoryIndex, currentItemIndex, api, currentItem]);

  // ====== NAVIGATION ======
  const goToNext = useCallback(() => {
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
      progressRef.current = 0;
      setProgress(0);
      setReplyText('');
    } else if (currentStoryIndex < stories.length - 1) {
      setSlideDirection(1);
      setCurrentStoryIndex(prev => prev + 1);
      setCurrentItemIndex(0);
      progressRef.current = 0;
      setProgress(0);
      setReplyText('');
    } else {
      onClose();
    }
  }, [items.length, currentItemIndex, currentStoryIndex, stories.length, onClose]);

  const goToPrev = useCallback(() => {
    if (progress > 15 || currentItemIndex > 0) {
      // If progress > 15%, restart current; else go back
      if (progress > 15 && currentItemIndex === 0 && currentStoryIndex === 0) {
        progressRef.current = 0;
        setProgress(0);
      } else if (currentItemIndex > 0) {
        setCurrentItemIndex(prev => prev - 1);
        progressRef.current = 0;
        setProgress(0);
        setReplyText('');
      } else {
        progressRef.current = 0;
        setProgress(0);
      }
    } else if (currentStoryIndex > 0) {
      setSlideDirection(-1);
      setCurrentStoryIndex(prev => prev - 1);
      setCurrentItemIndex(0);
      progressRef.current = 0;
      setProgress(0);
      setReplyText('');
    }
  }, [progress, currentItemIndex, currentStoryIndex]);

  // ====== LIKE / UNLIKE ======
  const handleLikeStory = useCallback(async () => {
    const key = `${currentStoryIndex}-${currentItemIndex}`;
    const wasLiked = isLiked;

    // Optimistic update
    setIsLiked(!wasLiked);
    if (!wasLiked) {
      setLikedStories(prev => new Set(prev).add(key));
      setUnlikedStories(prev => { const n = new Set(prev); n.delete(key); return n; });
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1000);
    } else {
      setLikedStories(prev => { const n = new Set(prev); n.delete(key); return n; });
      setUnlikedStories(prev => new Set(prev).add(key));
    }

    const imageId = currentItem?._id || currentItem?.imageId;
    if (imageId) {
      try {
        const res = await api.post(`/api/images/${imageId}/story-like`);
        const liked = res.data?.data?.liked;
        if (typeof liked === 'boolean') {
          setIsLiked(liked);
          if (liked) {
            setLikedStories(prev => new Set(prev).add(key));
            setUnlikedStories(prev => { const n = new Set(prev); n.delete(key); return n; });
          } else {
            setLikedStories(prev => { const n = new Set(prev); n.delete(key); return n; });
            setUnlikedStories(prev => new Set(prev).add(key));
          }
        }
      } catch (err) {
        console.error('Error liking story:', err);
        setIsLiked(wasLiked);
        if (wasLiked) setLikedStories(prev => new Set(prev).add(key));
        else { setLikedStories(prev => { const n = new Set(prev); n.delete(key); return n; }); }
      }
    }
  }, [currentStoryIndex, currentItemIndex, isLiked, currentItem, api]);

  // ====== DOUBLE TAP TO LIKE ======
  const handleDoubleTap = useCallback((x) => {
    const now = Date.now();
    const dt = now - lastTapTime.current;
    const dx = Math.abs(x - lastTapX.current);

    if (dt < 300 && dx < 80) {
      // Double tap
      if (!isLiked) {
        handleLikeStory();
      } else {
        setShowHeartAnimation(true);
        setTimeout(() => setShowHeartAnimation(false), 1000);
      }
      lastTapTime.current = 0;
      return true;
    }

    lastTapTime.current = now;
    lastTapX.current = x;
    return false;
  }, [isLiked, handleLikeStory]);

  // ====== REPLY ======
  const handleSendReply = async () => {
    if (!replyText.trim() || isSendingReply) return;
    setIsSendingReply(true);
    setIsPaused(true);

    try {
      if (currentImageId) {
        await api.post(`/api/images/${currentImageId}/story-reply`, { message: replyText.trim() });
      } else {
        const storyOwner = currentStory?.user;
        if (storyOwner?._id) {
          const convRes = await api.post(`/api/messages/conversations/${storyOwner._id}`);
          const conversationId = convRes.data.data._id;
          await api.post(`/api/messages/conversations/${conversationId}/messages`, {
            content: `Replied to your story: ${replyText.trim()}`,
            messageType: 'storyReply',
          });
        }
      }

      setReplyText('');
      setShowReplySent(true);
      setTimeout(() => {
        setShowReplySent(false);
        setIsPaused(false);
      }, 1500);
    } catch (err) {
      console.error('Error sending story reply:', err);
      setIsPaused(false);
    } finally {
      setIsSendingReply(false);
    }
  };

  // ====== SHARE ======
  const handleShare = useCallback(() => {
    setShowShareMenu(true);
  }, []);

  const handleCopyLink = useCallback(async () => {
    const imageId = currentItem?._id || currentItem?.imageId;
    const url = imageId
      ? `${window.location.origin}/image/${imageId}`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => { setLinkCopied(false); setShowShareMenu(false); }, 1200);
    } catch {
      setShowShareMenu(false);
    }
  }, [currentItem]);

  const handleShareExternal = useCallback(async () => {
    const imageId = currentItem?._id || currentItem?.imageId;
    const url = imageId
      ? `${window.location.origin}/image/${imageId}`
      : window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${currentStory?.user?.username}'s story`, url });
      } catch {}
    } else {
      handleCopyLink();
    }
    setShowShareMenu(false);
  }, [currentItem, currentStory, handleCopyLink]);

  // ====== MORE MENU ======
  const handleMoreMenu = useCallback(() => {
    setShowMoreMenu(prev => !prev);
  }, []);

  // ====== TOUCH / CLICK HANDLERS (Instagram-style) ======
  // Long press = pause, short tap left/right = navigate, double tap center = like
  const isInteractive = (target) => {
    return target?.closest?.('input') || target?.closest?.('button') || target?.closest?.('a') || target?.closest?.('[data-menu]');
  };

  const handlePointerDown = (e) => {
    if (isInteractive(e.target)) return;

    const x = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    touchStartX.current = x;
    touchStartY.current = y;
    touchStartTime.current = Date.now();

    // Long hold to pause (Instagram behavior: hold = pause, release = play)
    holdTimerRef.current = setTimeout(() => {
      setIsHolding(true);
    }, 200);
  };

  const handlePointerUp = (e) => {
    if (isInteractive(e.target)) return;

    clearTimeout(holdTimerRef.current);

    const endX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
    const endY = e.clientY ?? e.changedTouches?.[0]?.clientY ?? 0;
    const diffX = touchStartX.current - endX;
    const diffY = touchStartY.current - endY;
    const elapsed = Date.now() - touchStartTime.current;

    // If was holding, just release
    if (isHolding) {
      setIsHolding(false);
      return;
    }

    // Swipe detection
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) goToNext();
      else goToPrev();
      return;
    }

    // Swipe down to close
    if (diffY < -80) {
      onClose();
      return;
    }

    // Only process taps (not long presses or swipes)
    if (elapsed > 300) return;

    // Capture rect NOW before React recycles the event
    const rect = e.currentTarget?.getBoundingClientRect();

    // Double tap detection
    const wasDoubleTap = handleDoubleTap(endX);
    if (wasDoubleTap) return;

    // Single tap — use a short delay so double-tap can cancel it
    const tapX = endX;
    setTimeout(() => {
      if (lastTapTime.current !== 0 && Date.now() - lastTapTime.current < 300) return;
      if (!rect) return;
      const x = tapX - rect.left;
      const w = rect.width;
      if (x < w * 0.3) goToPrev();
      else if (x > w * 0.7) goToNext();
      // Center tap = do nothing (Instagram behavior)
    }, 320);
  };

  // Cancel hold if pointer leaves
  const handlePointerLeave = () => {
    clearTimeout(holdTimerRef.current);
    if (isHolding) setIsHolding(false);
  };

  // ====== INPUT HANDLERS ======
  const handleInputFocus = () => setIsPaused(true);
  const handleInputBlur = () => { if (!replyText.trim()) setIsPaused(false); };
  const handleReplyKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); }
  };

  // ====== KEYBOARD ======
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      switch (e.key) {
        case 'ArrowRight': goToNext(); break;
        case 'ArrowLeft': goToPrev(); break;
        case 'Escape': onClose(); break;
        case ' ': e.preventDefault(); setIsPaused(p => !p); break;
        case 'm': case 'M': setIsMuted(m => !m); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, onClose]);

  // ====== LOCK BODY SCROLL ======
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ====== TIME AGO ======
  const timeAgo = (date) => {
    if (!date) return '';
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
  };

  if (!currentStory) return null;

  // Slide animation for switching between users
  const slideVariants = {
    enter: (direction) => ({ x: direction > 0 ? '100%' : '-100%', scale: 0.85, opacity: 0.5 }),
    center: { x: 0, scale: 1, opacity: 1, transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] } },
    exit: (direction) => ({ x: direction > 0 ? '-100%' : '100%', scale: 0.85, opacity: 0.5, transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] } }),
  };

  // ====== STORY CONTENT (called as function, NOT as <Component/>, to avoid remounting on every render) ======
  const renderStoryContent = (isMobile = false) => (
    <>
      {/* Progress bars */}
      <div className={`absolute top-0 left-0 right-0 z-30 flex gap-[3px] px-2 pt-2.5 ${isMobile ? 'safe-area-top' : ''}`}>
        {items.map((_, idx) => (
          <div key={idx} className="flex-1 h-[2.5px] bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{
                width: idx < currentItemIndex 
                  ? '100%' 
                  : idx === currentItemIndex 
                    ? `${progress}%` 
                    : '0%',
                transition: idx === currentItemIndex ? 'none' : 'none'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 z-30 flex items-center justify-between px-3">
        <Link 
          href={`/profile/${currentStory.user?.username}`} 
          className="flex items-center gap-2.5 flex-1 min-w-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden ring-[1.5px] ring-white/60 flex-shrink-0">
            <Image
              src={currentStory.user?.profilePicture || '/images/default-profile.jpg'}
              alt={currentStory.user?.username || 'User'}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white text-[13px] font-semibold truncate">
              {currentStory.user?.username}
            </span>
            <span className="text-white/50 text-[11px] flex-shrink-0">
              {timeAgo(currentItem.createdAt)}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {/* Pause / Play */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsPaused(p => !p); }}
            className="p-2 text-white active:bg-white/10 rounded-full transition-colors"
            title={isPaused ? 'Play' : 'Pause'}
          >
            {isPaused ? <Play className="w-5 h-5 fill-white" /> : <Pause className="w-5 h-5" />}
          </button>
          {/* Mute / Unmute (always shown) */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsMuted(m => !m); }}
            className="p-2 text-white active:bg-white/10 rounded-full transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          {/* More options */}
          <button
            onClick={(e) => { e.stopPropagation(); handleMoreMenu(); }}
            className="p-2 text-white active:bg-white/10 rounded-full transition-colors"
            title="More"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-2 text-white active:bg-white/10 rounded-full transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Story Image/Video */}
      <div className="w-full h-full bg-black">
        {currentItem.type === 'video' ? (
          <video
            ref={videoRef}
            key={`${currentStoryIndex}-${currentItemIndex}`}
            src={currentItem.url || currentItem.imageUrl}
            className="w-full h-full object-contain"
            autoPlay
            muted={isMuted}
            playsInline
            loop={false}
          />
        ) : (
          <Image
            key={`${currentStoryIndex}-${currentItemIndex}`}
            src={currentItem.url || currentItem.imageUrl || '/images/placeholder.jpg'}
            alt="Story"
            fill
            className="object-contain"
            priority
            sizes="(max-width: 768px) 100vw, 420px"
          />
        )}
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent pointer-events-none z-10" style={{ height: '25%' }} />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none z-10" style={{ height: '35%' }} />

      {/* Hold indicator (dim overlay like Instagram) */}
      {isHolding && (
        <div className="absolute inset-0 z-20 pointer-events-none" />
      )}

      {/* Double-tap heart animation */}
      <AnimatePresence>
        {showHeartAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.3, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          >
            <Heart className="w-20 h-20 text-red-500 fill-red-500 drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply sent confirmation */}
      <AnimatePresence>
        {showReplySent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-24 left-0 right-0 z-40 flex justify-center pointer-events-none"
          >
            <div className="bg-white/20 backdrop-blur-md text-white text-sm font-medium px-5 py-2 rounded-full flex items-center gap-2">
              <Send className="w-4 h-4" />
              Reply sent
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Link copied confirmation */}
      <AnimatePresence>
        {linkCopied && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-24 left-0 right-0 z-40 flex justify-center pointer-events-none"
          >
            <div className="bg-white/20 backdrop-blur-md text-white text-sm font-medium px-5 py-2 rounded-full">
              Link copied!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Caption */}
      {currentItem.caption && (
        <div className="absolute bottom-[76px] left-3 right-3 z-20 pointer-events-none">
          <p className="text-white text-[13px] leading-[18px] drop-shadow-md line-clamp-3">
            {currentItem.caption}
          </p>
        </div>
      )}

      {/* ====== BOTTOM BAR ====== */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 px-3 pb-3 pt-2 ${isMobile ? 'safe-area-bottom' : ''}`}>
        {!isOwnStory ? (
          <div className="flex items-center gap-2">
            {/* Reply input */}
            <input
              ref={replyInputRef}
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={handleReplyKeyDown}
              placeholder={`Reply to ${currentStory.user?.username}...`}
              className="story-reply-input flex-1 bg-transparent border border-white/30 rounded-full px-4 py-2 text-white text-sm placeholder-white/50 focus:outline-none focus:border-white/60"
              onClick={(e) => e.stopPropagation()}
            />
            {replyText.trim() ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleSendReply(); }}
                disabled={isSendingReply}
                className="p-2 text-white font-semibold text-sm disabled:opacity-40"
              >
                {isSendingReply ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            ) : (
              <div className="flex items-center gap-0.5">
                {/* Like button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleLikeStory(); }}
                  className="p-2 text-white active:scale-90 transition-transform"
                >
                  <Heart className={`w-6 h-6 transition-all duration-200 ${isLiked ? 'text-red-500 fill-red-500 scale-110' : 'text-white'}`} />
                </button>
                {/* Share button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleShare(); }}
                  className="p-2 text-white active:scale-90 transition-transform"
                >
                  <Share2 className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Own story footer — show viewers */
          <div className="flex items-center justify-center gap-2 py-1.5">
            <Eye className="w-4 h-4 text-white/60" />
            <span className="text-white/60 text-sm">Your story</span>
          </div>
        )}
      </div>

      {/* ====== MORE MENU ====== */}
      <AnimatePresence>
        {showMoreMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end justify-center"
            data-menu
            onClick={(e) => { e.stopPropagation(); setShowMoreMenu(false); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-zinc-900 rounded-t-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2" />
              <div className="py-2 pb-6">
                <button
                  className="w-full px-5 py-3 text-left text-white text-[15px] hover:bg-white/5 transition-colors flex items-center gap-3"
                  onClick={() => { handleCopyLink(); setShowMoreMenu(false); }}
                >
                  <Share2 className="w-5 h-5 text-white/70" />
                  Copy link
                </button>
                <button
                  className="w-full px-5 py-3 text-left text-white text-[15px] hover:bg-white/5 transition-colors flex items-center gap-3"
                  onClick={() => { handleShareExternal(); setShowMoreMenu(false); }}
                >
                  <Send className="w-5 h-5 text-white/70 -rotate-12" />
                  Share to...
                </button>
                {!isOwnStory && (
                  <button
                    className="w-full px-5 py-3 text-left text-red-400 text-[15px] hover:bg-white/5 transition-colors"
                    onClick={() => setShowMoreMenu(false)}
                  >
                    Report
                  </button>
                )}
                <button
                  className="w-full px-5 py-3 text-left text-white/60 text-[15px] hover:bg-white/5 transition-colors"
                  onClick={() => setShowMoreMenu(false)}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== SHARE MENU ====== */}
      <AnimatePresence>
        {showShareMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-end justify-center"
            data-menu
            onClick={(e) => { e.stopPropagation(); setShowShareMenu(false); }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-zinc-900 rounded-t-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2" />
              <div className="py-2 pb-6">
                <h3 className="text-white text-base font-semibold px-5 py-2">Share</h3>
                <button
                  className="w-full px-5 py-3 text-left text-white text-[15px] hover:bg-white/5 transition-colors flex items-center gap-3"
                  onClick={handleCopyLink}
                >
                  <Share2 className="w-5 h-5 text-white/70" />
                  Copy link
                </button>
                <button
                  className="w-full px-5 py-3 text-left text-white text-[15px] hover:bg-white/5 transition-colors flex items-center gap-3"
                  onClick={handleShareExternal}
                >
                  <Send className="w-5 h-5 text-white/70 -rotate-12" />
                  Share via...
                </button>
                <button
                  className="w-full px-5 py-3 text-left text-white/60 text-[15px] hover:bg-white/5 transition-colors"
                  onClick={() => setShowShareMenu(false)}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center select-none story-viewer-no-select"
    >
      {/* ====== DESKTOP VIEW ====== */}
      <div className="hidden md:flex items-center justify-center gap-4 h-full w-full px-16">
        {/* Previous story preview */}
        {currentStoryIndex > 0 && (
          <button
            onClick={() => { setSlideDirection(-1); setCurrentStoryIndex(prev => prev - 1); setCurrentItemIndex(0); progressRef.current = 0; setProgress(0); setReplyText(''); }}
            className="relative w-[100px] h-[180px] rounded-lg overflow-hidden opacity-40 hover:opacity-60 transition-opacity flex-shrink-0 cursor-pointer"
          >
            <Image
              src={stories[currentStoryIndex - 1]?.items?.[0]?.url || stories[currentStoryIndex - 1]?.items?.[0]?.imageUrl || '/images/placeholder.jpg'}
              alt="Previous story"
              fill
              className="object-cover"
            />
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-white text-[10px] font-medium truncate">{stories[currentStoryIndex - 1]?.user?.username}</p>
            </div>
          </button>
        )}

        {/* Current story */}
        <AnimatePresence mode="wait" custom={slideDirection}>
          <motion.div
            key={currentStoryIndex}
            custom={slideDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="relative w-full max-w-[420px] h-[95vh] rounded-xl overflow-hidden flex-shrink-0 bg-black"
            onMouseDown={handlePointerDown}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerLeave}
          >
            {renderStoryContent(false)}
          </motion.div>
        </AnimatePresence>

        {/* Next story preview */}
        {currentStoryIndex < stories.length - 1 && (
          <button
            onClick={() => { setSlideDirection(1); setCurrentStoryIndex(prev => prev + 1); setCurrentItemIndex(0); progressRef.current = 0; setProgress(0); setReplyText(''); }}
            className="relative w-[100px] h-[180px] rounded-lg overflow-hidden opacity-40 hover:opacity-60 transition-opacity flex-shrink-0 cursor-pointer"
          >
            <Image
              src={stories[currentStoryIndex + 1]?.items?.[0]?.url || stories[currentStoryIndex + 1]?.items?.[0]?.imageUrl || '/images/placeholder.jpg'}
              alt="Next story"
              fill
              className="object-cover"
            />
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-white text-[10px] font-medium truncate">{stories[currentStoryIndex + 1]?.user?.username}</p>
            </div>
          </button>
        )}
      </div>

      {/* ====== MOBILE VIEW ====== */}
      <div className="md:hidden w-full h-full">
        <AnimatePresence mode="wait" custom={slideDirection}>
          <motion.div
            key={currentStoryIndex}
            custom={slideDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="relative w-full h-full"
            onTouchStart={handlePointerDown}
            onTouchEnd={handlePointerUp}
          >
            {renderStoryContent(true)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desktop Navigation arrows */}
      {currentStoryIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setSlideDirection(-1); goToPrev(); }}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full items-center justify-center transition-colors z-50"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}
      {currentStoryIndex < stories.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setSlideDirection(1); goToNext(); }}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full items-center justify-center transition-colors z-50"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}
    </motion.div>
  );
};

export { StoriesBar, StoryViewer, StoryRing };
export default StoriesBar;
