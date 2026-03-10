"use client"
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useApi } from "@/hooks/useApi";
import { useAuth } from '@/context/AuthContext';
import { useLikesFavorites } from '@/hooks/useLikesFavorites';
import InstagramPostCard from '@/components/cards/InstagramPostCard';
import { StoriesBar, StoryViewer } from '@/components/features/Stories';
import CommentsModal from '@/components/features/CommentsModal';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Heart, 
  Loader2,
  TrendingUp,
  Users,
  UserPlus,
  ChevronRight,
  X
} from 'lucide-react';

// ====== SUGGESTION CARD (used in both sidebars) ======
const SuggestionCard = ({ suggestion, onFollow }) => {
  const [isFollowing, setIsFollowing] = useState(false);

  return (
    <div className="flex items-center justify-between py-2">
      <Link href={`/profile/${suggestion.username}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-primary/10">
          <Image
            src={suggestion.profilePicture || '/images/default-profile.jpg'}
            alt={suggestion.username}
            width={36}
            height={36}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {suggestion.username}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {suggestion.fullName || suggestion.bio?.substring(0, 25) || 'Suggested for you'}
          </p>
        </div>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          setIsFollowing(!isFollowing);
          onFollow?.(suggestion._id);
        }}
        className={`text-xs font-semibold ml-2 px-3 py-1.5 rounded-lg transition-all ${
          isFollowing 
            ? 'bg-secondary text-muted-foreground hover:text-foreground' 
            : 'bg-primary/10 text-primary hover:bg-primary/20'
        }`}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </button>
    </div>
  );
};

// ====== LEFT SIDEBAR ======
const LeftSidebar = ({ user }) => {
  return (
    <div className="space-y-4">
      {/* User Profile Card */}
      {user && (
        <div className="bg-card border border-border rounded-xl p-4">
          <Link href={`/profile/${user.username}`} className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary/20 mb-3">
              <Image
                src={user.profilePicture || '/images/default-profile.jpg'}
                alt={user.username}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-sm font-bold text-foreground">{user.fullName || user.name}</p>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </Link>
          <div className="flex justify-around mt-4 pt-3 border-t border-border">
            <Link href={`/profile/${user.username}`} className="text-center hover:opacity-80">
              <p className="text-sm font-bold text-foreground">{user.postsCount || 0}</p>
              <p className="text-[10px] text-muted-foreground">Posts</p>
            </Link>
            <Link href={`/profile/${user.username}?tab=followers`} className="text-center hover:opacity-80">
              <p className="text-sm font-bold text-foreground">{user.followersCount || 0}</p>
              <p className="text-[10px] text-muted-foreground">Followers</p>
            </Link>
            <Link href={`/profile/${user.username}?tab=following`} className="text-center hover:opacity-80">
              <p className="text-sm font-bold text-foreground">{user.followingCount || 0}</p>
              <p className="text-[10px] text-muted-foreground">Following</p>
            </Link>
          </div>
        </div>
      )}

      {/* Trending Topics */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Trending</h3>
        </div>
        <div className="space-y-2">
          {['Photography', 'Nature', 'Art', 'Travel', 'Portrait'].map((topic) => (
            <Link
              key={topic}
              href={`/search?q=${topic}`}
              className="block text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              #{topic}
            </Link>
          ))}
        </div>
      </div>

      {/* Footer links */}
      <div className="px-2">
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          {['About', 'Help', 'Press', 'Privacy', 'Terms'].map((link) => (
            <a key={link} href="#" className="text-[11px] text-muted-foreground hover:underline">
              {link}
            </a>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">&copy; 2025 ProConnect</p>
      </div>
    </div>
  );
};

// ====== RIGHT SIDEBAR ======
const RightSidebar = ({ suggestions, onFollow, onShowMore }) => {
  return (
    <div className="space-y-4">
      {/* Suggested Followers */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Suggested for you</h3>
          </div>
        </div>
        
        {suggestions.length > 0 ? (
          <div className="space-y-1">
            {suggestions.slice(0, 5).map((suggestion) => (
              <SuggestionCard 
                key={suggestion._id} 
                suggestion={suggestion}
                onFollow={onFollow}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No suggestions yet</p>
          </div>
        )}

        {/* More button */}
        <button
          onClick={onShowMore}
          className="w-full mt-3 pt-3 border-t border-border flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          See more suggestions
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* People You May Know (different style) */}
      {suggestions.length > 5 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">People You May Know</h3>
          </div>
          <div className="space-y-3">
            {suggestions.slice(5, 8).map((suggestion) => (
              <Link key={suggestion._id} href={`/profile/${suggestion.username}`} className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/10 flex-shrink-0">
                  <Image
                    src={suggestion.profilePicture || '/images/default-profile.jpg'}
                    alt={suggestion.username}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {suggestion.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {suggestion.followersCount || 0} followers
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ====== MORE SUGGESTIONS MODAL ======
const MoreSuggestionsModal = ({ isOpen, onClose, suggestions, onFollow, loadMore, hasMore, loading }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Suggested Followers</h2>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="overflow-y-auto max-h-[calc(70vh-65px)] p-4">
            <div className="space-y-1">
              {suggestions.map((suggestion) => (
                <SuggestionCard 
                  key={suggestion._id} 
                  suggestion={suggestion}
                  onFollow={onFollow}
                />
              ))}
            </div>
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full mt-4 py-2.5 bg-primary/10 text-primary text-sm font-semibold rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ====== MAIN FEED COMPONENT ======
const InstagramFeed = () => {
  const { user } = useAuth();
  const { status: sessionStatus } = useSession();
  const api = useApi();
  const { toggleLike, toggleFavorite, getLikeStatus, getFavoriteStatus } = useLikesFavorites();

  // Feed State
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const feedScrollRef = useRef(null);

  // Stories State
  const [stories, setStories] = useState([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);

  // Comments Modal State
  const [showComments, setShowComments] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Suggestions State
  const [suggestions, setSuggestions] = useState([]);
  const [allSuggestions, setAllSuggestions] = useState([]);
  const [showMoreSuggestions, setShowMoreSuggestions] = useState(false);
  const [suggestionsPage, setSuggestionsPage] = useState(1);
  const [hasMoreSuggestions, setHasMoreSuggestions] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Fetch Posts
  const fetchPosts = useCallback(async (pageNum = 1, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get(`/api/images/public?page=${pageNum}&limit=10`);
      const newPosts = response.data.data;

      if (isLoadMore) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setHasMore(response.data.metadata.page < response.data.metadata.pages);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [api]);

  // Fetch Stories from backend
  const fetchStories = useCallback(async () => {
    try {
      const response = await api.get('/api/images/stories');
      setStories(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching stories:', error);
      setStories([]);
    }
  }, [api]);

  // Fetch Suggestions
  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await api.get('/api/users/suggestions?limit=10');
      const data = response.data.data || [];
      setSuggestions(data);
      setAllSuggestions(data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  }, [api]);

  // Load more suggestions for modal
  const loadMoreSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const nextPage = suggestionsPage + 1;
      const response = await api.get(`/api/users/suggestions?limit=10&page=${nextPage}`);
      const newSuggestions = response.data.data || [];
      if (newSuggestions.length === 0) {
        setHasMoreSuggestions(false);
      } else {
        setAllSuggestions(prev => [...prev, ...newSuggestions]);
        setSuggestionsPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more suggestions:', error);
      setHasMoreSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Follow handler — remove followed user from suggestions list so the button
  // can't reset to "Follow" when navigating away and back
  const handleFollow = async (userId) => {
    // Optimistically remove from both suggestion lists
    setSuggestions(prev => prev.filter(s => s._id !== userId));
    setAllSuggestions(prev => prev.filter(s => s._id !== userId));
    try {
      await api.post(`/api/follow/${userId}`);
    } catch (error) {
      console.error('Error following user:', error);
      // Re-fetch suggestions to restore list on failure
      try {
        const res = await api.get('/api/users/suggestions?limit=10');
        const data = res.data.data || [];
        setSuggestions(data);
        setAllSuggestions(data);
      } catch (_) {}
    }
  };

  // Fetch Comments
  const fetchComments = async (postId) => {
    setLoadingComments(true);
    try {
      const response = await api.get(`/api/comments/${postId}`);
      setComments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  // Handle Like
  const handleLike = async (postId) => {
    try {
      await toggleLike(postId);
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          const wasLiked = getLikeStatus(postId);
          return {
            ...post,
            likesCount: wasLiked ? (post.likesCount || 1) - 1 : (post.likesCount || 0) + 1
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Handle Save
  const handleSave = async (postId) => {
    try {
      await toggleFavorite(postId);
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  // Handle Comment
  const handleComment = (post) => {
    setActivePost(post);
    fetchComments(post._id);
    setShowComments(true);
  };

  // Handle Share
  const handleShare = (post) => {
    if (navigator.share) {
      navigator.share({
        title: post.title || 'Check out this post',
        url: `${window.location.origin}/image/${post._id}`
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/image/${post._id}`);
    }
  };

  // Add Comment
  const handleAddComment = async (text) => {
    if (!activePost) return;
    try {
      const response = await api.post(`/api/comments/${activePost._id}`, { text });
      setComments(prev => [...prev, response.data.data]);
      setPosts(prev => prev.map(post => {
        if (post._id === activePost._id) {
          return { ...post, commentsCount: (post.commentsCount || 0) + 1 };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Handle Story Click
  const handleStoryClick = (index) => {
    setActiveStoryIndex(index);
    setShowStoryViewer(true);
  };

  // Handle Add Story
  const handleAddStory = () => {
    window.location.href = '/upload-image?type=story';
  };

  // Load More Posts Handler
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage, true);
    }
  };

  // Initial Load - wait for session to be authenticated so API has the token
  useEffect(() => {
    if (user && sessionStatus === 'authenticated') {
      fetchPosts();
      fetchStories();
      fetchSuggestions();
    }
  }, [user, sessionStatus]);

  // Infinite scroll (on the center feed container, not the window)
  useEffect(() => {
    const scrollEl = feedScrollRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      if (
        scrollEl.scrollTop + scrollEl.clientHeight >= 
        scrollEl.scrollHeight - 1000 && 
        !loadingMore && 
        hasMore
      ) {
        handleLoadMore();
      }
    };

    scrollEl.addEventListener('scroll', handleScroll);
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, page]);

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] md:h-screen pb-16 md:pb-0 overflow-hidden">
      <div className="max-w-[1100px] mx-auto flex gap-5 px-0 md:px-4 lg:px-6 h-full">
        
        {/* ====== LEFT SIDEBAR - Desktop Only (fixed, no scroll) ====== */}
        <aside className="hidden lg:flex w-[280px] flex-shrink-0 h-full overflow-y-auto scrollbar-hide pt-4 pb-4">
          <div className="w-full">
            <LeftSidebar user={user} />
          </div>
        </aside>

        {/* ====== MAIN FEED - Center Column (only this scrolls) ====== */}
        <main ref={feedScrollRef} className="flex-1 min-w-0 max-w-[470px] mx-auto lg:mx-0 pt-4 h-full overflow-y-auto scrollbar-hide">
          {/* Stories Bar */}
          <StoriesBar 
            stories={stories}
            onStoryClick={handleStoryClick}
            onAddStory={handleAddStory}
          />

          {/* Posts */}
          <div className="space-y-0 md:space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card border-y md:border md:rounded-lg animate-pulse">
                  <div className="flex items-center p-3 gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted" />
                    <div className="flex-1">
                      <div className="h-3 w-24 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="aspect-square bg-muted" />
                  <div className="p-3 space-y-3">
                    <div className="flex gap-4">
                      <div className="w-6 h-6 bg-muted rounded" />
                      <div className="w-6 h-6 bg-muted rounded" />
                      <div className="w-6 h-6 bg-muted rounded" />
                    </div>
                    <div className="h-3 w-20 bg-muted rounded" />
                    <div className="h-3 w-full bg-muted rounded" />
                  </div>
                </div>
              ))
            ) : (
              posts.map((post, index) => (
                <motion.div
                  key={post._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <InstagramPostCard
                    image={post}
                    onCommentClick={() => handleComment(post)}
                    onShareClick={() => handleShare(post)}
                  />
                </motion.div>
              ))
            )}

            {loadingMore && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8 border-t border-border">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-foreground mb-4">
                  <Heart className="w-8 h-8 text-foreground" />
                </div>
                <p className="text-foreground font-medium">You&apos;re all caught up</p>
                <p className="text-muted-foreground text-sm mt-1">
                  You&apos;ve seen all new posts from the last 3 days.
                </p>
              </div>
            )}
          </div>
        </main>

        {/* ====== RIGHT SIDEBAR - Desktop Only (fixed, no scroll) ====== */}
        <aside className="hidden lg:flex w-[280px] flex-shrink-0 h-full overflow-y-auto scrollbar-hide pt-4 pb-4">
          <div className="w-full">
            <RightSidebar 
              suggestions={suggestions}
              onFollow={handleFollow}
              onShowMore={() => setShowMoreSuggestions(true)}
            />
          </div>
        </aside>
      </div>

      {/* Story Viewer */}
      <AnimatePresence>
        {showStoryViewer && (
          <StoryViewer
            stories={stories}
            initialIndex={activeStoryIndex}
            onClose={() => setShowStoryViewer(false)}
          />
        )}
      </AnimatePresence>

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        post={activePost}
        comments={comments}
        onAddComment={handleAddComment}
        isLoading={loadingComments}
      />

      {/* More Suggestions Modal */}
      <MoreSuggestionsModal
        isOpen={showMoreSuggestions}
        onClose={() => setShowMoreSuggestions(false)}
        suggestions={allSuggestions}
        onFollow={handleFollow}
        loadMore={loadMoreSuggestions}
        hasMore={hasMoreSuggestions}
        loading={loadingSuggestions}
      />
    </div>
  );
};

export default InstagramFeed;
