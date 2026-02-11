"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('dark');
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { user, isAuthenticated } = useAuth() || {};

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const initializeTheme = () => {
      // Check localStorage first
      const savedTheme = localStorage.getItem('pixora-theme');
      if (savedTheme) {
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const systemTheme = prefersDark ? 'dark' : 'light';
        setThemeState(systemTheme);
        applyTheme(systemTheme);
      }
      setIsLoading(false);
    };

    initializeTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('pixora-theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Sync theme from user profile when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.preferences?.theme) {
      const userTheme = user.preferences.theme;
      if (userTheme !== theme) {
        setThemeState(userTheme);
        applyTheme(userTheme);
        localStorage.setItem('pixora-theme', userTheme);
      }
    }
  }, [isAuthenticated, user]);

  // Apply theme to document
  const applyTheme = (newTheme) => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Add new theme class
    root.classList.add(newTheme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', newTheme === 'dark' ? '#0a0a0f' : '#fafafa');
    }
  };

  // Toggle theme with smooth transition
  const toggleTheme = useCallback(async () => {
    setIsTransitioning(true);
    
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    
    // Add transition class to body for smooth color transitions
    document.body.classList.add('theme-transitioning');
    
    // Update state and localStorage
    setThemeState(newTheme);
    localStorage.setItem('pixora-theme', newTheme);
    applyTheme(newTheme);

    // Sync to database if user is authenticated
    if (isAuthenticated) {
      try {
        await axios.patch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/preferences`,
          { theme: newTheme },
          { withCredentials: true }
        );
      } catch (error) {
        console.error('Failed to sync theme to server:', error);
      }
    }

    // Remove transition class after animation
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
      setIsTransitioning(false);
    }, 300);
  }, [theme, isAuthenticated]);

  // Set specific theme
  const setTheme = useCallback(async (newTheme) => {
    if (newTheme !== 'dark' && newTheme !== 'light') return;
    
    setIsTransitioning(true);
    document.body.classList.add('theme-transitioning');
    
    setThemeState(newTheme);
    localStorage.setItem('pixora-theme', newTheme);
    applyTheme(newTheme);

    if (isAuthenticated) {
      try {
        await axios.patch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/preferences`,
          { theme: newTheme },
          { withCredentials: true }
        );
      } catch (error) {
        console.error('Failed to sync theme to server:', error);
      }
    }

    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
      setIsTransitioning(false);
    }, 300);
  }, [isAuthenticated]);

  const value = {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isLoading,
    isTransitioning,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
