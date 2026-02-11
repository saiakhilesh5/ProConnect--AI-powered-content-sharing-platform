"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image, Search, Upload, Clock, TrendingUp, Menu, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";

// Import our component parts
import NavTabs from "./NavTabs";
// import SearchBar from "./SearchBar";
import CreateMenu from "./CreateMenu";
import MessagesMenu from "./MessagesMenu";
import NotificationsMenu from "./NotificationsMenu";
import QuickView from "./QuickView";
import UserMenu from "./UserMenu";
import Link from "next/link";

const LoggedInHeader = ({ mobileSidebarOpen, setMobileSidebarOpen }) => {
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchActive, setSearchActive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("discover");
  const [isCreatingMode, setIsCreatingMode] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const api = useApi();

  const [userStatus, setUserStatus] = useState(user?.userStatus || "online");

  // Handle scroll effect for navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        const isScrolled = window.scrollY > 10;
        if (isScrolled !== scrolled) {
          setScrolled(isScrolled);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [scrolled]);

  // Prevent body scroll when modal open
  useEffect(() => {
    if (searchOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [searchOpen]);

  // Handle document click to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown !== null && !event.target.closest(".dropdown-container")) {
        setActiveDropdown(null);
      }
      if (quickViewOpen && !event.target.closest(".quick-view-container")) {
        setQuickViewOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [activeDropdown, quickViewOpen]);

  // Handle escape key to close search modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [searchOpen]);

  // Toggle dropdown menu
  const toggleDropdown = (index) => {
    if (activeDropdown === index) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(index);
    }
  };

  // Toggle search modal visibility
  const toggleSearch = () => {
    setSearchActive(!searchActive);
    setSearchOpen((prev) => !prev);
    if (!searchOpen) {
      // opening
      loadRecentSearches();
      fetchTrending();
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  // Toggle creator mode
  const toggleCreatorMode = () => {
    setIsCreatingMode(!isCreatingMode);
  };

  // Sync userStatus with user data
  useEffect(() => {
    if (user?.userStatus) {
      setUserStatus(user.userStatus);
    }
  }, [user?.userStatus]);

  // Derive current tab from pathname
  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/dashboard")) setCurrentTab("dashboard");
    else if (pathname.startsWith("/feed")) setCurrentTab("discover");
    else if (pathname.startsWith("/search")) setCurrentTab("search");
    else if (pathname.startsWith("/users")) setCurrentTab("users");
    else if (pathname.startsWith("/collections")) setCurrentTab("collections");
    else if (pathname.startsWith("/notifications")) setCurrentTab("notifications");
    else setCurrentTab("discover");
  }, [pathname]);

  // Toggle quick view
  const toggleQuickView = (e) => {
    e.stopPropagation();
    setQuickViewOpen(!quickViewOpen);
  };

  // Recent & trending helpers
  const loadRecentSearches = () => {
    try {
      const recent = JSON.parse(localStorage.getItem("pixora_recent_searches") || "[]");
      setRecentSearches(recent.slice(0, 8));
    } catch {}
  };

  const saveSearch = (term) => {
    try {
      const recent = JSON.parse(localStorage.getItem("pixora_recent_searches") || "[]");
      const filtered = recent.filter((t) => t !== term);
      localStorage.setItem("pixora_recent_searches", JSON.stringify([term, ...filtered].slice(0, 12)));
    } catch {}
  };

  const fetchTrending = async () => {
    try {
      const res = await api.get("/api/images/trending-search?limit=4");
      setTrendingSearches(res?.data?.data || []);
    } catch (e) {
      setTrendingSearches([]);
    }
  };

  const onSubmitSearch = (e) => {
    e?.preventDefault?.();
    if (!query.trim()) return;
    saveSearch(query.trim());
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
  };

  const onPickSearch = (term) => {
    saveSearch(term);
    setSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
    setQuery("");
  };

  return (
    <motion.header
      className={`fixed top-0 right-0 left-0 z-40 transition-all duration-300 border-b ${
        scrolled
          ? "glass border-border/50 py-2.5"
          : "bg-transparent py-4 border-transparent"
      } ${
        // Mobile: no left margin, Desktop: left margin for sidebar
        "ml-0 lg:ml-20 xl:ml-64"
      }`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 lg:px-6 mx-auto">
        <div className="flex items-center justify-between">
          {/* Mobile: Left side - Menu button and ProConnect logo */}
          <div className="flex items-center space-x-3 lg:hidden">
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="p-2.5 text-muted-foreground hover:text-foreground rounded-xl transition-colors hover:bg-secondary"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href={"/dashboard"} className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-primary to-accent rounded-lg p-1.5 flex items-center justify-center shadow-glow">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold gradient-text">ProConnect</h1>
            </Link>
          </div>

          {/* Desktop: Left side - Tabs and navigation */}
          <div className="hidden lg:block">
            <NavTabs
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
              isCreatingMode={isCreatingMode}
              toggleCreatorMode={toggleCreatorMode}
            />
          </div>

          {/* Search button centered modal trigger - Desktop only */}
          <div className="hidden lg:flex flex-1 justify-center px-4">
            <div className="w-full max-w-xl">
              <button
                onClick={toggleSearch}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl glass-subtle border border-border hover:border-border-hover text-muted-foreground hover:text-foreground transition-all cursor-pointer group"
              >
                <Search className="w-4 h-4 group-hover:text-primary transition-colors" />
                <span className="text-sm">Search images, people, collections...</span>
                <span className="ml-auto text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded font-mono">Ctrl K</span>
              </button>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-2 dropdown-container">
            {/* Mobile: Search button */}
            <button
              onClick={toggleSearch}
              className={`lg:hidden p-2.5 text-muted-foreground hover:text-foreground rounded-xl transition-colors ${
                searchActive ? "bg-secondary" : "hover:bg-secondary"
              }`}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Create New Button & Menu */}
            <CreateMenu
              activeDropdown={activeDropdown}
              toggleDropdown={toggleDropdown}
              setActiveDropdown={setActiveDropdown}
            />

            {/* Notifications Button & Menu */}
            <NotificationsMenu
              activeDropdown={activeDropdown}
              toggleDropdown={toggleDropdown}
            />

            {/* User Menu Button & Menu */}
            <UserMenu
              activeDropdown={activeDropdown}
              toggleDropdown={toggleDropdown}
              setActiveDropdown={setActiveDropdown}
              user={user}
              userStatus={userStatus}
              setUserStatus={setUserStatus}
              handleLogout={handleLogout}
            />
          </div>
        </div>
      </div>

      {/* Search Overlay Modal */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-4 left-1/2 transform -translate-x-1/2 w-[calc(100%-1rem)] max-w-2xl mx-auto z-[130] sm:top-20 sm:w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="glass-card rounded-2xl shadow-2xl overflow-hidden border border-border">
                <form onSubmit={onSubmitSearch} className="flex items-center p-3 sm:p-4 border-b border-border">
                  <Search className="w-5 h-5 text-muted-foreground mr-3 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search for images, artists, collections, or tags..."
                    className="flex-1 bg-transparent text-foreground text-sm sm:text-base placeholder-muted-foreground focus:outline-none"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded font-mono">ESC</span>
                </form>

                <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Recent Searches */}
                  <div className="glass-subtle rounded-xl p-2.5 sm:p-3 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <h4 className="text-sm font-semibold text-primary">Recent</h4>
                    </div>
                    {recentSearches.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No recent searches</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((t, idx) => (
                          <button
                            key={idx}
                            onClick={() => onPickSearch(t)}
                            className="px-2.5 py-1 text-xs rounded-full bg-secondary hover:bg-secondary-hover text-foreground-secondary hover:text-foreground border border-border transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Trending Tags (chips like search page) */}
                  <div className="glass-subtle rounded-xl p-2.5 sm:p-3 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      <h4 className="text-sm font-semibold text-accent">Trending searches</h4>
                    </div>
                    {trendingSearches.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No trending terms</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {trendingSearches.map((trend, idx) => (
                          <button
                            key={idx}
                            onClick={() => onPickSearch(trend.query)}
                            className="px-3 py-1.5 text-xs rounded-full bg-secondary hover:bg-secondary-hover text-foreground-secondary hover:text-foreground border border-border transition-colors"
                          >
                            {trend.query}
                            {typeof trend.count === 'number' && (
                              <span className="ml-2 text-[10px] text-muted-foreground">{trend.count}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3">
                  <button
                    onClick={onSubmitSearch}
                    className="w-full py-2.5 sm:py-3 text-sm btn-primary rounded-xl font-medium transition-all"
                  >
                    Search
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default LoggedInHeader; 