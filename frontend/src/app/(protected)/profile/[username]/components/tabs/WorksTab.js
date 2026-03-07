"use client"
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MessageCircle, Film, Images, Camera } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

const WorksTab = ({user}) => {
  const [userImages, setUserImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const api = useApi();

  const fetchUserImages = async (pageNum = 1, isLoadMore = false) => {
    if (!user?._id) return;
    
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get(`/api/images/user/${user._id}?page=${pageNum}&limit=12`);
      
      if (isLoadMore) {
        setUserImages(prevImages => [...prevImages, ...response.data.data]);
      } else {
        setUserImages(response.data.data);
      }

      setHasMore(response.data.metadata.page < response.data.metadata.pages);
      setLoading(false);
      setLoadingMore(false);
    } catch (error) {
      console.error('Error fetching user images:', error);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUserImages(nextPage, true);
    }
  };

  useEffect(() => {
    if (user?._id) {
      setPage(1);
      fetchUserImages(1, false);
    }
  }, [user]);

  if(!user) return null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-1">
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className="aspect-square bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  // Empty state
  if (userImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
          <Camera className="w-10 h-10 text-foreground" strokeWidth={1} />
        </div>
        <h3 className="text-2xl md:text-3xl font-bold mb-2">Share Photos</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          When you share photos, they will appear on your profile.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Instagram-style 3-column grid */}
      <div className="grid grid-cols-3 gap-1">
        {userImages.map((image) => (
          <Link 
            key={image._id} 
            href={`/image/${image._id}`}
            className="relative aspect-square group bg-secondary overflow-hidden"
          >
            <Image
              src={image.imageUrl}
              alt={image.title || 'Post'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 33vw, 311px"
            />
            
            {/* Hover overlay with stats */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
              <div className="flex items-center gap-1.5 text-white font-semibold">
                <Heart className="w-5 h-5 fill-white" />
                <span>{image.likesCount || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white font-semibold">
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>{image.commentsCount || 0}</span>
              </div>
            </div>

            {/* Multi-image indicator */}
            {image.images && image.images.length > 1 && (
              <div className="absolute top-2 right-2">
                <Images className="w-5 h-5 text-white drop-shadow-lg" />
              </div>
            )}
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

export default WorksTab; 