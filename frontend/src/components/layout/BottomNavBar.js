"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Home, 
  Search, 
  PlusSquare, 
  Film, 
  User
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const BottomNavBar = () => {
  const pathname = usePathname();
  const { user } = useAuth();

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
      href: '/upload',
      icon: PlusSquare,
      label: 'Create',
      activeMatch: ['/upload'],
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

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

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
              ) : item.isCreate ? (
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
  );
};

export default BottomNavBar;
