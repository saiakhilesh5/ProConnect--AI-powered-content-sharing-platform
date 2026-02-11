"use client";

import React, { useState, useEffect } from "react";
import {
  Compass,
  Grid,
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
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessagesContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const Sidebar = ({ mobileSidebarOpen, setMobileSidebarOpen }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useMessages();
  
  const [isHovered, setIsHovered] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

    if (mobileSidebarOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [mobileSidebarOpen]);

  const menuItems = [
    { name: 'Dashboard', icon: Compass, href: '/dashboard', section: 'main' },
    { name: 'Feed', icon: Grid, href: '/feed', section: 'main' },
    { name: 'Reels', icon: Film, href: '/reels', section: 'main' },
    { name: 'Messages', icon: MessageCircle, href: '/messages', badge: mounted ? unreadCount : 0, section: 'main' },
    { name: 'Profile', icon: User, href: `/profile/@${user?.username || 'username'}`, section: 'main' },
    { name: 'Likes', icon: Heart, href: '/likes', section: 'discover' },
    { name: 'Favorites', icon: BookmarkIcon, href: '/favorites', section: 'discover' },
    { name: 'Collections', icon: FolderPlus, href: '/collections', section: 'discover' },
    { name: 'Search', icon: Search, href: '/search', section: 'discover' },
    { name: 'Tags', icon: Hash, href: '/tags', section: 'discover' },
    { name: 'Notifications', icon: Bell, href: '/notifications', section: 'discover' },
    { name: 'Users', icon: Users, href: '/users', section: 'discover' },
    { name: 'Upload Image', icon: ImagePlus, href: '/upload-image', section: 'create' },
    { name: 'Upload Reel', icon: Video, href: '/upload-reel', section: 'create' },
    ...(user?.isAdmin ? [{ name: 'Admin Panel', icon: Shield, href: '/admin/dashboard', isAdmin: true, section: 'admin' }] : []),
  ];

  const isActive = (href) => {
    return pathname === href || (href.includes('/profile/') && pathname.includes('/profile/'));
  };

  const NavItem = ({ item, onClick }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    
    return (
      <Link
        href={item.href}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(item.href)}
        onMouseLeave={() => setIsHovered(null)}
        className={`
          group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
          transition-all duration-300 ease-out
          ${active 
            ? 'bg-primary text-primary-foreground shadow-glow' 
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }
          ${item.isAdmin ? 'border border-amber-500/30 bg-amber-500/5' : ''}
        `}
      >
        {/* Icon container */}
        <span className={`
          relative flex-shrink-0 p-1.5 rounded-lg
          transition-all duration-300
          ${active ? 'bg-white/20' : 'group-hover:bg-primary/10'}
        `}>
          <Icon className={`
            w-5 h-5 transition-transform duration-300
            ${isHovered === item.href && !active ? 'scale-110' : ''}
          `} />
          
          {/* Badge */}
          {item.badge > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          )}
        </span>
        
        {/* Label - hidden on collapsed sidebar */}
        <span className={`
          hidden xl:flex items-center gap-2 font-medium text-sm
          transition-all duration-300
          ${isHovered === item.href ? 'translate-x-0.5' : ''}
        `}>
          {item.name}
          {item.badge > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </span>

        {/* Active indicator line */}
        {active && (
          <span className="absolute right-2 w-1 h-6 bg-white/30 rounded-full hidden xl:block" />
        )}

        {/* Hover glow effect */}
        {isHovered === item.href && !active && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 pointer-events-none" />
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
  const discoverItems = menuItems.filter(item => item.section === 'discover');
  const createItems = menuItems.filter(item => item.section === 'create');
  const adminItems = menuItems.filter(item => item.section === 'admin');

  return (
    <>
      {/* Desktop Sidebar - Glassmorphism Design */}
      <div className="hidden lg:flex w-20 xl:w-64 h-screen fixed flex-col glass border-r border-border/50 z-40">
        {/* Logo Section */}
        <div className="p-4 xl:p-5 border-b border-border/50">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-glow transition-transform duration-300 group-hover:scale-105">
                <img 
                  src="/images/logo.png" 
                  alt="ProConnect Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Pulse animation */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent opacity-30 blur-lg animate-pulse" />
            </div>
            <div className="hidden xl:block">
              <h1 className="text-lg font-bold gradient-text">ProConnect</h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Creative Network</p>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          {/* Main Navigation */}
          <div className="px-2 space-y-1">
            <SectionLabel>Main</SectionLabel>
            {mainItems.map(item => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>

          {/* Discover Section */}
          <div className="px-2 mt-6 space-y-1">
            <SectionLabel>Discover</SectionLabel>
            {discoverItems.map(item => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>

          {/* Create Section */}
          <div className="px-2 mt-6 space-y-1">
            <SectionLabel>Create</SectionLabel>
            {createItems.map(item => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>

          {/* Admin Section */}
          {adminItems.length > 0 && (
            <div className="px-2 mt-6 space-y-1">
              <SectionLabel>Admin</SectionLabel>
              {adminItems.map(item => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats Card - Desktop Only */}
        <div className="hidden xl:block px-3 mb-4">
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">Quick Profile</p>
                <p className="text-[10px] text-muted-foreground">View your stats</p>
              </div>
            </div>
            <Link 
              href={`/profile/@${user?.username || 'username'}`}
              className="w-full btn-primary text-xs py-2 rounded-lg flex items-center justify-center gap-2 group"
            >
              <span>View Profile</span>
              <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Theme Toggle & Settings */}
        <div className="p-3 border-t border-border/50 space-y-2">
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
              transition-all duration-300 ease-out
              ${pathname === '/settings'
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }
            `}
          >
            <Settings className="w-5 h-5 transition-transform duration-500 group-hover:rotate-90" />
            <span className="hidden xl:block font-medium text-sm">Settings</span>
          </Link>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={handleMobileItemClick}
          />
          
          {/* Sidebar Panel */}
          <div className="absolute left-0 top-0 w-full max-w-sm h-full glass overflow-y-auto animate-slide-in-left">
            {/* Mobile Header */}
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-3" onClick={handleMobileItemClick}>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold gradient-text">ProConnect</h1>
                  <p className="text-[10px] text-muted-foreground -mt-0.5">Creative Network</p>
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
                  <NavItem key={item.href} item={item} onClick={handleMobileItemClick} />
                ))}
              </div>

              {/* Discover Section */}
              <div className="mt-6 space-y-1">
                <SectionLabel>Discover</SectionLabel>
                {discoverItems.map(item => (
                  <NavItem key={item.href} item={item} onClick={handleMobileItemClick} />
                ))}
              </div>

              {/* Create Section */}
              <div className="mt-6 space-y-1">
                <SectionLabel>Create</SectionLabel>
                {createItems.map(item => (
                  <NavItem key={item.href} item={item} onClick={handleMobileItemClick} />
                ))}
              </div>

              {/* Admin Section */}
              {adminItems.length > 0 && (
                <div className="mt-6 space-y-1">
                  <SectionLabel>Admin</SectionLabel>
                  {adminItems.map(item => (
                    <NavItem key={item.href} item={item} onClick={handleMobileItemClick} />
                  ))}
                </div>
              )}

              {/* Mobile Quick Card */}
              <div className="mt-8 glass-card p-4 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
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
                  className="w-full btn-primary text-sm py-2.5 rounded-lg flex items-center justify-center gap-2"
                >
                  View Profile
                </Link>
              </div>

              {/* Theme & Settings */}
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between px-3 py-2 glass-subtle rounded-xl">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle size="small" showLabel />
                </div>
                
                <Link
                  href="/settings"
                  onClick={handleMobileItemClick}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-xl
                    transition-all duration-300
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
