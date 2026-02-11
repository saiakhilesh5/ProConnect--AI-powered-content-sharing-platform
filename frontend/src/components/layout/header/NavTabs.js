"use client";

import { Compass, TrendingUp, Zap, Layers, ImagePlus, Sparkles } from "lucide-react";
import Link from "next/link";

const NavTabs = ({ currentTab, setCurrentTab, isCreatingMode, toggleCreatorMode }) => {
  // Navigation tabs
  const navTabs = [
    { id: "discover", label: "Discover", icon: Compass, href: "/dashboard" },
    { id: "trending", label: "Trending", icon: TrendingUp, href: "/tags" },
    { id: "new", label: "New", icon: Zap, href: "/upload-image" },
    { id: "collections", label: "Collections", icon: Layers, href: "/collections" },
  ];

  return (
    <div className="flex items-center">
      {/* Navigation tabs */}
      <div className="hidden lg:flex items-center space-x-1 mr-4">
        {navTabs.map((tab) => (
          <Link
            href={tab.href}
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentTab === tab.id
                ? "bg-violet-600/20 text-violet-400"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <tab.icon className={`w-4 h-4 mr-2 ${currentTab === tab.id ? "text-violet-400" : "text-muted-foreground"}`} />
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Creator Mode Toggle */}
      {/* <button
        onClick={toggleCreatorMode}
        className={`hidden md:flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          isCreatingMode
            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
        }`}
      >
        {isCreatingMode ? (
          <>
            <Sparkles className="w-3 h-3 mr-1.5 text-amber-400" />
            Creator Mode
          </>
        ) : (
          <>
            <ImagePlus className="w-3 h-3 mr-1.5" />
            Switch to Creator
          </>
        )}
      </button> */}
    </div>
  );
};

export default NavTabs; 