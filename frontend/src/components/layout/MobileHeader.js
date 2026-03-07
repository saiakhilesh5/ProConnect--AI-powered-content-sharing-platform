"use client";
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Menu, User, Settings, LogOut, Bookmark, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MobileHeader = ({ mobileSidebarOpen, setMobileSidebarOpen }) => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left - Menu & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors hover:bg-secondary"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/feed" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <img 
                src="/images/logo.png" 
                alt="ProConnect" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-lg font-bold text-foreground">ProConnect</span>
          </Link>
        </div>

        {/* Right - Account */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-8 h-8 rounded-full overflow-hidden border-2 border-border hover:border-primary transition-colors"
          >
            <img
              src={user?.profilePicture || '/images/default-profile.jpg'}
              alt={user?.username || 'Account'}
              className="w-full h-full object-cover"
            />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
              >
                {/* User Info */}
                <div className="p-3 border-b border-border">
                  <Link 
                    href={`/profile/@${user?.username}`}
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img
                        src={user?.profilePicture || '/images/default-profile.jpg'}
                        alt={user?.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{user?.fullName}</p>
                      <p className="text-xs text-muted-foreground">@{user?.username}</p>
                    </div>
                  </Link>
                </div>

                {/* Menu Items */}
                <div className="p-1">
                  <Link
                    href={`/profile/@${user?.username}`}
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-foreground"
                  >
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Profile</span>
                  </Link>
                  <Link
                    href="/favorites"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-foreground"
                  >
                    <Bookmark className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Saved</span>
                  </Link>
                  <Link
                    href="/likes"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-foreground"
                  >
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Likes</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-foreground"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Settings</span>
                  </Link>
                </div>

                {/* Logout */}
                <div className="p-1 border-t border-border">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-500 w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Log out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
