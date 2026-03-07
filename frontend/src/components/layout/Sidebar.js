"use client";

import React, { useState, useEffect } from "react";
import {
  Compass,
  Heart,
  ImagePlus,
  Search,
  Settings,
  Sparkles,
  User,
  Users,
  BookmarkIcon,
  Hash,
  Bell,
  FolderPlus,
  X,
  MessageCircle,
  Film,
  Video,
  Shield,
  ChevronRight,
  Zap,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessagesContext";
import { useApi } from "@/hooks/useApi";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const Sidebar = ({ mobileSidebarOpen, setMobileSidebarOpen }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useMessages();
  const api = useApi();
  
  const [isHovered, setIsHovered] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [mobileSuggestions, setMobileSuggestions] = useState([]);
  const [followedUsers, setFollowedUsers] = useState(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch suggestions for mobile sidebar
  useEffect(() => {
    if (mobileSidebarOpen && mobileSuggestions.length === 0) {
      api.get('/api/users/suggestions?limit=6')
        .then(res => setMobileSuggestions(res.data.data || []))
        .catch(() => {});
    }
  }, [mobileSidebarOpen]);

  const handleMobileFollow = async (userId) => {
    try {
      await api.post(`/api/follow/${userId}`);
      setFollowedUsers(prev => {
        const next = new Set(prev);
        if (next.has(userId)) next.delete(userId); else next.add(userId);
        return next;
      });
    } catch (e) { console.error(e); }
  };

  // Handle mobile sidebar item click
  const handleMobileItemClick = () => {
    setMobileSidebarOpen(false);
  };

  // Handle escape key to close mobile sidebar
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileSidebarOpen]);

  const menuItems = [
    { name: 'Home', icon: Compass, href: '/feed', section: 'main' },
    { name: 'Search', icon: Search, href: null, section: 'main', isSearch: true },
    { name: 'Reels', icon: Film, href: '/reels', section: 'main' },
    { name: 'Messages', icon: MessageCircle, href: '/messages', badge: mounted ? unreadCount : 0, section: 'main' },
    { name: 'Notifications', icon: Bell, href: '/notifications', section: 'main' },
    { name: 'Profile', icon: User, href: `/profile/@${user?.username || 'username'}`, section: 'main' },
    { name: 'AI Assistant', icon: Sparkles, href: '/ai-assistant', section: 'ai', isAI: true },
    { name: 'Likes', icon: Heart, href: '/likes', section: 'discover' },
    { name: 'Favorites', icon: BookmarkIcon, href: '/favorites', section: 'discover' },
    { name: 'Collections', icon: FolderPlus, href: '/collections', section: 'discover' },
    { name: 'Tags', icon: Hash, href: '/tags', section: 'discover' },
    { name: 'Users', icon: Users, href: '/users', section: 'discover' },
    { name: 'Upload Image', icon: ImagePlus, href: '/upload-image', section: 'create' },
    { name: 'Upload Reel', icon: Video, href: '/upload-reel', section: 'create' },
    ...(user?.isAdmin ? [{ name: 'Admin Panel', icon: Shield, href: '/admin/dashboard', isAdmin: true, section: 'admin' }] : []),
  ];

  const isActive = (href) => {
    return pathname === href || (href?.includes('/profile/') && pathname.includes('/profile/'));
  };

  const NavItem = ({ item, onClick, isMobile = false }) => {
    const Icon = item.icon;
    const active = item.isSearch ? pathname === '/search' : isActive(item.href);
    
    // Search item is a button, not a link
    if (item.isSearch) {
      // Both mobile and desktop navigate to /search page
      return (
        <Link
          href="/search"
          onClick={onClick}
          className={`
            group relative flex items-center gap-3 px-3 py-2.5 rounded-xl w-full
            transition-all duration-200
            ${pathname === '/search' 
              ? 'bg-primary text-primary-foreground' 
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }
          `}
        >
          <span className={`
            relative flex-shrink-0 p-1.5 rounded-lg
            transition-all duration-200
            ${pathname === '/search' ? 'bg-white/20' : 'group-hover:bg-primary/10'}
          `}>
            <Icon className="w-5 h-5" />
          </span>
          <span className={`${isMobile ? 'flex' : 'hidden xl:flex'} items-center gap-2 font-medium text-sm`}>
            {item.name}
          </span>
        </Link>
      );
    }
    
    return (
      <Link
        href={item.href}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(item.href)}
        onMouseLeave={() => setIsHovered(null)}
        className={`
          group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
          transition-all duration-200
          ${active 
            ? 'bg-primary text-primary-foreground' 
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }
          ${item.isAdmin ? 'border border-amber-500/30 bg-amber-500/5' : ''}
        `}
      >
        {/* Icon container */}
        <span className={`
          relative flex-shrink-0 p-1.5 rounded-lg
          transition-all duration-200
          ${active ? 'bg-white/20' : 'group-hover:bg-primary/10'}
        `}>
          <Icon className="w-5 h-5" />
          
          {/* Badge */}
          {item.badge > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          )}
        </span>
        
        {/* Label - visible on mobile, hidden on collapsed desktop sidebar */}
        <span className={`
          ${isMobile ? 'flex' : 'hidden xl:flex'} items-center gap-2 font-medium text-sm
          transition-all duration-200
        `}>
          {item.name}
          {item.badge > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </span>

        {/* Active indicator line */}
        {active && !isMobile && (
          <span className="absolute right-2 w-1 h-6 bg-white/30 rounded-full hidden xl:block" />
        )}
      </Link>
    );
  };

  const SectionLabel = ({ children }) => (
    <div className="px-3 py-2 hidden xl:block">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {children}
      </span>
    </div>
  );

  const mainItems = menuItems.filter(item => item.section === 'main');
  const aiItems = menuItems.filter(item => item.section === 'ai');
  const discoverItems = menuItems.filter(item => item.section === 'discover');
  const createItems = menuItems.filter(item => item.section === 'create');
  const adminItems = menuItems.filter(item => item.section === 'admin');

  return (
    <>
      {/* Desktop Sidebar - Clean Modern Design */}
      <div className="hidden lg:flex w-20 xl:w-64 h-screen fixed flex-col bg-card border-r border-border z-40">
        {/* Logo Section */}
        <div className="p-4 xl:p-5 border-b border-border">
          <Link href="/feed" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl overflow-hidden transition-transform duration-200 group-hover:scale-105">
                <img 
                  src="/images/logo.png" 
                  alt="ProConnect Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="hidden xl:block">
              <h1 className="text-lg font-bold text-foreground">ProConnect</h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Share & Discover</p>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          {/* Main Navigation */}
          <div className="px-2 space-y-1">
            <SectionLabel>Main</SectionLabel>
            {mainItems.map(item => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>

          {/* AI Section */}
          <div className="px-2 mt-6 space-y-1">
            <SectionLabel>AI</SectionLabel>
            {aiItems.map(item => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>

          {/* Discover Section */}
          <div className="px-2 mt-6 space-y-1">
            <SectionLabel>Discover</SectionLabel>
            {discoverItems.map(item => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>

          {/* Create Section */}
          <div className="px-2 mt-6 space-y-1">
            <SectionLabel>Create</SectionLabel>
            {createItems.map(item => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>

          {/* Admin Section */}
          {adminItems.length > 0 && (
            <div className="px-2 mt-6 space-y-1">
              <SectionLabel>Admin</SectionLabel>
              {adminItems.map(item => (
                <NavItem key={item.name} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats Card - Desktop Only */}
        <div className="hidden xl:block px-3 mb-4">
          <div className="bg-secondary/50 p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Your Profile</p>
                <p className="text-[10px] text-muted-foreground">@{user?.username || 'username'}</p>
              </div>
            </div>
            <Link 
              href={`/profile/@${user?.username || 'username'}`}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <span>View Profile</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Theme Toggle & Settings */}
        <div className="p-3 border-t border-border space-y-2">
          {/* Theme Toggle */}
          <div className="flex items-center justify-center xl:justify-between px-2">
            <span className="hidden xl:block text-xs text-muted-foreground">Theme</span>
            <ThemeToggle size="small" />
          </div>
          
          {/* Settings Link */}
          <Link
            href="/settings"
            className={`
              group flex items-center gap-3 px-3 py-2.5 rounded-xl
              transition-all duration-200
              ${pathname === '/settings'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }
            `}
          >
            <Settings className="w-5 h-5" />
            <span className="hidden xl:block font-medium text-sm">Settings</span>
          </Link>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleMobileItemClick}
          />
          
          {/* Sidebar Panel */}
          <div className="absolute left-0 top-0 w-full max-w-sm h-full bg-card overflow-y-auto animate-slide-in-left border-r border-border">
            {/* Mobile Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <Link href="/feed" className="flex items-center gap-3" onClick={handleMobileItemClick}>
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">ProConnect</h1>
                  <p className="text-[10px] text-muted-foreground -mt-0.5">Share & Discover</p>
                </div>
              </Link>
              <button
                onClick={handleMobileItemClick}
                className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <div className="py-4 px-3">
              {/* Main Section */}
              <div className="space-y-1">
                <SectionLabel>Main</SectionLabel>
                {mainItems.map(item => (
                  <NavItem key={item.name} item={item} onClick={handleMobileItemClick} isMobile={true} />
                ))}
              </div>

              {/* Discover Section */}
              <div className="mt-6 space-y-1">
                <SectionLabel>Discover</SectionLabel>
                {discoverItems.map(item => (
                  <NavItem key={item.name} item={item} onClick={handleMobileItemClick} isMobile={true} />
                ))}
              </div>

              {/* Create Section */}
              <div className="mt-6 space-y-1">
                <SectionLabel>Create</SectionLabel>
                {createItems.map(item => (
                  <NavItem key={item.name} item={item} onClick={handleMobileItemClick} isMobile={true} />
                ))}
              </div>

              {/* Suggested Followers - Mobile */}
              {mobileSuggestions.length > 0 && (
                <div className="mt-6 space-y-1">
                  <SectionLabel>Suggested for you</SectionLabel>
                  <div className="space-y-1">
                    {mobileSuggestions.map((s) => (
                      <div key={s._id} className="flex items-center justify-between px-2 py-2 rounded-xl hover:bg-secondary transition-colors">
                        <Link href={`/profile/${s.username}`} onClick={handleMobileItemClick} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-primary/10">
                            <Image src={s.profilePicture || '/images/default-profile.jpg'} alt={s.username} width={36} height={36} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{s.username}</p>
                            <p className="text-xs text-muted-foreground truncate">{s.fullName || 'Suggested for you'}</p>
                          </div>
                        </Link>
                        <button
                          onClick={(e) => { e.preventDefault(); handleMobileFollow(s._id); }}
                          className={`text-xs font-semibold ml-2 px-3 py-1.5 rounded-lg transition-all ${
                            followedUsers.has(s._id)
                              ? 'bg-secondary text-muted-foreground'
                              : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                        >
                          {followedUsers.has(s._id) ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Section */}
              {adminItems.length > 0 && (
                <div className="mt-6 space-y-1">
                  <SectionLabel>Admin</SectionLabel>
                  {adminItems.map(item => (
                    <NavItem key={item.name} item={item} onClick={handleMobileItemClick} isMobile={true} />
                  ))}
                </div>
              )}

              {/* Mobile Quick Card */}
              <div className="mt-8 bg-secondary/50 p-4 rounded-xl border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{user?.fullname || 'User'}</p>
                    <p className="text-xs text-muted-foreground">@{user?.username || 'username'}</p>
                  </div>
                </div>
                <Link 
                  href={`/profile/@${user?.username || 'username'}`}
                  onClick={handleMobileItemClick}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  View Profile
                </Link>
              </div>

              {/* Theme & Settings */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 rounded-xl">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle size="small" showLabel />
                </div>
                
                <Link
                  href="/settings"
                  onClick={handleMobileItemClick}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-xl
                    transition-all duration-200
                    ${pathname === '/settings'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }
                  `}
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
