"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/context/AuthContext';
import { useFollow } from '@/context/FollowContext';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, ArrowLeft, Loader, Heart, MessageCircle, 
  Play, Film, Grid, Clock, TrendingUp, User, Images
} from 'lucide-react';

const SearchPage = () => {
  const api = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { followUser, unfollowUser, checkFollowStatus } = useFollow();

  const queryParam = searchParams.get('q') || '';

  // Search state
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState({ images: [], users: [], tags: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState('top');

  // Explore state  
  const [exploreItems, setExploreItems] = useState([]);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [explorePage, setExplorePage] = useState(1);
  const [hasMoreExplore, setHasMoreExplore] = useState(true);

  // Recent & Trending
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);

  // Follow state
  const [followingStatus, setFollowingStatus] = useState({});
  const [followLoading, setFollowLoading] = useState(false);

  // Refs
  const searchInputRef = useRef(null);
  const videoRefs = useRef({});
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);
  const debounceRef = useRef(null);

  // ====== LOAD EXPLORE CONTENT ======
  const fetchExploreContent = useCallback(async (page = 1) => {
    if (page === 1) setExploreLoading(true);
    try {
      const [imagesRes, reelsRes] = await Promise.all([
        api.get(`/api/images/trending?page=${page}&limit=18`).catch(() => ({ data: { data: [] } })),
        api.get(`/api/reels/trending?page=${page}&limit=6`).catch(() => ({ data: { data: [] } }))
      ]);

      const images = (imagesRes.data?.data || []).map(img => ({ ...img, itemType: 'image' }));
      const reels = (reelsRes.data?.data || []).map(reel => ({ ...reel, itemType: 'reel' }));

      // Interleave: pattern of 2 images, 1 reel, 3 images, repeat
      const mixed = [];
      let imgIdx = 0, reelIdx = 0;
      while (imgIdx < images.length || reelIdx < reels.length) {
        for (let i = 0; i < 2 && imgIdx < images.length; i++) mixed.push(images[imgIdx++]);
        if (reelIdx < reels.length) mixed.push(reels[reelIdx++]);
        for (let i = 0; i < 3 && imgIdx < images.length; i++) mixed.push(images[imgIdx++]);
      }

      if (page === 1) {
        setExploreItems(mixed);
      } else {
        setExploreItems(prev => [...prev, ...mixed]);
      }
      setHasMoreExplore(images.length === 18 || reels.length === 6);
    } catch (err) {
      console.error('Error fetching explore:', err);
    } finally {
      setExploreLoading(false);
    }
  }, [api]);

  // Initial load
  useEffect(() => {
    if (!queryParam) {
      fetchExploreContent(1);
    }
    loadRecentSearches();
    loadTrendingSearches();
  }, []);

  // If URL has query, perform search
  useEffect(() => {
    if (queryParam) {
      setSearchQuery(queryParam);
      performSearch(queryParam);
    }
  }, [queryParam]);

  // Infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const ref = loadMoreRef.current;
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMoreExplore && !exploreLoading && !searchQuery) {
          setExplorePage(prev => {
            const nextPage = prev + 1;
            fetchExploreContent(nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );
    observerRef.current.observe(ref);
    return () => observerRef.current?.disconnect();
  }, [hasMoreExplore, exploreLoading, searchQuery, fetchExploreContent]);

  // ====== RECENT & TRENDING ======
  const loadRecentSearches = () => {
    try {
      const recent = JSON.parse(localStorage.getItem('proconnect_recent_searches') || '[]');
      setRecentSearches(recent.slice(0, 8));
    } catch {}
  };

  const loadTrendingSearches = async () => {
    try {
      const res = await api.get('/api/images/trending-search?limit=6');
      setTrendingSearches(res.data?.data || []);
    } catch {}
  };

  const saveSearch = (query) => {
    try {
      const recent = JSON.parse(localStorage.getItem('proconnect_recent_searches') || '[]');
      const updated = [query, ...recent.filter(s => s !== query)].slice(0, 15);
      localStorage.setItem('proconnect_recent_searches', JSON.stringify(updated));
      setRecentSearches(updated.slice(0, 8));
    } catch {}
  };

  const removeRecentSearch = (query) => {
    try {
      const recent = JSON.parse(localStorage.getItem('proconnect_recent_searches') || '[]');
      const updated = recent.filter(s => s !== query);
      localStorage.setItem('proconnect_recent_searches', JSON.stringify(updated));
      setRecentSearches(updated.slice(0, 8));
    } catch {}
  };

  const clearAllRecent = () => {
    localStorage.removeItem('proconnect_recent_searches');
    setRecentSearches([]);
  };

  // ====== SEARCH ======
  const performSearch = async (query) => {
    if (!query.trim()) return;
    setSearchLoading(true);
    try {
      const [imagesRes, usersRes, tagsRes] = await Promise.allSettled([
        api.get(`/api/images/search?q=${query}&limit=20`),
        api.get(`/api/users/search?query=${query}&limit=15`),
        api.get(`/api/images/tags/search?query=${query}&limit=10`)
      ]);

      const imgs = imagesRes.status === 'fulfilled' ? (imagesRes.value.data?.data || []) : [];
      const users = usersRes.status === 'fulfilled' ? (usersRes.value.data?.data || []) : [];
      const tags = tagsRes.status === 'fulfilled' ? (tagsRes.value.data?.data || []) : [];

      setSearchResults({ images: imgs, users, tags });

      // Check follow status
      if (user && users.length) {
        const status = { ...followingStatus };
        for (const u of users) {
          if (status[u._id] === undefined) {
            try {
              status[u._id] = await checkFollowStatus(u._id);
            } catch { status[u._id] = false; }
          }
        }
        setFollowingStatus(status);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Live search as user types (debounced)
  const handleSearchInput = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        performSearch(val);
      }, 400);
    } else {
      setSearchResults({ images: [], users: [], tags: [] });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveSearch(searchQuery.trim());
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`, { scroll: false });
      performSearch(searchQuery.trim());
      searchInputRef.current?.blur();
      setIsSearchFocused(false);
    }
  };

  const handleSearchItemClick = (query) => {
    setSearchQuery(query);
    saveSearch(query);
    router.push(`/search?q=${encodeURIComponent(query)}`, { scroll: false });
    performSearch(query);
    setIsSearchFocused(false);
  };

  const handleBack = () => {
    if (searchQuery || isSearchFocused) {
      setSearchQuery('');
      setIsSearchFocused(false);
      setSearchResults({ images: [], users: [], tags: [] });
      router.push('/search', { scroll: false });
    } else {
      router.back();
    }
  };

  // ====== FOLLOW TOGGLE ======
  const handleFollowToggle = async (userId) => {
    if (!user) return;
    setFollowLoading(true);
    const current = followingStatus[userId];
    setFollowingStatus(prev => ({ ...prev, [userId]: !current }));
    try {
      if (current) await unfollowUser(userId);
      else await followUser(userId);
    } catch {
      setFollowingStatus(prev => ({ ...prev, [userId]: current }));
    } finally {
      setFollowLoading(false);
    }
  };

  // ====== VIDEO HOVER ======
  const handleVideoHover = (id, hovering) => {
    const video = videoRefs.current[id];
    if (video) {
      if (hovering) video.play().catch(() => {});
      else { video.pause(); video.currentTime = 0; }
    }
  };

  // Format number
  const fmt = (n) => {
    if (!n) return '0';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toString();
  };

  const hasResults = searchResults.images.length || searchResults.users.length || searchResults.tags.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ====== SEARCH BAR (Instagram-style) ====== */}
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2 max-w-screen-xl mx-auto">
          {/* Back arrow (shown when searching) */}
          {(isSearchFocused || searchQuery) && (
            <button
              onClick={handleBack}
              className="p-1.5 -ml-1 text-foreground flex-shrink-0"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          
          {/* Search input */}
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <div className={`flex items-center bg-secondary rounded-lg pl-3 pr-2 transition-all duration-200 ${
              isSearchFocused ? 'ring-1 ring-primary' : ''
            }`}>
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchInput}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search"
                className="flex-1 h-9 ml-2 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
                style={{ border: 'none', boxShadow: 'none' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchResults({ images: [], users: [], tags: [] }); searchInputRef.current?.focus(); }}
                  className="p-0.5 bg-muted rounded-full flex-shrink-0"
                >
                  <X className="w-3 h-3 text-background" />
                </button>
              )}
            </div>
          </form>

          {/* Cancel button on mobile when focused */}
          {isSearchFocused && (
            <button
              onClick={() => { setIsSearchFocused(false); searchInputRef.current?.blur(); }}
              className="text-primary text-sm font-medium flex-shrink-0 md:hidden"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ====== SEARCH OVERLAY (recent/trending/live results) ====== */}
      <AnimatePresence>
        {isSearchFocused && !queryParam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 top-[53px] lg:left-20 xl:left-64 z-40 bg-background overflow-y-auto pb-20"
          >
            <div className="max-w-screen-xl mx-auto px-4 py-3">
              {/* Live search results */}
              {searchQuery.trim().length >= 2 && (searchResults.users.length > 0 || searchResults.tags.length > 0) ? (
                <div>
                  {/* Users */}
                  {searchResults.users.slice(0, 5).map(u => (
                    <button
                      key={u._id}
                      onClick={() => router.push(`/profile/${u.username}`)}
                      className="flex items-center gap-3 w-full px-2 py-2.5 bg-secondary-hover rounded-lg transition-colors"
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                        <Image
                          src={u.profilePicture || '/images/default-profile.jpg'}
                          alt={u.username}
                          width={44}
                          height={44}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{u.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.fullName || u.name || ''}</p>
                      </div>
                    </button>
                  ))}
                  {/* Tags */}
                  {searchResults.tags.slice(0, 5).map(tag => (
                    <button
                      key={tag.name || tag._id}
                      onClick={() => handleSearchItemClick(`#${tag.name}`)}
                      className="flex items-center gap-3 w-full px-2 py-2.5 bg-secondary-hover rounded-lg transition-colors"
                    >
                      <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-muted-foreground">#</span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-foreground">#{tag.name}</p>
                        <p className="text-xs text-muted-foreground">{fmt(tag.count)} posts</p>
                      </div>
                    </button>
                  ))}

                  {/* Search for query */}
                  <button
                    onClick={() => handleSearchItemClick(searchQuery)}
                    className="flex items-center gap-3 w-full px-2 py-2.5 bg-secondary-hover rounded-lg transition-colors mt-1"
                  >
                    <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Search className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-foreground">Search for &quot;{searchQuery}&quot;</p>
                  </button>
                </div>
              ) : (
                <>
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <h3 className="text-base font-semibold text-foreground">Recent</h3>
                        <button onClick={clearAllRecent} className="text-primary text-sm font-medium">
                          Clear all
                        </button>
                      </div>
                      {recentSearches.map((q, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-2 py-2 bg-secondary-hover rounded-lg transition-colors">
                          <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <Clock className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <button
                            onClick={() => handleSearchItemClick(q)}
                            className="flex-1 text-left text-sm text-foreground truncate"
                          >
                            {q}
                          </button>
                          <button
                            onClick={() => removeRecentSearch(q)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Trending */}
                  {trendingSearches.length > 0 && (
                    <div>
                      <h3 className="text-base font-semibold text-foreground px-1 mb-2">Trending</h3>
                      {trendingSearches.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSearchItemClick(typeof item === 'string' ? item : item.query || item.name)}
                          className="flex items-center gap-3 w-full px-2 py-2 bg-secondary-hover rounded-lg transition-colors"
                        >
                          <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-foreground">{typeof item === 'string' ? item : item.query || item.name}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== SEARCH RESULTS (when query submitted via URL) ====== */}
      {queryParam && (
        <div className="max-w-screen-xl mx-auto">
          {/* Tab bar */}
          <div className="flex border-b border-border sticky top-[53px] z-30 bg-background">
            {[
              { key: 'top', label: 'Top' },
              { key: 'accounts', label: 'Accounts' },
              { key: 'images', label: 'Images' },
              { key: 'tags', label: 'Tags' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveResultTab(tab.key)}
                className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-colors ${
                  activeResultTab === tab.key
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {searchLoading ? (
            <div className="flex justify-center py-20">
              <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="pb-20">
              {/* TOP results */}
              {activeResultTab === 'top' && (
                <div>
                  {searchResults.users.slice(0, 3).map(u => (
                    <Link
                      key={u._id}
                      href={`/profile/${u.username}`}
                      className="flex items-center gap-3 px-4 py-3 bg-secondary-hover transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                        <Image
                          src={u.profilePicture || '/images/default-profile.jpg'}
                          alt={u.username}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{u.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.fullName || u.name || ''} {u.followersCount ? `\u2022 ${fmt(u.followersCount)} followers` : ''}</p>
                      </div>
                      {user?._id !== u._id && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFollowToggle(u._id); }}
                          className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                            followingStatus[u._id]
                              ? 'bg-secondary text-foreground'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          {followingStatus[u._id] ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </Link>
                  ))}

                  {searchResults.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-0.5 mt-2">
                      {searchResults.images.map(img => (
                        <Link
                          key={img._id}
                          href={`/image/${img._id}`}
                          className="relative aspect-square bg-secondary overflow-hidden group"
                        >
                          <Image
                            src={img.imageUrl || img.thumbnail || '/images/placeholder.jpg'}
                            alt={img.title || ''}
                            fill
                            className="object-cover"
                            sizes="33vw"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <span className="flex items-center gap-1 text-white font-bold text-sm">
                              <Heart className="w-5 h-5 fill-white" /> {fmt(img.likesCount)}
                            </span>
                            <span className="flex items-center gap-1 text-white font-bold text-sm">
                              <MessageCircle className="w-5 h-5 fill-white" /> {fmt(img.commentsCount)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {!searchResults.users.length && !searchResults.images.length && (
                    <div className="text-center py-20 text-muted-foreground">No results found for &quot;{queryParam}&quot;</div>
                  )}
                </div>
              )}

              {/* ACCOUNTS tab */}
              {activeResultTab === 'accounts' && (
                <div>
                  {searchResults.users.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">No accounts found</div>
                  ) : (
                    searchResults.users.map(u => (
                      <Link
                        key={u._id}
                        href={`/profile/${u.username}`}
                        className="flex items-center gap-3 px-4 py-3 bg-secondary-hover transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                          <Image
                            src={u.profilePicture || '/images/default-profile.jpg'}
                            alt={u.username}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{u.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.fullName || u.name || ''}</p>
                        </div>
                        {user?._id !== u._id && (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFollowToggle(u._id); }}
                            className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                              followingStatus[u._id]
                                ? 'bg-secondary text-foreground'
                                : 'bg-primary text-primary-foreground'
                            }`}
                          >
                            {followingStatus[u._id] ? 'Following' : 'Follow'}
                          </button>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              )}

              {/* IMAGES tab */}
              {activeResultTab === 'images' && (
                <div>
                  {searchResults.images.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">No images found</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-0.5">
                      {searchResults.images.map(img => (
                        <Link
                          key={img._id}
                          href={`/image/${img._id}`}
                          className="relative aspect-square bg-secondary overflow-hidden group"
                        >
                          <Image
                            src={img.imageUrl || img.thumbnail || '/images/placeholder.jpg'}
                            alt={img.title || ''}
                            fill
                            className="object-cover"
                            sizes="33vw"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <span className="flex items-center gap-1 text-white font-bold text-sm">
                              <Heart className="w-5 h-5 fill-white" /> {fmt(img.likesCount)}
                            </span>
                            <span className="flex items-center gap-1 text-white font-bold text-sm">
                              <MessageCircle className="w-5 h-5 fill-white" /> {fmt(img.commentsCount)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAGS tab */}
              {activeResultTab === 'tags' && (
                <div>
                  {searchResults.tags.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">No tags found</div>
                  ) : (
                    searchResults.tags.map(tag => (
                      <button
                        key={tag.name || tag._id}
                        onClick={() => handleSearchItemClick(`#${tag.name}`)}
                        className="flex items-center gap-3 w-full px-4 py-3 bg-secondary-hover transition-colors"
                      >
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          <span className="text-xl font-bold text-muted-foreground">#</span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold">#{tag.name}</p>
                          <p className="text-xs text-muted-foreground">{fmt(tag.count)} posts</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====== EXPLORE GRID (no search query - Instagram Explore style) ====== */}
      {!queryParam && !isSearchFocused && (
        <div className="max-w-screen-xl mx-auto">
          {exploreLoading && exploreItems.length === 0 ? (
            <div className="grid grid-cols-3 gap-0.5">
              {Array(12).fill(0).map((_, i) => (
                <div
                  key={i}
                  className={`bg-secondary animate-pulse ${
                    i === 2 || i === 9 ? 'row-span-2 aspect-[9/16]' : 'aspect-square'
                  }`}
                />
              ))}
            </div>
          ) : exploreItems.length === 0 ? (
            <div className="text-center py-20">
              <Grid className="w-16 h-16 text-muted-foreground opacity-30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-1">Explore</h3>
              <p className="text-sm text-muted-foreground">Discover photos and reels from creators</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-0.5">
                {exploreItems.map((item, idx) => {
                  if (item.itemType === 'reel') {
                    const reelId = item._id || `reel-${idx}`;
                    return (
                      <Link
                        key={reelId}
                        href={`/reels?id=${item._id}`}
                        className="relative row-span-2 bg-black overflow-hidden group"
                        onMouseEnter={() => handleVideoHover(reelId, true)}
                        onMouseLeave={() => handleVideoHover(reelId, false)}
                      >
                        <div className="w-full h-full aspect-[9/16]">
                          {item.videoUrl ? (
                            <video
                              ref={el => { if (el) videoRefs.current[reelId] = el; }}
                              src={item.videoUrl}
                              poster={item.thumbnailUrl}
                              className="w-full h-full object-cover"
                              muted
                              loop
                              playsInline
                            />
                          ) : item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                              <Film className="w-10 h-10 text-zinc-700" />
                            </div>
                          )}

                          <div className="absolute top-2 right-2">
                            <Play className="w-5 h-5 text-white fill-white drop-shadow-lg" />
                          </div>

                          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-lg">
                            <Play className="w-3.5 h-3.5 fill-white" />
                            {fmt(item.viewsCount || item.plays || 0)}
                          </div>

                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                            <span className="flex items-center gap-1.5 text-white font-bold">
                              <Heart className="w-6 h-6 fill-white" /> {fmt(item.likesCount)}
                            </span>
                            <span className="flex items-center gap-1.5 text-white font-bold">
                              <MessageCircle className="w-6 h-6 fill-white" /> {fmt(item.commentsCount)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={item._id || `img-${idx}`}
                      href={`/image/${item._id}`}
                      className="relative aspect-square bg-secondary overflow-hidden group"
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title || ''}
                          fill
                          className="object-cover"
                          sizes="33vw"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary" />
                      )}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <span className="flex items-center gap-1 text-white font-bold text-sm">
                          <Heart className="w-5 h-5 fill-white" /> {fmt(item.likesCount)}
                        </span>
                        <span className="flex items-center gap-1 text-white font-bold text-sm">
                          <MessageCircle className="w-5 h-5 fill-white" /> {fmt(item.commentsCount)}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div ref={loadMoreRef} className="h-10" />
              {exploreLoading && exploreItems.length > 0 && (
                <div className="flex justify-center py-6">
                  <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;