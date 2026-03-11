"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Search, 
  PlusSquare, 
  Film, 
  User,
  ImagePlus,
  Video,
  X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const BottomNavBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const navItems = [
    {
      href: '/feed',
      icon: Home,
      label: 'Home',
      activeMatch: ['/feed', '/']
    },
    {
      href: '/search',
      icon: Search,
      label: 'Search',
      activeMatch: ['/explore', '/search']
    },
    {
      href: '#create',
      icon: PlusSquare,
      label: 'Create',
      activeMatch: ['/upload-image', '/upload-reel'],
      isCreate: true
    },
    {
      href: '/reels',
      icon: Film,
      label: 'Reels',
      activeMatch: ['/reels']
    },
    {
      href: `/profile/${user?.username || ''}`,
      icon: User,
      label: 'Profile',
      activeMatch: ['/profile'],
      isProfile: true
    }
  ];

  const isActive = (item) => {
    return item.activeMatch.some(path => 
      pathname === path || pathname.startsWith(path + '/')
    );
  };

  // Don't show on certain pages
  const hiddenPaths = ['/login', '/signup', '/onboarding', '/admin'];
  if (hiddenPaths.some(path => pathname.startsWith(path))) {
    return null;
  }

  // Don't show when viewing reels full screen
  if (pathname === '/reels' || pathname.match(/^\/reels\/[^/]+$/)) {
    return null;
  }

  const handleCreateClick = (e) => {
    e.preventDefault();
    setShowCreateMenu(true);
  };

  const handleCreateOption = (path) => {
    setShowCreateMenu(false);
    router.push(path);
  };

  return (
    <>
      {/* Create Menu Overlay */}
      <AnimatePresence>
        {showCreateMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 z-[60]"
              onClick={() => setShowCreateMenu(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[70] bg-card rounded-t-2xl border-t border-border p-4 pb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Create</h3>
                <button
                  onClick={() => setShowCreateMenu(false)}
                  className="p-1 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleCreateOption('/upload-image')}
                  className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <ImagePlus className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Upload Image</span>
                </button>
                <button
                  onClick={() => handleCreateOption('/upload-reel')}
                  className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Video className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Upload Reel</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;

            if (item.isCreate) {
              return (
                <button
                  key="create"
                  onClick={handleCreateClick}
                  className="flex-1 flex items-center justify-center h-full relative"
                >
                  <div className="relative">
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className="w-7 h-7 flex items-center justify-center"
                    >
                      <Icon 
                        className={`w-7 h-7 ${
                          active 
                            ? 'text-foreground' 
                            : 'text-foreground/70'
                        }`}
                        strokeWidth={active ? 2.5 : 1.5}
                      />
                    </motion.div>
                  </div>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex items-center justify-center h-full relative"
              >
                {item.isProfile && user?.profilePicture ? (
                  <div className={`w-7 h-7 rounded-full overflow-hidden ${
                    active ? 'ring-2 ring-foreground' : ''
                  }`}>
                    <Image
                      src={user.profilePicture}
                      alt={user.username}
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="relative"
                  >
                    <Icon 
                      className={`w-7 h-7 transition-colors ${
                        active 
                          ? 'text-foreground' 
                          : 'text-foreground/70'
                      }`}
                      strokeWidth={active ? 2.5 : 1.5}
                      fill={active && (item.label === 'Home') ? 'currentColor' : 'none'}
                    />
                  </motion.div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNavBar;
