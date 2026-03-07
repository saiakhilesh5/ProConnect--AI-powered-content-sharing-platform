"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { useLikesFavorites } from '@/context/LikesFavoritesContext';
import CategoryFilter from '@/components/features/CategoryFilter';
import ImageCard from '@/components/cards/ImageCard';
import ImageSkeleton from '@/components/skeletons/ImageSkeleton';
import { BookmarkX, Bookmark, Image as ImageIcon, Film, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Saved Reels Grid ────────────────────────────────────────────────────────
const SavedReelsTab = () => {
  const api = useApi();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchSavedReels = async (pageNum = 1, isLoadMore = false) => {
    isLoadMore ? setLoadingMore(true) : setLoading(true);
    try {
      const response = await api.get(`/api/reels/saved/my-reels?page=${pageNum}&limit=12`);
      const data = response.data.data;
      const reelsData = data?.reels || [];
      const pagination = data?.pagination || {};

      if (isLoadMore) {
        setReels(prev => [...prev, ...reelsData]);
      } else {
        setReels(reelsData);
      }
      setHasMore(pagination.page < pagination.pages);
    } catch (error) {
      console.error('Error fetching saved reels:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchSavedReels(1, false);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[4/5] bg-secondary animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-48 sm:h-64 bg-card border border-border rounded-xl mt-4"
      >
        <BookmarkX className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-base sm:text-lg mb-1 text-center px-4">No saved reels</p>
        <p className="text-muted-foreground/70 text-sm text-center px-4 mb-4">Reels you save will appear here</p>
        <Link href="/reels">
          <button className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300">
            Browse Reels
          </button>
        </Link>
      </motion.div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {reels.map((reel) => (
          <Link key={reel._id} href="/reels" className="relative aspect-[4/5] group bg-secondary overflow-hidden rounded-xl">
            {reel.thumbnailUrl ? (
              <Image
                src={reel.thumbnailUrl}
                alt={reel.caption || 'Reel'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 311px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
            )}
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="w-8 h-8 text-white" fill="white" />
            </div>
            {/* Caption on hover */}
            {reel.caption && (
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs line-clamp-2">{reel.caption}</p>
              </div>
            )}
          </Link>
        ))}
      </div>
      {hasMore && !loadingMore && (
        <div className="flex justify-center mt-6 mb-6">
          <button
            className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg text-sm font-medium transition-all"
            onClick={() => { const next = page + 1; setPage(next); fetchSavedReels(next, true); }}
          >
            Load More
          </button>
        </div>
      )}
      {loadingMore && (
        <div className="grid grid-cols-3 gap-2 mt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] bg-secondary animate-pulse rounded-xl" />
          ))}
        </div>
      )}
    </>
  );
};

// ─── Main Favorites Page ─────────────────────────────────────────────────────
const FavoritesPage = () => {
  const { user } = useAuth();
  const api = useApi();
  const { favoritedImages, toggleFavorite } = useLikesFavorites();

  const [activeTab, setActiveTab] = useState('posts');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadedImages, setLoadedImages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleRemoveFavorite = useCallback(async (imageId) => {
    const result = await toggleFavorite(imageId);
    if (result.success) {
      setImages(prev => prev.filter(img => img._id !== imageId));
    }
  }, [toggleFavorite]);

  const fetchFavoriteImages = async (pageNum = 1, isLoadMore = false) => {
    isLoadMore ? setLoadingMore(true) : (setLoading(true), setLoadedImages([]));

    try {
      const endpoint = selectedCategory && selectedCategory !== 'all'
        ? `/api/favorites?page=${pageNum}&limit=12&category=${selectedCategory}`
        : `/api/favorites?page=${pageNum}&limit=12`;

      const response = await api.get(endpoint);
      const formattedImages = response.data.data.map(item => ({
        ...item.image,
        user: item.user
      }));

      if (isLoadMore) {
        setImages(prev => [...prev, ...formattedImages]);
      } else {
        setImages(formattedImages);
      }

      setHasMore(response.data.metadata.page < response.data.metadata.pages);
      setTimeout(() => {
        setLoadedImages(prev => [...prev, ...formattedImages.map(img => img._id)]);
        setLoading(false);
        setLoadingMore(false);
      }, 300);
    } catch (error) {
      console.error('Error fetching favorite images:', error);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFavoriteImages(nextPage, true);
    }
  };

  useEffect(() => {
    setImages(prev => prev.filter(img => img._id && favoritedImages[img._id] !== false));
  }, [favoritedImages]);

  useEffect(() => {
    if (user && activeTab === 'posts') {
      setPage(1);
      fetchFavoriteImages(1, false);
    }
  }, [user, selectedCategory, activeTab]);

  return (
    <div className="p-2 sm:p-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="mb-3 sm:mb-6">
        <div className="flex items-center mb-2">
          <Bookmark className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-violet-500 flex-shrink-0" />
          <h1 className="text-lg sm:text-2xl font-bold truncate">Your Saved Collection</h1>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">All the posts and reels you&apos;ve saved</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-4">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'posts'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Posts
        </button>
        <button
          onClick={() => setActiveTab('reels')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'reels'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Film className="w-4 h-4" />
          Reels
        </button>
      </div>

      {/* Reels Tab */}
      {activeTab === 'reels' && <SavedReelsTab />}

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <>
          {/* Category filter */}
          <div className="grid grid-cols-1 mb-3">
            <CategoryFilter selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-4 mt-2 sm:mt-4 w-full">
              {Array.from({ length: 12 }).map((_, index) => (
                <ImageSkeleton key={`skeleton-${index}`} heightClass="aspect-[3/4]" />
              ))}
            </div>
          ) : images.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center h-48 sm:h-64 bg-card border border-border rounded-xl mt-2 sm:mt-4 mx-1 sm:mx-0"
            >
              <BookmarkX className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-muted-foreground text-base sm:text-lg mb-1 sm:mb-2 text-center px-4">No saved posts</p>
              <p className="text-muted-foreground/70 mb-4 sm:mb-6 text-sm sm:text-base text-center px-4">Posts you save will appear here</p>
              <Link href="/feed">
                <button className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40">
                  Discover Posts
                </button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-3 mt-2 sm:mt-4 w-full">
              <AnimatePresence>
                {images.map((image, index) => (
                  <motion.div
                    key={image._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    layout
                    className="w-full"
                  >
                    <ImageCard
                      image={image}
                      heightClass="aspect-[3/4]"
                      isLoaded={loadedImages.includes(image._id)}
                      index={index % 4}
                      columnIndex={Math.floor(index / 4)}
                      onRemoveFavorite={() => handleRemoveFavorite(image._id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {hasMore && !loading && images.length > 0 && (
            <div className="flex justify-center mt-6 sm:mt-8 mb-6 sm:mb-8 px-2 sm:px-0">
              <button
                className={`w-full max-w-xs sm:max-w-none px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-lg text-xs sm:text-sm font-medium transition-all duration-300 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 ${loadingMore ? 'opacity-70 cursor-wait' : ''}`}
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FavoritesPage;