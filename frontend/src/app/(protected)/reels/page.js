"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useReels } from "@/context/ReelsContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  UserPlus,
  UserCheck,
  Trash2,
  Flag,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "react-hot-toast";
import Link from "next/link";
import ReelCommentsPanel from "@/components/features/ReelCommentsPanel";
import { useApi } from "@/hooks/useApi";

export default function ReelsPage() {
  const {
    reels,
    currentReelIndex,
    setCurrentReelIndex,
    loading,
    hasMore,
    feedType,
    setFeedType,
    fetchReels,
    loadMoreReels,
    toggleLikeReel,
    toggleSaveReel,
    deleteReel,
    nextReel,
    prevReel,
  } = useReels();
  
  const { user } = useAuth();
  const api = useApi();
  const router = useRouter();
  const containerRef = useRef(null);
  const videoRefs = useRef({});

  // UI State
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [followingStatus, setFollowingStatus] = useState({});
  const [videoProgress, setVideoProgress] = useState(0);
  const [followLoading, setFollowLoading] = useState({});
  
  // Smooth transition state
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState(null); // 'up' or 'down'

  // Touch handling for swipe
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Double tap detection
  const lastTap = useRef(0);
  const doubleTapTimeout = useRef(null);

  // Swipe threshold
  const minSwipeDistance = 50;

  // Fetch reels on mount
  useEffect(() => {
    fetchReels(feedType, 1);
  }, [feedType]);

  // Check follow status when current reel changes
  useEffect(() => {
    const currentReel = reels[currentReelIndex];
    const reelUserId = currentReel?.user?._id;
    if (!reelUserId || !user || reelUserId === user._id) return;
    if (followingStatus[reelUserId] !== undefined) return;
    
    api.get(`/api/follow/status/${reelUserId}`)
      .then(res => {
        setFollowingStatus(prev => ({
          ...prev,
          [reelUserId]: res.data?.data?.isFollowing ?? false,
        }));
      })
      .catch(() => {});
  }, [currentReelIndex, reels, user]);

  // Smooth transition handler
  const handleReelTransition = useCallback((direction, navigateFn) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setTransitionDirection(direction);
    
    // Start transition animation
    setTimeout(() => {
      navigateFn();
      // Reset transition after animation completes
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionDirection(null);
      }, 300);
    }, 150);
  }, [isTransitioning]);

  // Handle scroll/swipe navigation
  const handleScroll = useCallback(
    (e) => {
      e.preventDefault();
      if (isTransitioning) return;
      
      if (e.deltaY > 0) {
        handleReelTransition('up', nextReel);
      } else if (e.deltaY < 0) {
        handleReelTransition('down', prevReel);
      }
    },
    [nextReel, prevReel, isTransitioning, handleReelTransition]
  );

  // Touch handlers for mobile swipe
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    if (isTransitioning) return;

    const distance = touchStart - touchEnd;
    const isSwipeUp = distance > minSwipeDistance;
    const isSwipeDown = distance < -minSwipeDistance;

    if (isSwipeUp) {
      handleReelTransition('up', nextReel);
    } else if (isSwipeDown) {
      handleReelTransition('down', prevReel);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showComments) return; // Don't interfere with comment input
      if (isTransitioning) return;

      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();
          handleReelTransition('up', nextReel);
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          handleReelTransition('down', prevReel);
          break;
        case " ":
          e.preventDefault();
          togglePlayPause();
          break;
        case "m":
          setIsMuted((prev) => !prev);
          break;
        case "l":
          handleLike();
          break;
        case "s":
          handleSave();
          break;
        case "c":
          setShowComments(true);
          break;
        case "Escape":
          setShowComments(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextReel, prevReel, isPlaying, isMuted, showComments]);

  // Play/pause video when index changes
  useEffect(() => {
    Object.keys(videoRefs.current).forEach((key) => {
      const video = videoRefs.current[key];
      if (video) {
        if (parseInt(key) === currentReelIndex) {
          if (isPlaying) {
            video.play().catch(() => {});
          }
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
    setVideoProgress(0);
  }, [currentReelIndex, isPlaying]);

  // Video progress tracking
  const handleTimeUpdate = (e) => {
    const video = e.target;
    if (video.duration) {
      setVideoProgress((video.currentTime / video.duration) * 100);
    }
  };

  const togglePlayPause = () => {
    const video = videoRefs.current[currentReelIndex];
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Double tap to like
  const handleDoubleTap = useCallback(() => {
    const currentReel = reels[currentReelIndex];
    if (!currentReel) return;

    // Show heart animation
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 1000);

    // Like if not already liked
    if (!currentReel.isLiked) {
      toggleLikeReel(currentReel._id);
    }
  }, [reels, currentReelIndex, toggleLikeReel]);

  // Handle video tap
  const handleVideoTap = (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap.current;

    if (doubleTapTimeout.current) {
      clearTimeout(doubleTapTimeout.current);
    }

    if (tapLength < 300 && tapLength > 0) {
      // Double tap
      handleDoubleTap();
      lastTap.current = 0;
    } else {
      // Single tap - wait to see if it's a double tap
      doubleTapTimeout.current = setTimeout(() => {
        togglePlayPause();
      }, 300);
      lastTap.current = currentTime;
    }
  };

  const handleLike = async () => {
    const currentReel = reels[currentReelIndex];
    if (!currentReel) return;
    try {
      await toggleLikeReel(currentReel._id);
    } catch (error) {
      toast.error("Failed to like reel");
    }
  };

  const handleSave = async () => {
    const currentReel = reels[currentReelIndex];
    if (!currentReel) return;
    try {
      await toggleSaveReel(currentReel._id);
      toast.success(currentReel.isSaved ? "Removed from saved" : "Saved!");
    } catch (error) {
      toast.error("Failed to save reel");
    }
  };

  const handleShare = async () => {
    const currentReel = reels[currentReelIndex];
    if (!currentReel) return;

    const reelUrl = `${window.location.origin}/reels/${currentReel._id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: currentReel.caption || "Check out this reel!",
          url: reelUrl,
        });
      } else {
        await navigator.clipboard.writeText(reelUrl);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      // User cancelled share
      if (error.name !== "AbortError") {
        await navigator.clipboard.writeText(reelUrl);
        toast.success("Link copied to clipboard!");
      }
    }
  };

  const handleFollow = async (userId) => {
    if (followLoading[userId]) return;
    
    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const response = await api.post(`/api/follow/toggle/${userId}`);
      const newFollowState = response.data.data.isFollowing;
      setFollowingStatus((prev) => ({
        ...prev,
        [userId]: newFollowState,
      }));
      toast.success(
        newFollowState ? "Following!" : "Unfollowed"
      );
    } catch (error) {
      toast.error("Failed to follow user");
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleDelete = async () => {
    const currentReel = reels[currentReelIndex];
    if (!currentReel) return;

    if (confirm("Are you sure you want to delete this reel?")) {
      try {
        await deleteReel(currentReel._id);
        toast.success("Reel deleted");
      } catch (error) {
        toast.error("Failed to delete reel");
      }
    }
  };

  const currentReel = reels[currentReelIndex];

  const formatCount = (count) => {
    if (!count) return "0";
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + "M";
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + "K";
    }
    return count.toString();
  };

  const isFollowing = (userId) => {
    return followingStatus[userId] ?? false;
  };

  if (loading && reels.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!loading && reels.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <p className="text-xl mb-4">No reels yet</p>
        <p className="text-muted-foreground mb-6">Be the first to upload a reel!</p>
        <Link href="/upload-reel">
          <Button className="bg-violet-600 hover:bg-violet-700">
            Upload Reel
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden select-none">
      {/* Main Container */}
      <div
        ref={containerRef}
        onWheel={handleScroll}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="h-full w-full flex items-center justify-center py-4"
      >
        {currentReel && (
          <div className={`relative h-full w-full max-w-[420px] max-h-[calc(100vh-32px)] mx-auto transition-all duration-300 ease-out ${
            isTransitioning 
              ? transitionDirection === 'up' 
                ? 'opacity-0 -translate-y-8 scale-95' 
                : 'opacity-0 translate-y-8 scale-95'
              : 'opacity-100 translate-y-0 scale-100'
          }`}>
            {/* Video Container with rounded corners */}
            <div className="relative h-full w-full rounded-2xl overflow-hidden shadow-2xl" onClick={handleVideoTap}>
              {/* Feed Type Tabs - Centered on the reel */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-1 bg-black/50 backdrop-blur-md rounded-full p-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setFeedType("for-you"); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    feedType === "for-you"
                      ? "bg-white text-black"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  For You
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setFeedType("following"); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    feedType === "following"
                      ? "bg-white text-black"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Following
                </button>
              </div>
              
              <video
                ref={(el) => (videoRefs.current[currentReelIndex] = el)}
                src={currentReel.videoUrl}
                poster={currentReel.thumbnailUrl}
                className="h-full w-full object-cover bg-black"
                loop
                muted={isMuted}
                playsInline
                onTimeUpdate={handleTimeUpdate}
              />

              {/* Progress Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{ width: `${videoProgress}%` }}
                />
              </div>

              {/* Play/Pause Overlay (shown when paused) */}
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                  <div className="w-20 h-20 flex items-center justify-center bg-white/20 rounded-full backdrop-blur-sm">
                    <Play className="h-10 w-10 text-white ml-1" />
                  </div>
                </div>
              )}

              {/* Double Tap Heart Animation */}
              {showHeartAnimation && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Heart className="w-32 h-32 text-white fill-white animate-heart-burst" />
                </div>
              )}

              {/* Gradient Overlay for bottom content */}
              <div className="absolute bottom-0 left-0 right-0 h-72 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
            </div>

            {/* Bottom Content - User Info, Caption, Tags */}
            <div className="absolute bottom-20 left-4 right-20 text-white z-10">
              {/* User Info with Follow Button - Instagram Style */}
              <div className="flex items-center gap-3 mb-3">
                <Link
                  href={`/profile/${currentReel.user?.username}`}
                  className="flex items-center gap-3 group cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative">
                    <img
                      src={
                        currentReel.user?.profilePicture ||
                        "/images/default-profile.jpg"
                      }
                      alt={currentReel.user?.fullName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg group-hover:scale-105 transition-transform"
                    />
                    {currentReel.user?.isVerified && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">✓</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm group-hover:underline">
                      {currentReel.user?.username}
                    </p>
                    <p className="text-xs text-white/70">
                      {currentReel.user?.fullName}
                    </p>
                  </div>
                </Link>

                {/* Follow Button - Instagram Style (Only show for other users) */}
                {currentReel.user?._id !== user?._id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollow(currentReel.user?._id);
                    }}
                    disabled={followLoading[currentReel.user?._id]}
                    className={`ml-1 px-4 py-1.5 rounded-md text-sm font-semibold border transition-all active:scale-95 ${
                      isFollowing(currentReel.user?._id)
                        ? "bg-transparent border-white/50 text-white hover:bg-white/10"
                        : "bg-white border-white text-black hover:bg-white/90"
                    } ${followLoading[currentReel.user?._id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {followLoading[currentReel.user?._id] ? (
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      </span>
                    ) : isFollowing(currentReel.user?._id) ? (
                      "Following"
                    ) : (
                      "Follow"
                    )}
                  </button>
                )}
              </div>

              {/* Caption */}
              {currentReel.caption && (
                <p className="text-sm mb-2 line-clamp-2">{currentReel.caption}</p>
              )}

              {/* Tags */}
              {currentReel.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {currentReel.tags.slice(0, 4).map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs bg-white/15 px-2 py-1 rounded-full backdrop-blur-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                  {currentReel.tags.length > 4 && (
                    <span className="text-xs text-white/60">
                      +{currentReel.tags.length - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Music */}
              {currentReel.music?.name && (
                <div className="flex items-center gap-2 text-xs bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <Music className="h-3.5 w-3.5 animate-pulse" />
                  <span className="truncate max-w-[180px]">
                    {currentReel.music.name}
                    {currentReel.music.artist && ` • ${currentReel.music.artist}`}
                  </span>
                </div>
              )}
            </div>

            {/* Right Side Action Buttons */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
              {/* Like Button */}
              <button
                onClick={handleLike}
                className="flex flex-col items-center group active:scale-90 transition-transform"
              >
                <div
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${
                    currentReel.isLiked
                      ? "bg-red-500 scale-110"
                      : "bg-white/15 backdrop-blur-sm group-hover:bg-white/25"
                  }`}
                >
                  <Heart
                    className={`h-6 w-6 transition-transform group-hover:scale-110 ${
                      currentReel.isLiked
                        ? "text-white fill-white"
                        : "text-white"
                    }`}
                  />
                </div>
                <span className="text-white text-xs mt-1 font-medium">
                  {formatCount(currentReel.likesCount)}
                </span>
              </button>

              {/* Comments Button */}
              <button
                onClick={() => setShowComments(true)}
                className="flex flex-col items-center group active:scale-90 transition-transform"
              >
                <div className="w-12 h-12 flex items-center justify-center bg-white/15 backdrop-blur-sm rounded-full group-hover:bg-white/25 transition-all">
                  <MessageCircle className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-white text-xs mt-1 font-medium">
                  {formatCount(currentReel.commentsCount)}
                </span>
              </button>

              {/* Save Button */}
              <button onClick={handleSave} className="flex flex-col items-center group active:scale-90 transition-transform">
                <div
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${
                    currentReel.isSaved
                      ? "bg-yellow-500 scale-110"
                      : "bg-white/15 backdrop-blur-sm group-hover:bg-white/25"
                  }`}
                >
                  <Bookmark
                    className={`h-6 w-6 transition-transform group-hover:scale-110 ${
                      currentReel.isSaved
                        ? "text-white fill-white"
                        : "text-white"
                    }`}
                  />
                </div>
                <span className="text-white text-xs mt-1 font-medium">
                  {formatCount(currentReel.savesCount)}
                </span>
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="flex flex-col items-center group active:scale-90 transition-transform"
              >
                <div className="w-12 h-12 flex items-center justify-center bg-white/15 backdrop-blur-sm rounded-full group-hover:bg-white/25 transition-all">
                  <Share2 className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-white text-xs mt-1 font-medium">Share</span>
              </button>

              {/* Mute/Unmute Button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-10 h-10 flex items-center justify-center bg-white/15 backdrop-blur-sm rounded-full hover:bg-white/25 transition-all active:scale-90"
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5 text-white" />
                ) : (
                  <Volume2 className="h-5 w-5 text-white" />
                )}
              </button>

              {/* More Options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-10 h-10 flex items-center justify-center bg-white/15 backdrop-blur-sm rounded-full hover:bg-white/25 transition-all active:scale-90">
                    <MoreVertical className="h-5 w-5 text-white" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-zinc-900 border-zinc-700 min-w-[160px]"
                >
                  <DropdownMenuItem
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/reels/${currentReel._id}`
                      );
                      toast.success("Link copied!");
                    }}
                    className="hover:bg-zinc-800 cursor-pointer"
                  >
                    <LinkIcon className="h-4 w-4 mr-2" /> Copy Link
                  </DropdownMenuItem>

                  {currentReel.user?._id !== user?._id && (
                    <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer">
                      <Flag className="h-4 w-4 mr-2" /> Report
                    </DropdownMenuItem>
                  )}

                  {currentReel.user?._id === user?._id && (
                    <>
                      <DropdownMenuSeparator className="bg-zinc-700" />
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-red-500 hover:bg-zinc-800 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Avatar (spinning disc effect for music) */}
              {currentReel.music?.name && (
                <Link
                  href={`/profile/${currentReel.user?.username}`}
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50 animate-spin-slow"
                >
                  <img
                    src={
                      currentReel.user?.profilePicture ||
                      "/images/default-profile.jpg"
                    }
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </Link>
              )}
            </div>

            {/* Navigation Arrows - Outside the video on right */}
            <div className="hidden md:flex absolute right-[-50px] top-1/2 transform -translate-y-1/2 flex-col gap-3">
              <button
                onClick={() => handleReelTransition('down', prevReel)}
                disabled={currentReelIndex === 0 || isTransitioning}
                className="w-10 h-10 flex items-center justify-center bg-secondary hover:bg-secondary/80 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronUp className="h-5 w-5 text-foreground" />
              </button>
              <button
                onClick={() => handleReelTransition('up', nextReel)}
                disabled={(currentReelIndex >= reels.length - 1 && !hasMore) || isTransitioning}
                className="w-10 h-10 flex items-center justify-center bg-secondary hover:bg-secondary/80 rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronDown className="h-5 w-5 text-foreground" />
              </button>
            </div>
            

          </div>
        )}
      </div>

      {/* Comments Panel */}
      <ReelCommentsPanel
        reelId={currentReel?._id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        reelOwner={currentReel?.user?._id}
      />

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes heart-burst {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          15% {
            transform: scale(1.2);
            opacity: 1;
          }
          30% {
            transform: scale(0.95);
          }
          45%,
          80% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        .animate-heart-burst {
          animation: heart-burst 1s ease-out forwards;
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
