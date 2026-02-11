"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  ArrowDown,
  Wand2,
  CameraIcon,
  ArrowUpRight,
  Users,
  ImageIcon,
  Heart,
  Compass,
  Sparkles,
  ChevronRight,
  Star,
  Clock,
  Zap,
  MessageCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const HeroSection = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [activeCursorPos, setActiveCursorPos] = useState({ x: 0, y: 0 });
  const [showCursorEffect, setShowCursorEffect] = useState(false);
  const containerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showcaseMode, setShowcaseMode] = useState("trending"); // trending, new, or featured

  // Features showcase content
  const tabContent = [
    {
      id: 1,
      title: "Share your story",
      description:
        "Upload, organize, and showcase your best shots on Pixora — an image sharing platform built for creators and communities",
      image: "/images/bg-img1.jpg",
      color: "from-emerald-500 to-teal-700",
      icon: <Sparkles className="w-6 h-6 text-emerald-300" />,
    },
    {
      id: 2,
      title: "Organize with ease",
      description:
        "Curate collections, add tags, and keep your portfolio consistent with tools that work the way you do",
      image: "/images/bg-img2.jpg",
      color: "from-violet-600 to-indigo-800",
      icon: <Wand2 className="w-6 h-6 text-violet-300" />,
    },
    {
      id: 3,
      title: "Grow your audience",
      description:
        "Join a global community, get discovered through search, and connect with people who love your work",
      image: "/images/bg-img3.jpg",
      color: "from-amber-500 to-orange-700",
      icon: <Users className="w-6 h-6 text-amber-300" />,
    },
  ];

  // Sample images for different categories
  const trendingImages = [
    {
      id: 1,
      thumbnail: "/images/upload/img1.webp",
      creator: "Elena Bright",
      title: "Neon Dreams",
      likes: "3.4K",
    },
    {
      id: 2,
      thumbnail: "/images/upload/img2.jpg",
      creator: "Marcus Wave",
      title: "Ocean Whispers",
      likes: "2.8K",
    },
    {
      id: 3,
      thumbnail: "/images/upload/img3.jpg",
      creator: "Sasha Nova",
      title: "Cosmic Journey",
      likes: "4.1K",
    },
  ];

  const newImages = [
    {
      id: 4,
      thumbnail: "/images/upload/img5.png",
      creator: "Alex Morgan",
      title: "Urban Lights",
      likes: "1.2K",
    },
    {
      id: 5,
      thumbnail: "/images/bg-img1.jpg",
      creator: "Jordan Lee",
      title: "Mountain Vista",
      likes: "890",
    },
    {
      id: 6,
      thumbnail: "/images/bg-img2.jpg",
      creator: "Taylor Swift",
      title: "Digital Art",
      likes: "1.5K",
    },
  ];

  const featuredImages = [
    {
      id: 7,
      thumbnail: "/images/bg-img3.jpg",
      creator: "Chris Evans",
      title: "Sunset Glow",
      likes: "5.2K",
    },
    {
      id: 8,
      thumbnail: "/images/upload/img1.webp",
      creator: "Emma Stone",
      title: "Abstract Motion",
      likes: "4.8K",
    },
    {
      id: 9,
      thumbnail: "/images/upload/img3.jpg",
      creator: "Ryan Reynolds",
      title: "Nature's Beauty",
      likes: "6.1K",
    },
  ];

  // Get current images based on showcase mode
  const getCurrentImages = () => {
    switch (showcaseMode) {
      case "trending":
        return trendingImages;
      case "new":
        return newImages;
      case "featured":
        return featuredImages;
      default:
        return trendingImages;
    }
  };

  // Handle mouse movement for custom cursor effect
  const handleMouseMove = (e) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setActiveCursorPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  // Auto rotate tabs
  useEffect(() => {
    if (isHovering) return;

    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % tabContent.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isHovering, tabContent.length]);

  // Simulated trending searches
  const trendingSearches = ["street photography", "nature landscapes", "portrait shots", "abstract minimal", "city nights"];

  return (
    <motion.div
      ref={containerRef}
      className="relative w-full min-h-screen overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setShowCursorEffect(true)}
      onMouseLeave={() => setShowCursorEffect(false)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Dynamic background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary to-background">
        {/* Animated gradient blob */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-r from-primary/30 via-accent/20 to-rose-500/30 blur-3xl"
            animate={{
              x: [0, 100, -100, 0],
              y: [0, -100, 100, 0],
              scale: [1, 1.2, 0.8, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
            style={{
              top: "20%",
              left: "60%",
              filter: "blur(120px)",
            }}
          />

          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-r from-blue-800/30 via-cyan-600/20 to-emerald-500/30 blur-3xl"
            animate={{
              x: [0, -150, 150, 0],
              y: [0, 100, -100, 0],
              scale: [1, 0.8, 1.2, 1],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
            style={{
              top: "50%",
              left: "30%",
              filter: "blur(100px)",
            }}
          />
        </div>

        {/* Animated grid */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            backgroundPosition: "-1px -1px",
          }}
        >
          <motion.div
            className="absolute inset-0"
            animate={{
              x: [0, -30],
              y: [0, -30],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "linear",
            }}
          />
        </div>
      </div>

      {/* Custom cursor effect */}
      {showCursorEffect && (
        <motion.div
          className="pointer-events-none absolute w-40 h-40 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-sm"
          animate={{
            x: activeCursorPos.x - 80,
            y: activeCursorPos.y - 80,
            scale: [1, 1.02, 1],
          }}
          transition={{
            x: { duration: 0.1, ease: "easeOut" },
            y: { duration: 0.1, ease: "easeOut" },
            scale: { duration: 1.2, repeat: Infinity },
          }}
        />
      )}

      {/* Floating particles - reduced for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 5 + 2,
              height: Math.random() * 5 + 2,
              background: `rgba(${Math.floor(Math.random() * 100 + 155)}, ${Math.floor(
                Math.random() * 100 + 155
              )}, ${Math.floor(Math.random() * 100 + 155)}, ${Math.random() * 0.4 + 0.1})`,
              filter: "blur(1px)",
            }}
            initial={{
              x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
              opacity: 0,
            }}
            animate={{
              x: [
                null,
                Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
              ],
              y: [
                null,
                Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
              ],
              opacity: [0, 0.7, 0],
            }}
            transition={{
              duration: 15 + Math.random() * 20,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 min-h-screen pt-16 md:pt-24 pb-32">
        {/* Hero content - split in two columns */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-16">
          {/* Left column - Text and search */}
          <div className="w-full lg:w-2/5 pt-12 lg:pt-20">
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="flex items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-lg border border-primary/30 text-sm font-medium text-accent">
                  <Zap className="w-3.5 h-3.5 mr-1.5 text-accent" />
                  <span>ProConnect — creative community</span>
                </span>
              </motion.div>

              <motion.h1
                className="text-5xl md:text-6xl xl:text-7xl font-bold tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <span className="block text-foreground leading-tight">Unleash your</span>
                <span className="block bg-gradient-to-r from-primary via-accent to-cyan-400 bg-clip-text text-transparent leading-tight">
                  creative potential
                </span>
              </motion.h1>

              <motion.p
                className="text-xl text-muted-foreground max-w-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Share stunning images, build your audience, and discover inspiring creators — all in one fast, beautiful platform.
              </motion.p>

              {/* Enhanced Search bar */}
              <motion.div
                className="relative mt-8 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-purple-600 rounded-2xl blur-lg opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 transition duration-500 animate-pulse"></div>
                  <div className="relative flex items-center bg-card/90 backdrop-blur-xl rounded-xl border border-border overflow-hidden shadow-2xl">
                    <input
                      type="text"
                      placeholder="Search images, creators, or tags..."
                      className="flex-1 bg-transparent px-6 py-4 text-foreground placeholder-muted-foreground outline-none focus:placeholder-muted-foreground/70 transition-colors"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className="bg-gradient-to-r from-primary via-accent to-purple-600 hover:from-primary/90 hover:via-accent/90 hover:to-purple-500 text-white font-semibold py-4 px-8 transition-all duration-300 flex items-center group/btn">
                      <span>Search</span>
                      <CameraIcon className="w-5 h-5 ml-2 transform group-hover/btn:rotate-12 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Trending searches */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Trending:</span>
                  {trendingSearches.map((term, idx) => (
                    <button
                      key={idx}
                      className="text-sm text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary-hover px-3 py-1 rounded-full transition-colors duration-300"
                      onClick={() => setSearchQuery(term)}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                {/* Primary CTA */}
                <Link href={"/login"} className="group relative px-8 py-4 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-medium overflow-hidden shadow-lg shadow-primary/20">
                  <span className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
                  <span className="relative flex items-center justify-center">
                    <Sparkles className="w-5 h-5 mr-2" />
                    <span>Start sharing</span>
                    <ArrowUpRight className="w-5 h-5 ml-2 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </span>
                </Link>

                {/* Secondary CTA */}
                <Link href={"/login"} className="px-8 py-4 rounded-lg bg-secondary backdrop-blur-sm border border-border text-foreground font-medium hover:bg-secondary-hover transition-colors duration-300 flex items-center justify-center">
                  <Compass className="w-5 h-5 mr-2" />
                  <span>Explore gallery</span>
                </Link>
              </motion.div>

              {/* Trust indicators */}
              <motion.div
                className="flex items-center gap-6 pt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">50k+</span> creators
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-accent" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">5M+</span> images
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-cyan-400" />
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">99%</span> satisfaction
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Right column - Interactive Gallery & Features Showcase */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="w-full lg:w-3/5"
          >
            <div className="relative">
              {/* Featured content gallery */}
              <div className="relative w-full mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-foreground">Featured Photos</h3>
                  <div className="flex gap-2">
                    <button
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${showcaseMode === "trending"
                          ? "bg-primary text-white"
                          : "bg-secondary text-muted-foreground hover:bg-secondary-hover"
                        }`}
                      onClick={() => setShowcaseMode("trending")}
                    >
                      <span className="flex items-center">
                        <Star className="w-3.5 h-3.5 mr-1" />
                        Trending
                      </span>
                    </button>
                    <button
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${showcaseMode === "new"
                          ? "bg-accent text-white"
                          : "bg-secondary text-muted-foreground hover:bg-secondary-hover"
                        }`}
                      onClick={() => setShowcaseMode("new")}
                    >
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        New
                      </span>
                    </button>
                    <button
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${showcaseMode === "featured"
                          ? "bg-cyan-600 text-white"
                          : "bg-secondary text-muted-foreground hover:bg-secondary-hover"
                        }`}
                      onClick={() => setShowcaseMode("featured")}
                    >
                      <span className="flex items-center">
                        <Zap className="w-3.5 h-3.5 mr-1" />
                        Featured
                      </span>
                    </button>
                  </div>
                </div>

                {/* Gallery grid - now shows different images based on category */}
                <div className="grid grid-cols-3 gap-4">
                  {getCurrentImages().map((image, idx) => (
                    <motion.div
                      key={image.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 * idx }}
                      className="group relative rounded-xl overflow-hidden aspect-[3/4] bg-card/60 backdrop-blur-sm border border-border"
                    >
                      <div className="absolute inset-0 overflow-hidden">
                        <Image
                          src={image.thumbnail}
                          alt={image.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <p className="text-xs text-gray-300 mb-1">{image.creator}</p>
                        <h4 className="text-lg font-medium text-white">{image.title}</h4>
                        <div className="flex justify-between items-center mt-2">
                          <span className="flex items-center text-sm text-rose-300">
                            <Heart className="w-3.5 h-3.5 mr-1 fill-rose-300" />
                            {image.likes}
                          </span>
                          <button className="text-white/80 hover:text-white">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Feature tabs */}
              <div
                className="relative bg-gradient-to-br from-card/80 to-background/80 backdrop-blur-xl rounded-xl border border-border overflow-hidden shadow-xl shadow-primary/10"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                {/* Feature navigation */}
                <div className="flex border-b border-border">
                  {tabContent.map((tab, idx) => (
                    <button
                      key={tab.id}
                      className={`flex-1 py-4 px-3 flex items-center justify-center gap-2 text-center text-sm font-medium transition-all ${activeTab === idx
                          ? "text-foreground border-b-2 border-accent bg-secondary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      onClick={() => setActiveTab(idx)}
                    >
                      {tab.icon}
                      <span>{tab.title.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>

                {/* Feature content area */}
                <div className="relative h-80 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0"
                    >
                      <div className="relative h-full w-full overflow-hidden">
                        {/* Background image */}
                        <div className="absolute inset-0 opacity-60">
                          <Image
                            src={
                              tabContent[activeTab].image ||
                              "/images/bg-img1.jpg"
                            }
                            alt={tabContent[activeTab].title}
                            fill
                            className="object-cover"
                          />
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${tabContent[activeTab].color} mix-blend-multiply opacity-70`}
                          ></div>
                        </div>

                        {/* Content overlay */}
                        <div className="absolute inset-0 flex flex-col justify-end p-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                          <h3 className="text-3xl font-bold text-white mb-3">
                            {tabContent[activeTab].title}
                          </h3>
                          <p className="text-white/90 text-lg mb-6 max-w-xl">
                            {tabContent[activeTab].description}
                          </p>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="self-start bg-secondary backdrop-blur-sm hover:bg-secondary-hover text-foreground font-medium py-3 px-5 rounded-lg border border-border transition-all flex items-center"
                          >
                            <span>Explore this feature</span>
                            <ChevronRight className="w-5 h-5 ml-1" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Stats/features bar */}
                <div className="grid grid-cols-3 border-t border-border bg-card/70 backdrop-blur-md">
                  {[
                    { label: "AI Models", value: "40+", icon: <Sparkles className="w-4 h-4 text-primary" /> },
                    { label: "Daily Creations", value: "2M+", icon: <ImageIcon className="w-4 h-4 text-accent" /> },
                    { label: "Global Community", value: "800K+", icon: <Users className="w-4 h-4 text-cyan-400" /> },
                  ].map((stat, idx) => (
                    <div
                      key={idx}
                      className="py-4 px-4 text-center border-r last:border-r-0 border-border flex flex-col items-center"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {stat.icon}
                        <p className="text-xl font-bold text-foreground">{stat.value}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.7 }}
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
        >
          <p className="text-muted-foreground text-sm mb-2">Scroll to explore more</p>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: "loop",
            }}
          >
            <ArrowDown className="text-muted-foreground" />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default HeroSection;