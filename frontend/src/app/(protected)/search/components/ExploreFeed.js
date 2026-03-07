"use client"
import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Play, Film, Grid } from 'lucide-react';

const ExploreFeed = ({ 
  images = [], 
  reels = [], 
  loading = false,
  onLoadMore,
  hasMore = false
}) => {
  const [hoveredReel, setHoveredReel] = useState(null);
  const videoRefs = useRef({});

  // Create Instagram-style grid layout with reels integrated
  const createGridLayout = () => {
    const gridItems = [];
    let imageIdx = 0;
    let reelIdx = 0;
    
    // Pattern: Mix images and reels in a visually appealing way
    // Reels will span 2 rows (like Instagram)
    while (imageIdx < images.length || reelIdx < reels.length) {
      // Add 2 images
      for (let i = 0; i < 2 && imageIdx < images.length; i++) {
        gridItems.push({
          type: 'image',
          data: images[imageIdx],
          id: `image-${images[imageIdx]._id || imageIdx}`
        });
        imageIdx++;
      }
      
      // Add 1 reel (spans 2 rows)
      if (reelIdx < reels.length) {
        gridItems.push({
          type: 'reel',
          data: reels[reelIdx],
          id: `reel-${reels[reelIdx]._id || reelIdx}`
        });
        reelIdx++;
      }
      
      // Add 4 more images
      for (let i = 0; i < 4 && imageIdx < images.length; i++) {
        gridItems.push({
          type: 'image',
          data: images[imageIdx],
          id: `image-${images[imageIdx]._id || imageIdx}`
        });
        imageIdx++;
      }
    }

    return gridItems;
  };

  const gridItems = createGridLayout();

  // Handle video hover
  const handleReelHover = (reelId, isHovering) => {
    setHoveredReel(isHovering ? reelId : null);
    const video = videoRefs.current[reelId];
    if (video) {
      if (isHovering) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    }
  };

  // Format counts (1000 -> 1K)
  const formatCount = (count) => {
    if (!count) return '0';
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
  };

  if (loading && gridItems.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {Array(12).fill(0).map((_, idx) => {
          const isReelPosition = idx === 2 || idx === 9;
          return (
            <div 
              key={idx} 
              className={`bg-secondary/50 animate-pulse ${
                isReelPosition ? 'row-span-2 aspect-[9/16]' : 'aspect-square'
              }`}
            />
          );
        })}
      </div>
    );
  }

  if (gridItems.length === 0) {
    return (
      <div className="text-center py-20">
        <Grid className="w-20 h-20 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Explore Content</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Discover photos and reels from creators you might like
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Instagram-style Explore Grid */}
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {gridItems.map((item, idx) => {
          if (item.type === 'reel') {
            return (
              <Link
                key={item.id}
                href={`/reels?id=${item.data._id}`}
                className="relative row-span-2 bg-black overflow-hidden group cursor-pointer"
                onMouseEnter={() => handleReelHover(item.id, true)}
                onMouseLeave={() => handleReelHover(item.id, false)}
              >
                <div className="w-full h-full aspect-[9/16]">
                  {/* Video */}
                  {item.data.videoUrl ? (
                    <video
                      ref={el => videoRefs.current[item.id] = el}
                      src={item.data.videoUrl}
                      poster={item.data.thumbnailUrl}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                    />
                  ) : item.data.thumbnailUrl ? (
                    <img
                      src={item.data.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                      <Film className="w-12 h-12 text-zinc-700" />
                    </div>
                  )}
                  
                  {/* Reel indicator - top right */}
                  <div className="absolute top-3 right-3">
                    <Play className="w-5 h-5 text-white fill-white drop-shadow-lg" />
                  </div>

                  {/* Views/plays count - bottom left */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white text-sm font-semibold drop-shadow-lg">
                    <Play className="w-4 h-4 fill-white" />
                    <span>{formatCount(item.data.viewsCount || item.data.plays || 0)}</span>
                  </div>
                  
                  {/* Hover overlay with stats */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className="flex items-center gap-8">
                      <div className="flex items-center gap-2 text-white font-bold">
                        <Heart className="w-7 h-7 fill-white" />
                        <span className="text-lg">{formatCount(item.data.likesCount || 0)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white font-bold">
                        <MessageCircle className="w-7 h-7 fill-white" />
                        <span className="text-lg">{formatCount(item.data.commentsCount || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          }
          
          // Regular image post
          return (
            <Link
              key={item.id}
              href={`/images/${item.data._id}`}
              className="relative aspect-square bg-secondary overflow-hidden group cursor-pointer"
            >
              {item.data.imageUrl ? (
                <img
                  src={item.data.imageUrl}
                  alt={item.data.title || ''}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-secondary" />
              )}
              
              {/* Hover overlay with stats */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Heart className="w-6 h-6 fill-white" />
                    <span>{formatCount(item.data.likesCount || 0)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white font-bold">
                    <MessageCircle className="w-6 h-6 fill-white" />
                    <span>{formatCount(item.data.commentsCount || 0)}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center py-8">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      {/* Loading more indicator */}
      {loading && gridItems.length > 0 && (
        <div className="grid grid-cols-3 gap-0.5 sm:gap-1 mt-1">
          {Array(6).fill(0).map((_, idx) => (
            <div key={`loading-${idx}`} className="aspect-square bg-secondary/50 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
};

export default ExploreFeed;
