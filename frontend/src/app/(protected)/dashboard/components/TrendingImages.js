"use client"
import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useApi } from "@/hooks/useApi";
import { useSession } from "next-auth/react";
import ImageCard from '@/components/cards/ImageCard';
import ImageSkeleton from '@/components/skeletons/ImageSkeleton';

const TrendingImages = ({ category }) => {
  const [trendingImages, setTrendingImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState([]);

  const api = useApi();
  const { data: session, status } = useSession();
  
  // Check if we have a valid session with token
  const hasValidSession = status === "authenticated" && session?.backendToken;

  // Fetch images from API
  const fetchImages = async () => {
    if (!hasValidSession) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Add category to the API request if it's not 'all'
      const endpoint = category && category !== 'all'
        ? `/api/images/discover/trending?category=${category}`
        : `/api/images/discover/trending`;
        
      const response = await api.get(endpoint);
      setTrendingImages(response.data.data);
      
      // Set a small delay before marking images as loaded (for animation)
      setTimeout(() => {
        setLoadedImages(response.data.data.map(img => img._id));
      }, 300);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching images:', error);
      setLoading(false);
    }
  };

  // Re-fetch when category changes or session becomes valid
  useEffect(() => {
    if (hasValidSession) {
      fetchImages();
    }
  }, [category, hasValidSession]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg sm:text-xl font-bold">Trending Images</h3>
        <Link href={"/feed"} className="text-xs sm:text-sm text-violet-400 hover:text-violet-300 flex items-center">
          See all
          <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <ImageSkeleton key={`skeleton-${index}`} heightClass="aspect-[3/4]" />
          ))}
        </div>
      ) : trendingImages.length < 1 ? (
        <div className="flex justify-center items-center h-48 sm:h-64 bg-card border border-border rounded-xl">
          <p className="text-muted-foreground text-sm sm:text-base text-center px-4">No images available for this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {trendingImages.slice(0,6).map((image, index) => (
            <ImageCard
              key={image._id}
              image={image}
              heightClass="aspect-[3/4]"
              isLoaded={loadedImages.includes(image._id)}
              index={index % 3}
              columnIndex={Math.floor(index / 3)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TrendingImages; 