"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { useAIFeatures } from '@/hooks/useAIFeatures';
import { 
  Search, 
  Heart, 
  MessageCircle, 
  Film, 
  Grid,
  Loader2,
  X,
  TrendingUp,
  Sparkles
} from 'lucide-react';

// Explore Grid Item Component
const ExploreGridItem = ({ item, size = 'normal' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isReel = item.type === 'reel' || item.videoUrl;

  const sizeClasses = {
    normal: 'aspect-square',
    large: 'aspect-square md:col-span-2 md:row-span-2'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`relative ${sizeClasses[size]} cursor-pointer overflow-hidden bg-muted`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={isReel ? `/reels/${item._id}` : `/image/${item._id}`}>
        <Image
          src={item.imageUrl || item.thumbnailUrl || '/images/placeholder.jpg'}
          alt={item.title || item.caption || 'Explore'}
          fill
          className="object-cover"
          sizes={size === 'large' ? '(max-width: 768px) 66vw, 33vw' : '(max-width: 768px) 33vw, 20vw'}
        />

        {/* Reel indicator */}
        {isReel && (
          <div className="absolute top-2 right-2">
            <Film className="w-5 h-5 text-white drop-shadow-lg" />
          </div>
        )}

        {/* Hover overlay */}
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
                <span>{formatCount(item.likesCount || 0)}</span>
              </div>
              <div className="flex items-center gap-1 text-white font-semibold">
                <MessageCircle className="w-5 h-5" fill="white" />
                <span>{formatCount(item.commentsCount || 0)}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Link>
    </motion.div>
  );
};

// Format count helper
const formatCount = (num) => {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
};

// Search Result Item
const SearchResultItem = ({ user, onClick }) => (
  <Link 
    href={`/profile/${user.username}`}
    onClick={onClick}
    className="flex items-center gap-3 p-3 hover:bg-secondary rounded-lg transition-colors"
  >
    <div className="w-11 h-11 rounded-full overflow-hidden bg-muted">
      <Image
        src={user.profilePicture || '/images/default-profile.jpg'}
        alt={user.username}
        width={44}
        height={44}
        className="w-full h-full object-cover"
      />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-foreground text-sm truncate">{user.username}</p>
      <p className="text-xs text-muted-foreground truncate">{user.fullName || user.bio}</p>
    </div>
  </Link>
);

// Category Pills
const CategoryPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
      active 
        ? 'bg-foreground text-background'
        : 'bg-secondary text-foreground hover:bg-secondary/80'
    }`}
  >
    {label}
  </button>
);

const ExplorePage = () => {
  const api = useApi();
  const { getSmartFeed } = useAIFeatures();
  const searchInputRef = useRef(null);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'for-you'

  // Smart feed state
  const [smartFeedPosts, setSmartFeedPosts] = useState([]);
  const [loadingSmartFeed, setLoadingSmartFeed] = useState(false);
  const [smartFeedLoaded, setSmartFeedLoaded] = useState(false);
  
  const categories = [
    'all', 'art', 'photography', 'nature', 'architecture', 
    'travel', 'food', 'fashion', 'technology', 'sports'
  ];

  // Fetch explore posts
  const fetchPosts = useCallback(async (pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const categoryParam = selectedCategory !== 'all' ? `&category=${selectedCategory}` : '';
      const response = await api.get(`/api/images/public?page=${pageNum}&limit=21${categoryParam}`);
      const newPosts = response.data.data;

      if (isLoadMore) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setHasMore(response.data.metadata.page < response.data.metadata.pages);
    } catch (error) {
      console.error('Error fetching explore posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [api, selectedCategory]);

  // Fetch AI smart feed
  const fetchSmartFeed = useCallback(async () => {
    if (smartFeedLoaded || loadingSmartFeed) return;
    setLoadingSmartFeed(true);
    try {
      const result = await getSmartFeed({ page: 1, limit: 30 });
      setSmartFeedPosts(result?.images || []);
      setSmartFeedLoaded(true);
    } catch (error) {
      console.error('Error fetching smart feed:', error);
    } finally {
      setLoadingSmartFeed(false);
    }
  }, [getSmartFeed, smartFeedLoaded, loadingSmartFeed]);

  // When For You tab is activated, load smart feed
  useEffect(() => {
    if (activeTab === 'for-you' && !smartFeedLoaded) {
      fetchSmartFeed();
    }
  }, [activeTab, smartFeedLoaded, fetchSmartFeed]);

  // Search users
  const searchUsers = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get(`/api/users/search?query=${encodeURIComponent(query)}&limit=10`);
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [api]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  // Fetch posts on mount and category change
  useEffect(() => {
    setPage(1);
    fetchPosts(1);
  }, [selectedCategory]);

  // Load more on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= 
        document.documentElement.offsetHeight - 1000 &&
        !loadingMore &&
        hasMore
      ) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPosts(nextPage, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, page, fetchPosts]);

  // Create Instagram-style grid pattern
  const renderGrid = () => {
    const items = [];
    let postIndex = 0;

    // Pattern: every 5th cell starting from position 0, 15, 30 etc is large
    posts.forEach((post, index) => {
      // Make every 10th item large (starting from 0)
      const isLarge = index % 10 === 0 && index !== 0;
      
      items.push(
        <ExploreGridItem 
          key={post._id} 
          item={post} 
          size={isLarge ? 'large' : 'normal'}
        />
      );
    });

    return items;
  };

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      {/* Search Bar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-[935px] mx-auto px-4 py-3">
          <div className="relative">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-secondary border border-border focus-within:ring-1 focus-within:ring-primary/50 w-full">
              <Search className="text-muted-foreground w-4 h-4 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Search"
                className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
                style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="p-1 hover:bg-muted rounded-full flex-shrink-0"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showSearchResults && searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl max-h-[60vh] overflow-y-auto z-30"
                >
                  {isSearching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((user) => (
                        <SearchResultItem 
                          key={user._id} 
                          user={user}
                          onClick={() => setShowSearchResults(false)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      No results found
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Category filters + For You tab */}
        <div className="max-w-[935px] mx-auto px-4 pb-3">
          <div className="flex items-center gap-2">
            {/* For You / Explore toggle */}
            <button
              onClick={() => setActiveTab('explore')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === 'explore'
                  ? 'bg-foreground text-background'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Explore
            </button>
            <button
              onClick={() => setActiveTab('for-you')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === 'for-you'
                  ? 'bg-violet-600 text-white'
                  : 'bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              For You
            </button>

            {/* Category pills only in explore tab */}
            {activeTab === 'explore' && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {categories.map((category) => (
                  <CategoryPill
                    key={category}
                    label={category.charAt(0).toUpperCase() + category.slice(1)}
                    active={selectedCategory === category}
                    onClick={() => setSelectedCategory(category)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close search */}
      {showSearchResults && searchQuery && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowSearchResults(false)}
        />
      )}

      {/* Explore Grid */}
      <div className="max-w-[935px] mx-auto px-0 md:px-4 pt-4">
        {/* Regular Explore Tab */}
        {activeTab === 'explore' && (
          loading ? (
            <div className="grid grid-cols-3 gap-1 md:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div 
                  key={i} 
                  className="aspect-square bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : posts.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-1 md:gap-4">
                {renderGrid()}
              </div>

              {/* Loading more indicator */}
              {loadingMore && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
                <Grid className="w-10 h-10 text-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Nothing to Explore</h3>
              <p className="text-muted-foreground">Check back later for new content.</p>
            </div>
          )
        )}

        {/* For You Smart Feed Tab */}
        {activeTab === 'for-you' && (
          <div>
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 px-2 md:px-0">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <div>
                <h2 className="font-semibold text-foreground">Personalized For You</h2>
                <p className="text-xs text-muted-foreground">AI-ranked content based on your interests</p>
              </div>
            </div>

            {loadingSmartFeed ? (
              <div className="grid grid-cols-3 gap-1 md:gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : smartFeedPosts.length > 0 ? (
              <div className="grid grid-cols-3 gap-1 md:gap-4">
                {smartFeedPosts.map((post, index) => (
                  <ExploreGridItem
                    key={post._id}
                    item={post}
                    size={index % 10 === 0 && index !== 0 ? 'large' : 'normal'}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-violet-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Building Your Feed</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Like and save more posts so AI can personalize your feed.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
