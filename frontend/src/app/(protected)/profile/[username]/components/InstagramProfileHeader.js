"use client"
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Settings,
  UserPlus,
  UserMinus,
  MoreHorizontal,
  Grid,
  Film,
  Bookmark,
  Tag,
  ChevronDown,
  Link2,
  CheckCircle,
  Music,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

const InstagramProfileHeader = ({
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

  // Format numbers like Instagram (1.2K, 1.5M)
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 10000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    if (num >= 1000) {
      return num.toLocaleString();
    }
    return num.toString();
  };

  // Instagram-style tabs
  const tabs = [
    { id: 'works', icon: Grid, label: 'Posts' },
    { id: 'reels', icon: Film, label: 'Reels' },
    { id: 'collections', icon: Bookmark, label: 'Saved' },
    { id: 'tagged', icon: Tag, label: 'Tagged' }
  ];

  const copyProfileLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/profile/@${profile.username}`);
    toast.success('Profile link copied!');
  };

  return (
    <div className="bg-card">
      {/* Mobile Header */}
      <div className="md:hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-foreground">{profile.username}</span>
            {profile.isVerified && (
              <CheckCircle className="w-4 h-4 text-blue-500 fill-blue-500" />
            )}
            <ChevronDown className="w-4 h-4 text-foreground" />
          </div>
          <div className="flex items-center gap-4">
            {isOwnProfile ? (
              <>
                <Link href="/upload-image">
                  <svg className="w-6 h-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </Link>
                <button onClick={() => setShowOptions(!showOptions)}>
                  <MoreHorizontal className="w-6 h-6 text-foreground" />
                </button>
              </>
            ) : (
              <button onClick={() => setShowOptions(!showOptions)}>
                <MoreHorizontal className="w-6 h-6 text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Profile Section */}
        <div className="px-4 py-4">
          <div className="flex items-start gap-6">
            {/* Profile Picture */}
            <button 
              onClick={() => isOwnProfile && setProfileOpen?.(true)}
              className="flex-shrink-0"
            >
              <div className={`w-20 h-20 rounded-full p-[3px] ${
                profile.hasStory 
                  ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600' 
                  : 'bg-border'
              }`}>
                <div className="w-full h-full rounded-full bg-background p-[2px]">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <Image
                      src={profile.profilePicture || '/images/default-profile.jpg'}
                      alt={profile.username}
                      width={77}
                      height={77}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </button>

            {/* Stats */}
            <div className="flex-1 flex justify-around pt-2">
              <button className="text-center">
                <div className="font-semibold text-foreground text-lg">
                  {formatNumber(profile.postsCount)}
                </div>
                <div className="text-sm text-muted-foreground">posts</div>
              </button>
              <button 
                onClick={() => setActiveTab?.('followers')}
                className="text-center"
              >
                <div className="font-semibold text-foreground text-lg">
                  {formatNumber(profile.followersCount)}
                </div>
                <div className="text-sm text-muted-foreground">followers</div>
              </button>
              <button 
                onClick={() => setActiveTab?.('following')}
                className="text-center"
              >
                <div className="font-semibold text-foreground text-lg">
                  {formatNumber(profile.followingCount)}
                </div>
                <div className="text-sm text-muted-foreground">following</div>
              </button>
            </div>
          </div>

          {/* Name and Bio */}
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-foreground">{profile.fullName}</h1>
              {profile.isPremium && (
                <span className="bg-amber-500/20 text-amber-500 text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Zap className="w-3 h-3" />
                </span>
              )}
            </div>
            {profile.category && (
              <p className="text-sm text-muted-foreground">{profile.category}</p>
            )}
            {profile.bio && (
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                {profile.bio}
              </p>
            )}
            {profile.socialLinks?.website && (
              <a 
                href={profile.socialLinks.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary mt-1"
              >
                <Link2 className="w-3 h-3" />
                {profile.socialLinks.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            {isOwnProfile ? (
              <>
                <Link 
                  href="/settings"
                  className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-semibold text-foreground text-center transition-colors"
                >
                  Edit profile
                </Link>
                <Link 
                  href="/settings"
                  className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-semibold text-foreground text-center transition-colors"
                >
                  Share profile
                </Link>
              </>
            ) : (
              <>
                <button
                  onClick={handleFollowToggle}
                  disabled={followLoading}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1 ${
                    isFollowing 
                      ? 'bg-secondary hover:bg-secondary/80 text-foreground' 
                      : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                  }`}
                >
                  {followLoading ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isFollowing ? (
                    'Following'
                  ) : (
                    'Follow'
                  )}
                </button>
                <Link
                  href={`/messages?user=${profile.username}`}
                  className="flex-1 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-semibold text-foreground text-center transition-colors"
                >
                  Message
                </Link>
              </>
            )}
            {!isOwnProfile && (
              <button className="p-1.5 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors">
                <UserPlus className="w-5 h-5 text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Highlights Row - Placeholder */}
        <div className="px-4 py-2 flex gap-4 overflow-x-auto scrollbar-hide">
          {isOwnProfile && (
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-16 h-16 rounded-full border border-border flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-xs text-foreground">New</span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block max-w-[935px] mx-auto px-4 py-8">
        <div className="flex gap-8 md:gap-24">
          {/* Profile Picture */}
          <button 
            onClick={() => isOwnProfile && setProfileOpen?.(true)}
            className="flex-shrink-0"
          >
            <div className={`w-[150px] h-[150px] rounded-full p-[4px] ${
              profile.hasStory 
                ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600' 
                : 'bg-transparent'
            }`}>
              <div className="w-full h-full rounded-full bg-background p-[3px]">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <Image
                    src={profile.profilePicture || '/images/default-profile.jpg'}
                    alt={profile.username}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </button>

          {/* Profile Info */}
          <div className="flex-1">
            {/* Username and Actions */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-normal text-foreground">{profile.username}</h1>
                {profile.isVerified && (
                  <CheckCircle className="w-5 h-5 text-blue-500 fill-blue-500" />
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <>
                    <Link 
                      href="/settings"
                      className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-semibold text-foreground transition-colors"
                    >
                      Edit profile
                    </Link>
                    <Link 
                      href="/settings"
                      className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-semibold text-foreground transition-colors"
                    >
                      View archive
                    </Link>
                    <Link href="/settings">
                      <Settings className="w-6 h-6 text-foreground" />
                    </Link>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className={`px-6 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        isFollowing 
                          ? 'bg-secondary hover:bg-secondary/80 text-foreground' 
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                    >
                      {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <Link
                      href={`/messages?user=${profile.username}`}
                      className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-semibold text-foreground transition-colors"
                    >
                      Message
                    </Link>
                    <button className="p-1">
                      <MoreHorizontal className="w-6 h-6 text-foreground" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-10 mt-6">
              <div>
                <span className="font-semibold text-foreground">{formatNumber(profile.postsCount)}</span>
                <span className="text-foreground ml-1">posts</span>
              </div>
              <button onClick={() => setActiveTab?.('followers')}>
                <span className="font-semibold text-foreground">{formatNumber(profile.followersCount)}</span>
                <span className="text-foreground ml-1">followers</span>
              </button>
              <button onClick={() => setActiveTab?.('following')}>
                <span className="font-semibold text-foreground">{formatNumber(profile.followingCount)}</span>
                <span className="text-foreground ml-1">following</span>
              </button>
            </div>

            {/* Name and Bio */}
            <div className="mt-5">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-foreground">{profile.fullName}</h2>
                {profile.isPremium && (
                  <span className="bg-amber-500/20 text-amber-500 text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Zap className="w-3 h-3" /> Premium
                  </span>
                )}
              </div>
              {profile.category && (
                <p className="text-sm text-muted-foreground">{profile.category}</p>
              )}
              {profile.bio && (
                <p className="text-sm text-foreground mt-1 whitespace-pre-wrap max-w-md">
                  {profile.bio}
                </p>
              )}
              {profile.socialLinks?.website && (
                <a 
                  href={profile.socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary font-semibold mt-1"
                >
                  <Link2 className="w-3 h-3" />
                  {profile.socialLinks.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Highlights */}
        <div className="flex gap-6 mt-10 pb-4 overflow-x-auto scrollbar-hide">
          {isOwnProfile && (
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-[77px] h-[77px] rounded-full border border-border flex items-center justify-center">
                <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-foreground">New</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-border">
        <div className="max-w-[935px] mx-auto flex justify-center md:gap-12">
          {tabs.slice(0, isOwnProfile ? 3 : 2).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab?.(tab.id)}
                className={`flex items-center gap-1 py-4 px-2 border-t transition-colors ${
                  isActive 
                    ? 'border-foreground text-foreground -mt-px' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-xs font-medium tracking-wider uppercase hidden md:inline">
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

export default InstagramProfileHeader;
