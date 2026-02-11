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
  User,
  Trash2,
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
  const router = useRouter();
  const containerRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const videoRefs = useRef({});

  // Fetch reels on mount
  useEffect(() => {
    fetchReels(feedType, 1);
  }, [feedType]);

  // Handle scroll/swipe navigation
  const handleScroll = useCallback((e) => {
    e.preventDefault();
    
    if (e.deltaY > 0) {
      nextReel();
    } else if (e.deltaY < 0) {
      prevReel();
    }
  }, [nextReel, prevReel]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown" || e.key === "j") {
        nextReel();
      } else if (e.key === "ArrowUp" || e.key === "k") {
        prevReel();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.key === "m") {
        setIsMuted(!isMuted);
      } else if (e.key === "l") {
        handleLike();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextReel, prevReel, isPlaying, isMuted]);

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
  }, [currentReelIndex, isPlaying]);

  const handleLike = async () => {
    if (!currentReel) return;
    try {
      await toggleLikeReel(currentReel._id);
    } catch (error) {
      toast.error("Failed to like reel");
    }
  };

  const handleSave = async () => {
    if (!currentReel) return;
    try {
      await toggleSaveReel(currentReel._id);
      toast.success(currentReel.isSaved ? "Removed from saved" : "Saved!");
    } catch (error) {
      toast.error("Failed to save reel");
    }
  };

  const handleShare = async () => {
    if (!currentReel) return;
    
    try {
      await navigator.share({
        title: currentReel.caption,
        url: `${window.location.origin}/reels/${currentReel._id}`,
      });
    } catch (error) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/reels/${currentReel._id}`);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleDelete = async () => {
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
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + "M";
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + "K";
    }
    return count;
  };

  if (loading && reels.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!loading && reels.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black text-white">
        <p className="text-xl mb-4">No reels yet</p>
        <p className="text-zinc-400 mb-6">Be the first to upload a reel!</p>
        <Link href="/upload-reel">
          <Button className="bg-violet-600 hover:bg-violet-700">
            Upload Reel
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black overflow-hidden">
      {/* Feed Type Tabs */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 flex gap-4">
        <button
          onClick={() => setFeedType("for-you")}
          className={`px-4 py-2 rounded-full font-medium transition-all ${
            feedType === "for-you"
              ? "bg-white text-black"
              : "bg-white/20 text-white hover:bg-white/30"
          }`}
        >
          For You
        </button>
        <button
          onClick={() => setFeedType("following")}
          className={`px-4 py-2 rounded-full font-medium transition-all ${
            feedType === "following"
              ? "bg-white text-black"
              : "bg-white/20 text-white hover:bg-white/30"
          }`}
        >
          Following
        </button>
      </div>

      {/* Navigation Buttons */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-50 flex flex-col gap-2">
        <button
          onClick={prevReel}
          disabled={currentReelIndex === 0}
          className="p-2 bg-white/20 rounded-full hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronUp className="h-6 w-6 text-white" />
        </button>
        <button
          onClick={nextReel}
          disabled={currentReelIndex >= reels.length - 1 && !hasMore}
          className="p-2 bg-white/20 rounded-full hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronDown className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Reels Container */}
      <div
        ref={containerRef}
        onWheel={handleScroll}
        className="h-full w-full flex items-center justify-center"
      >
        {currentReel && (
          <div className="relative h-full w-full max-w-lg mx-auto">
            {/* Video */}
            <video
              ref={(el) => (videoRefs.current[currentReelIndex] = el)}
              src={currentReel.videoUrl}
              poster={currentReel.thumbnailUrl}
              className="h-full w-full object-cover"
              loop
              muted={isMuted}
              playsInline
              onClick={() => setIsPlaying(!isPlaying)}
            />

            {/* Play/Pause Overlay */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="h-20 w-20 text-white" />
              </div>
            )}

            {/* Video Controls */}
            <div className="absolute bottom-4 left-4 right-16 text-white">
              {/* User Info */}
              <Link
                href={`/profile/${currentReel.user?.username}`}
                className="flex items-center gap-3 mb-3"
              >
                <img
                  src={currentReel.user?.profilePicture || "/images/default-profile.jpg"}
                  alt={currentReel.user?.fullName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white"
                />
                <div>
                  <p className="font-semibold flex items-center gap-1">
                    {currentReel.user?.fullName}
                    {currentReel.user?.isVerified && (
                      <span className="text-blue-400">✓</span>
                    )}
                  </p>
                  <p className="text-sm text-white/80">@{currentReel.user?.username}</p>
                </div>
              </Link>

              {/* Caption */}
              <p className="text-sm mb-3 line-clamp-2">{currentReel.caption}</p>

              {/* Tags */}
              {currentReel.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {currentReel.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs bg-white/20 px-2 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Music */}
              {currentReel.music?.name && (
                <div className="flex items-center gap-2 text-sm">
                  <Music className="h-4 w-4" />
                  <span className="truncate">
                    {currentReel.music.name} - {currentReel.music.artist}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="absolute right-4 bottom-20 flex flex-col items-center gap-6">
              {/* Like */}
              <button onClick={handleLike} className="flex flex-col items-center">
                <div
                  className={`p-3 rounded-full ${
                    currentReel.isLiked ? "bg-red-500" : "bg-white/20"
                  }`}
                >
                  <Heart
                    className={`h-6 w-6 ${
                      currentReel.isLiked ? "text-white fill-white" : "text-white"
                    }`}
                  />
                </div>
                <span className="text-white text-xs mt-1">
                  {formatCount(currentReel.likesCount)}
                </span>
              </button>

              {/* Comments */}
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex flex-col items-center"
              >
                <div className="p-3 bg-white/20 rounded-full">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <span className="text-white text-xs mt-1">
                  {formatCount(currentReel.commentsCount)}
                </span>
              </button>

              {/* Save */}
              <button onClick={handleSave} className="flex flex-col items-center">
                <div
                  className={`p-3 rounded-full ${
                    currentReel.isSaved ? "bg-yellow-500" : "bg-white/20"
                  }`}
                >
                  <Bookmark
                    className={`h-6 w-6 ${
                      currentReel.isSaved ? "text-white fill-white" : "text-white"
                    }`}
                  />
                </div>
                <span className="text-white text-xs mt-1">
                  {formatCount(currentReel.savesCount)}
                </span>
              </button>

              {/* Share */}
              <button onClick={handleShare} className="flex flex-col items-center">
                <div className="p-3 bg-white/20 rounded-full">
                  <Share2 className="h-6 w-6 text-white" />
                </div>
                <span className="text-white text-xs mt-1">Share</span>
              </button>

              {/* Mute/Unmute */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-3 bg-white/20 rounded-full"
              >
                {isMuted ? (
                  <VolumeX className="h-6 w-6 text-white" />
                ) : (
                  <Volume2 className="h-6 w-6 text-white" />
                )}
              </button>

              {/* More Options */}
              {currentReel.user?._id === user?._id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-3 bg-white/20 rounded-full">
                      <MoreVertical className="h-6 w-6 text-white" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-red-500 hover:bg-zinc-800"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Progress Indicator */}
            <div className="absolute top-16 left-4 right-4 flex gap-1">
              {reels.slice(0, Math.min(10, reels.length)).map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded-full ${
                    index === currentReelIndex
                      ? "bg-white"
                      : index < currentReelIndex
                      ? "bg-white/60"
                      : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <Link
        href="/upload-reel"
        className="fixed bottom-6 right-6 z-50 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-full font-medium shadow-lg flex items-center gap-2 transition-transform hover:scale-105"
      >
        <span>+</span> Create
      </Link>
    </div>
  );
}
