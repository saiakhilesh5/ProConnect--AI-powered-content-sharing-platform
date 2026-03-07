"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Settings,
  UserPlus,
  Grid,
  Film,
  Bookmark,
  MoreHorizontal,
  ChevronDown,
  CheckCircle,
  MessageCircle,
  UserMinus,
  Plus,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

const InstagramProfileLayout = ({
  profile,
  isOwnProfile,
  isFollowing,
  followLoading,
  handleFollowToggle,
  setProfileOpen,
  activeTab,
  setActiveTab
}) => {
  const [showOptions, setShowOptions] = useState(false);

  // Format number for display (e.g., 1.2K, 1.5M)
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Story highlights placeholder data
  const highlights = [
    { id: 'new', isAdd: true, label: 'New' },
    // Add actual highlights here when available
  ];

  const tabs = [
    { id: 'works', icon: Grid, label: 'Posts' },
    { id: 'reels', icon: Film, label: 'Reels' },
    { id: 'collections', icon: Bookmark, label: 'Saved' },
    ...(isOwnProfile ? [{ id: 'ai-insights', icon: Sparkles, label: 'AI Insights' }] : []),
  ];

  return (
    <div className="max-w-[935px] mx-auto px-4">
      {/* Mobile Header */}
      <div className="md:hidden py-2 flex items-center justify-between border-b border-border">
        <button className="p-2">
          <Settings className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-1">
          <span className="font-semibold text-lg">{profile.username}</span>
          {profile.isVerified && (
            <CheckCircle className="w-4 h-4 text-primary fill-primary" />
          )}
        </div>
        <button 
          className="p-2"
          onClick={() => setShowOptions(!showOptions)}
        >
          <MoreHorizontal className="w-6 h-6" />
        </button>
      </div>

      {/* Profile Section */}
      <div className="py-8">
        <div className="flex gap-8 md:gap-20 items-start">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            <button 
              onClick={() => isOwnProfile && setProfileOpen(true)}
              className="relative group"
            >
              <div className="w-20 h-20 md:w-[150px] md:h-[150px] rounded-full overflow-hidden ring-2 ring-border bg-secondary">
                <Image
                  src={profile.profilePicture || '/images/default-profile.jpg'}
                  alt={profile.fullName || profile.username}
                  width={150}
                  height={150}
                  className="w-full h-full object-cover"
                />
              </div>
              {isOwnProfile && (
                <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 w-6 h-6 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-3 h-3 md:w-4 md:h-4 text-primary-foreground" />
                </div>
              )}
            </button>
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            {/* Desktop Username Row */}
            <div className="hidden md:flex items-center gap-4 mb-5">
              <h1 className="text-xl font-normal">{profile.username}</h1>
              {profile.isVerified && (
                <CheckCircle className="w-5 h-5 text-primary fill-primary" />
              )}
              
              {isOwnProfile ? (
                <div className="flex items-center gap-2">
                  <Link 
                    href="/settings"
                    className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg font-semibold text-sm transition-colors"
                  >
                    Edit profile
                  </Link>
                  <Link 
                    href="/settings"
                    className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg font-semibold text-sm transition-colors"
                  >
                    View archive
                  </Link>
                  <button className="p-1">
                    <Settings className="w-6 h-6" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`px-6 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                      isFollowing 
                        ? 'bg-secondary hover:bg-secondary/80 text-foreground' 
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    }`}
                  >
                    {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <Link 
                    href={`/messages`}
                    className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg font-semibold text-sm transition-colors"
                  >
                    Message
                  </Link>
                  <button className="p-1">
                    <MoreHorizontal className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>

            {/* Stats Row - Desktop */}
            <div className="hidden md:flex items-center gap-10 mb-5">
              <div className="flex items-center gap-1">
                <span className="font-semibold">{formatNumber(profile.postsCount)}</span>
                <span className="text-foreground"> posts</span>
              </div>
              <button className="flex items-center gap-1 hover:opacity-70 transition-opacity">
                <span className="font-semibold">{formatNumber(profile.followersCount)}</span>
                <span className="text-foreground"> followers</span>
              </button>
              <button className="flex items-center gap-1 hover:opacity-70 transition-opacity">
                <span className="font-semibold">{formatNumber(profile.followingCount)}</span>
                <span className="text-foreground"> following</span>
              </button>
            </div>

            {/* Bio - Desktop */}
            <div className="hidden md:block">
              <p className="font-semibold">{profile.fullName}</p>
              {profile.bio && (
                <p className="text-sm whitespace-pre-wrap mt-1">{profile.bio}</p>
              )}
              {profile.website && (
                <a 
                  href={profile.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary text-sm font-semibold mt-1 block hover:underline"
                >
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Bio Section */}
        <div className="md:hidden mt-4">
          <p className="font-semibold text-sm">{profile.fullName}</p>
          {profile.bio && (
            <p className="text-sm whitespace-pre-wrap mt-0.5">{profile.bio}</p>
          )}
          {profile.website && (
            <a 
              href={profile.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary text-sm font-semibold mt-1 block hover:underline"
            >
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {/* Mobile Action Buttons */}
        <div className="md:hidden flex gap-2 mt-4">
          {isOwnProfile ? (
            <>
              <Link 
                href="/settings"
                className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg font-semibold text-sm text-center transition-colors"
              >
                Edit profile
              </Link>
              <Link 
                href="/settings"
                className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg font-semibold text-sm text-center transition-colors"
              >
                Share profile
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`flex-1 py-1.5 rounded-lg font-semibold text-sm transition-colors ${
                  isFollowing 
                    ? 'bg-secondary hover:bg-secondary/80 text-foreground' 
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                }`}
              >
                {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
              </button>
              <Link 
                href="/messages"
                className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg font-semibold text-sm text-center transition-colors"
              >
                Message
              </Link>
            </>
          )}
        </div>

        {/* Mobile Stats Row */}
        <div className="md:hidden flex items-center justify-around py-3 mt-2 border-t border-border">
          <div className="text-center">
            <p className="font-semibold">{formatNumber(profile.postsCount)}</p>
            <p className="text-xs text-muted-foreground">posts</p>
          </div>
          <button className="text-center">
            <p className="font-semibold">{formatNumber(profile.followersCount)}</p>
            <p className="text-xs text-muted-foreground">followers</p>
          </button>
          <button className="text-center">
            <p className="font-semibold">{formatNumber(profile.followingCount)}</p>
            <p className="text-xs text-muted-foreground">following</p>
          </button>
        </div>

        {/* Story Highlights */}
        {isOwnProfile && (
          <div className="flex gap-4 mt-6 overflow-x-auto pb-2 no-scrollbar">
            {/* Add New Highlight */}
            <button className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                <Plus className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
              </div>
              <span className="text-xs">New</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-t border-border">
        <div className="flex items-center justify-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center justify-center gap-1 py-4 px-8 md:px-12
                  border-t transition-colors
                  ${isActive 
                    ? 'border-foreground text-foreground' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                  }
                `}
                style={{ marginTop: '-1px' }}
              >
                <Icon className="w-4 h-4 md:w-3 md:h-3" />
                <span className="hidden md:inline uppercase text-xs font-semibold tracking-wider">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InstagramProfileLayout;
