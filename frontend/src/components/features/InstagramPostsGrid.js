"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Film, 
  Copy,
  Grid
} from 'lucide-react';

// Instagram-style Grid Post Item
const GridPostItem = ({ post, onPostClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Check if this is a reel/video
  const isReel = post.type === 'reel' || post.videoUrl;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative aspect-square cursor-pointer overflow-hidden bg-muted"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onPostClick?.(post)}
    >
      <Link href={`/image/${post._id}`}>
        {/* Image or Video Thumbnail */}
        <Image
          src={post.imageUrl || post.thumbnailUrl || '/images/placeholder.jpg'}
          alt={post.title || 'Post'}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 300px"
        />

        {/* Type indicators (Reel/Multiple) */}
        {isReel && (
          <div className="absolute top-2 right-2">
            <Film className="w-5 h-5 text-white drop-shadow-lg" fill="white" />
          </div>
        )}
        {post.isCarousel && (
          <div className="absolute top-2 right-2">
            <Copy className="w-5 h-5 text-white drop-shadow-lg" />
          </div>
        )}

        {/* Hover Overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 flex items-center justify-center gap-6"
            >
              <div className="flex items-center gap-1 text-white font-semibold">
                <Heart className="w-5 h-5" fill="white" />
                <span>{formatCount(post.likesCount || 0)}</span>
              </div>
              <div className="flex items-center gap-1 text-white font-semibold">
                <MessageCircle className="w-5 h-5" fill="white" />
                <span>{formatCount(post.commentsCount || 0)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Link>
    </motion.div>
  );
};

// Helper to format counts
const formatCount = (num) => {
  if (!num) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

// Instagram-style Posts Grid
const InstagramPostsGrid = ({ posts = [], loading = false, onPostClick }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-1 md:gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
          <Grid className="w-10 h-10 text-foreground" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">No Posts Yet</h3>
        <p className="text-muted-foreground">When you share photos, they will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 md:gap-4">
      {posts.map((post) => (
        <GridPostItem 
          key={post._id} 
          post={post} 
          onPostClick={onPostClick}
        />
      ))}
    </div>
  );
};

// Instagram-style Reels Grid (2 columns on mobile, 4 on desktop with 9:16 aspect)
const InstagramReelsGrid = ({ reels = [], loading = false, onReelClick }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[9/16] bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
          <Film className="w-10 h-10 text-foreground" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">No Reels Yet</h3>
        <p className="text-muted-foreground">When you share reels, they will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-4">
      {reels.map((reel) => (
        <motion.div
          key={reel._id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative aspect-[9/16] cursor-pointer overflow-hidden bg-muted rounded-lg group"
          onClick={() => onReelClick?.(reel)}
        >
          <Link href={`/reels/${reel._id}`}>
            <Image
              src={reel.thumbnailUrl || reel.imageUrl || '/images/placeholder.jpg'}
              alt={reel.caption || 'Reel'}
              fill
              className="object-cover"
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
            
            {/* Play icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Film className="w-6 h-6 text-white" />
              </div>
            </div>
            
            {/* Stats */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-sm">
              <Film className="w-4 h-4" />
              <span>{formatCount(reel.viewsCount || reel.likesCount || 0)}</span>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
};

// Instagram-style Saved/Collections Grid
const InstagramSavedGrid = ({ collections = [], loading = false, onCollectionClick }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">Only you can see what you've saved</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {collections.map((collection) => (
        <Link
          key={collection._id}
          href={`/collections/${collection._id}`}
          className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
        >
          {/* Collection Cover (grid of 4 images or single) */}
          {collection.coverImages?.length > 1 ? (
            <div className="grid grid-cols-2 w-full h-full gap-0.5">
              {collection.coverImages.slice(0, 4).map((img, idx) => (
                <div key={idx} className="relative">
                  <Image
                    src={img}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <Image
              src={collection.coverImage || collection.coverImages?.[0] || '/images/placeholder.jpg'}
              alt={collection.name}
              fill
              className="object-cover"
            />
          )}
          
          {/* Gradient & Name */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3">
            <p className="text-white font-semibold text-sm truncate">{collection.name}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export { InstagramPostsGrid, InstagramReelsGrid, InstagramSavedGrid, GridPostItem };
export default InstagramPostsGrid;
