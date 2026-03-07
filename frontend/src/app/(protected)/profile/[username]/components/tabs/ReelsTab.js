"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Heart, Film } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

const ReelsTab = ({ user }) => {
  const [userReels, setUserReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const api = useApi();

  const fetchUserReels = async (pageNum = 1, isLoadMore = false) => {
    if (!user?._id) return;
    
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get(`/api/reels/user/${user._id}?page=${pageNum}&limit=12`);
      const responseData = response.data.data;
      const reelsData = responseData?.reels || (Array.isArray(responseData) ? responseData : []);
      
      if (isLoadMore) {
        setUserReels(prevReels => [...prevReels, ...reelsData]);
      } else {
        setUserReels(reelsData);
      }

      const pagination = responseData?.pagination || response.data.metadata || {};
      setHasMore(pagination.page < pagination.pages);
      setLoading(false);
      setLoadingMore(false);
    } catch (error) {
      console.error('Error fetching user reels:', error);
      setUserReels([]);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUserReels(nextPage, true);
    }
  };

  useEffect(() => {
    if (user?._id) {
      setPage(1);
      fetchUserReels(1, false);
    }
  }, [user]);

  // Format view count
  const formatViews = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  };

  if (!user) return null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="aspect-[9/16] bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  // Empty state
  if (!Array.isArray(userReels) || userReels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
          <Film className="w-10 h-10 text-foreground" strokeWidth={1} />
        </div>
        <h3 className="text-2xl md:text-3xl font-bold mb-2">Share Reels</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          When you share reels, they will appear on your profile.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Instagram-style 3-column reels grid */}
      <div className="grid grid-cols-3 gap-2">
        {userReels.map((reel) => (
          <Link 
            key={reel._id} 
            href="/reels"
            className="relative aspect-[9/16] group bg-secondary overflow-hidden rounded-xl"
          >
            {/* Thumbnail */}
            {reel.thumbnailUrl ? (
              <Image
                src={reel.thumbnailUrl}
                alt={reel.caption || 'Reel'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 311px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary">
                <Play className="w-10 h-10 text-muted-foreground opacity-50" />
              </div>
            )}
            
            {/* Play icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-12 h-12 text-white/80 fill-white/80 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Views count at bottom */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-sm font-semibold drop-shadow-lg">
              <Play className="w-4 h-4 fill-white" />
              <span>{formatViews(reel.viewsCount)}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center py-8">
          <button 
            className={`text-primary text-sm font-semibold hover:text-primary/80 transition-colors ${loadingMore ? 'opacity-50' : ''}`}
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </>
  );
};

export default ReelsTab;
