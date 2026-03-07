"use client";

import React, { useState, useEffect } from "react";
import {
  Home,
  Search,
  Compass,
  Film,
  MessageCircle,
  Heart,
  PlusSquare,
  User,
  Menu,
  Settings,
  Bookmark,
  Moon,
  Sun,
  LogOut,
  Shield,
  CircleFadingPlus
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useMessages } from "@/context/MessagesContext";
import { useTheme } from "@/context/ThemeContext";

const InstagramSidebar = ({ mobileSidebarOpen, setMobileSidebarOpen }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { unreadCount } = useMessages();
  const { theme, toggleTheme } = useTheme();
  
  const [mounted, setMounted] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMore && !e.target.closest('.more-menu')) {
        setShowMore(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMore]);

  // Handle mobile sidebar item click
  const handleMobileItemClick = () => {
    setMobileSidebarOpen(false);
  };

  const isActive = (href) => {
    if (href === '/feed' && pathname === '/') return true;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const isCollapsed = showSearch || showNotifications;

  const menuItems = [
    { 
      name: 'Home', 
      icon: Home, 
      href: '/feed',
      activeFill: true 
    },
    { 
      name: 'Search', 
      icon: Search, 
      action: () => {
        setShowSearch(!showSearch);
        setShowNotifications(false);
      },
      isActive: showSearch
    },
    { 
      name: 'Explore', 
      icon: Compass, 
      href: '/explore' 
    },
    { 
      name: 'Reels', 
      icon: Film, 
      href: '/reels',
      activeFill: true 
    },
    { 
      name: 'Messages', 
      icon: MessageCircle, 
      href: '/messages',
      badge: mounted ? unreadCount : 0 
    },
    { 
      name: 'Notifications', 
      icon: Heart, 
      action: () => {
        setShowNotifications(!showNotifications);
        setShowSearch(false);
      },
      isActive: showNotifications
    },
    { 
      name: 'Create', 
      icon: PlusSquare, 
      href: '/upload-image'
    },
    { 
      name: 'Profile', 
      icon: User, 
      href: `/profile/@${user?.username || 'username'}`,
      isProfile: true 
    },
  ];

  const moreMenuItems = [
    { name: 'Settings', icon: Settings, href: '/settings' },
    { name: 'Saved', icon: Bookmark, href: '/collections' },
    { 
      name: theme === 'dark' ? 'Light mode' : 'Dark mode', 
      icon: theme === 'dark' ? Sun : Moon, 
      action: toggleTheme 
    },
    ...(user?.isAdmin ? [{ name: 'Admin Panel', icon: Shield, href: '/admin/dashboard' }] : []),
    { name: 'Log out', icon: LogOut, action: logout },
  ];

  const NavItem = ({ item, onClick }) => {
    const Icon = item.icon;
    const active = item.isActive || (item.href && isActive(item.href));
    
    const handleClick = (e) => {
      if (item.action) {
        e.preventDefault();
        item.action();
      }
      onClick?.();
    };

    const content = (
      <div
        onClick={handleClick}
        className={`
          group relative flex items-center gap-4 p-3 rounded-lg cursor-pointer
          transition-all duration-200 hover:bg-secondary
          ${active ? 'font-bold' : 'font-normal'}
        `}
      >
        {/* Icon */}
        <div className="relative">
          {item.isProfile && user?.profilePicture ? (
            <div className={`w-6 h-6 rounded-full overflow-hidden ${active ? 'ring-2 ring-foreground' : ''}`}>
              <Image
                src={user.profilePicture}
                alt={user.username}
                width={24}
                height={24}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <Icon 
              className={`w-6 h-6 transition-transform group-hover:scale-110 ${
                active && item.activeFill ? 'fill-foreground' : ''
              }`}
              strokeWidth={active ? 2.5 : 2}
            />
          )}
          
          {/* Badge */}
          {item.badge > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          )}
        </div>
        
        {/* Label - hidden when collapsed */}
        <span className={`text-foreground transition-all duration-200 ${
          isCollapsed ? 'hidden xl:hidden' : 'hidden xl:block'
        }`}>
          {item.name}
        </span>
      </div>
    );

    if (item.href) {
      return <Link href={item.href}>{content}</Link>;
    }
    return content;
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-card border-r border-border z-40 transition-all duration-300 ${
        isCollapsed ? 'w-[72px]' : 'w-[72px] xl:w-[244px]'
      }`}>
        {/* Logo */}
        <div className="px-3 pt-6 pb-4">
          <Link href="/feed" className="block">
            {isCollapsed ? (
              <div className="w-6 h-6 mx-auto">
                <Image
                  src="/images/logo.png"
                  alt="ProConnect"
                  width={24}
                  height={24}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <>
                {/* Icon only on narrow */}
                <div className="w-6 h-6 xl:hidden mx-auto">
                  <Image
                    src="/images/logo.png"
                    alt="ProConnect"
                    width={24}
                    height={24}
                    className="w-full h-full object-contain"
                  />
                </div>
                {/* Full logo on wide */}
                <h1 className="hidden xl:block text-xl font-semibold px-3 gradient-text">
                  ProConnect
                </h1>
              </>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>

        {/* More Menu */}
        <div className="px-3 pb-6 relative more-menu">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMore(!showMore);
            }}
            className={`
              w-full flex items-center gap-4 p-3 rounded-lg cursor-pointer
              transition-all duration-200 hover:bg-secondary
            `}
          >
            <Menu className="w-6 h-6" />
            <span className={`text-foreground ${isCollapsed ? 'hidden' : 'hidden xl:block'}`}>
              More
            </span>
          </button>

          {/* More Dropdown */}
          <AnimatePresence>
            {showMore && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-3 right-3 mb-2 bg-card rounded-xl border border-border shadow-xl overflow-hidden"
              >
                {moreMenuItems.map((item, index) => {
                  const Icon = item.icon;
                  const content = (
                    <div
                      onClick={() => {
                        if (item.action) item.action();
                        setShowMore(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary cursor-pointer transition-colors ${
                        index !== moreMenuItems.length - 1 ? 'border-b border-border/50' : ''
                      }`}
                    >
                      <Icon className="w-5 h-5 text-foreground" />
                      <span className="text-foreground text-sm">{item.name}</span>
                    </div>
                  );
                  return item.href ? (
                    <Link key={item.name} href={item.href}>{content}</Link>
                  ) : (
                    <div key={item.name}>{content}</div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Search Panel */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            className="hidden lg:block fixed left-[72px] top-0 w-[397px] h-screen bg-card border-r border-border z-30 rounded-r-2xl shadow-xl"
          >
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Search</h2>
              <input
                type="text"
                placeholder="Search"
                className="w-full px-4 py-3 bg-secondary rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-foreground">Recent</span>
                <button className="text-sm text-primary hover:text-primary/80">Clear all</button>
              </div>
              <div className="text-center py-8 text-muted-foreground text-sm">
                No recent searches.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            className="hidden lg:block fixed left-[72px] top-0 w-[397px] h-screen bg-card border-r border-border z-30 rounded-r-2xl shadow-xl overflow-y-auto"
          >
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-semibold text-foreground">Notifications</h2>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <span className="font-semibold text-foreground">This Week</span>
              </div>
              <div className="text-center py-8 text-muted-foreground text-sm">
                No notifications yet.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 z-50"
              onClick={handleMobileItemClick}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 w-[280px] h-full bg-card z-50 overflow-y-auto"
            >
              {/* Mobile Header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Image
                  src={user?.profilePicture || '/images/default-profile.jpg'}
                  alt={user?.username || 'User'}
                  width={50}
                  height={50}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-foreground">{user?.username}</p>
                  <p className="text-sm text-muted-foreground">{user?.fullName}</p>
                </div>
              </div>

              {/* Mobile Nav */}
              <nav className="p-3 space-y-1">
                {menuItems.map((item) => (
                  <NavItem key={item.name} item={item} onClick={handleMobileItemClick} />
                ))}
              </nav>

              {/* Mobile More Items */}
              <div className="border-t border-border p-3 space-y-1">
                {moreMenuItems.map((item) => {
                  const Icon = item.icon;
                  const content = (
                    <div
                      onClick={() => {
                        if (item.action) item.action();
                        handleMobileItemClick();
                      }}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary cursor-pointer"
                    >
                      <Icon className="w-6 h-6 text-foreground" />
                      <span className="text-foreground">{item.name}</span>
                    </div>
                  );
                  return item.href ? (
                    <Link key={item.name} href={item.href} onClick={handleMobileItemClick}>
                      {content}
                    </Link>
                  ) : (
                    <div key={item.name}>{content}</div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstagramSidebar;
