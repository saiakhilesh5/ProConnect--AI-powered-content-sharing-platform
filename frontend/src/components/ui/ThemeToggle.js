"use client";
import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

// Animated Sun/Moon Toggle - Premium Version
export const ThemeToggle = ({ size = 'default', showLabel = false, className = '' }) => {
  const { theme, toggleTheme, isTransitioning } = useTheme();
  const isDark = theme === 'dark';

  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-10 h-10',
    large: 'w-12 h-12',
  };

  const iconSizes = {
    small: 'w-4 h-4',
    default: 'w-5 h-5',
    large: 'w-6 h-6',
  };

  return (
    <button
      onClick={toggleTheme}
      disabled={isTransitioning}
      className={`
        relative group flex items-center gap-3
        ${className}
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div
        className={`
          ${sizeClasses[size]}
          relative rounded-xl
          bg-secondary hover:bg-secondary-hover
          border border-border hover:border-border-hover
          flex items-center justify-center
          transition-all duration-300 ease-out
          hover:shadow-glow hover:scale-105
          active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {/* Sun Icon */}
        <Sun
          className={`
            ${iconSizes[size]}
            absolute text-amber-500
            transition-all duration-500 ease-out
            ${isDark 
              ? 'opacity-0 rotate-90 scale-0' 
              : 'opacity-100 rotate-0 scale-100'
            }
          `}
        />
        
        {/* Moon Icon */}
        <Moon
          className={`
            ${iconSizes[size]}
            absolute text-violet-400
            transition-all duration-500 ease-out
            ${isDark 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-0'
            }
          `}
        />

        {/* Glow effect on hover */}
        <div
          className={`
            absolute inset-0 rounded-xl
            transition-opacity duration-300
            ${isDark 
              ? 'bg-violet-500/20' 
              : 'bg-amber-500/20'
            }
            opacity-0 group-hover:opacity-100
          `}
        />
      </div>

      {showLabel && (
        <span className="text-sm font-medium text-foreground-secondary">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};

// Switch Style Toggle - For Settings Page
export const ThemeSwitch = ({ className = '' }) => {
  const { theme, toggleTheme, isTransitioning } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      disabled={isTransitioning}
      className={`
        relative w-16 h-8 rounded-full
        bg-secondary border border-border
        transition-all duration-300
        hover:border-border-hover
        focus:outline-none focus:ring-2 focus:ring-primary/50
        ${isDark ? 'bg-primary/20' : 'bg-amber-500/20'}
        ${className}
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Track icons */}
      <Sun className="absolute left-1.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 opacity-50" />
      <Moon className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 opacity-50" />
      
      {/* Sliding knob */}
      <div
        className={`
          absolute top-1 w-6 h-6 rounded-full
          bg-card shadow-md
          flex items-center justify-center
          transition-all duration-300 ease-out
          ${isDark ? 'left-9' : 'left-1'}
        `}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-violet-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
      </div>
    </button>
  );
};

// Segmented Control - For Navbar/Header
export const ThemeSegmented = ({ className = '' }) => {
  const { theme, setTheme, isTransitioning } = useTheme();

  const options = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
  ];

  return (
    <div
      className={`
        inline-flex p-1 rounded-xl
        bg-secondary border border-border
        ${className}
      `}
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          disabled={isTransitioning}
          className={`
            relative px-4 py-2 rounded-lg
            flex items-center gap-2
            text-sm font-medium
            transition-all duration-200
            ${theme === value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }
          `}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
};

// Floating Theme Toggle - Fixed Position
export const ThemeToggleFloat = () => {
  const { theme, toggleTheme, isTransitioning } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      disabled={isTransitioning}
      className="
        fixed bottom-6 left-6 z-50
        w-12 h-12 rounded-full
        bg-card border border-border
        shadow-lg hover:shadow-glow
        flex items-center justify-center
        transition-all duration-300
        hover:scale-110 active:scale-95
        group
      "
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-6 h-6">
        <Sun
          className={`
            w-6 h-6 absolute text-amber-500
            transition-all duration-500
            ${isDark ? 'opacity-0 rotate-180 scale-0' : 'opacity-100 rotate-0 scale-100'}
          `}
        />
        <Moon
          className={`
            w-6 h-6 absolute text-violet-400
            transition-all duration-500
            ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-180 scale-0'}
          `}
        />
      </div>
      
      {/* Tooltip */}
      <span className="
        absolute left-full ml-3 px-2 py-1
        bg-popover text-popover-foreground
        text-xs font-medium rounded-md
        border border-border shadow-md
        opacity-0 group-hover:opacity-100
        transition-opacity duration-200
        whitespace-nowrap pointer-events-none
      ">
        {isDark ? 'Light mode' : 'Dark mode'}
      </span>
    </button>
  );
};

export default ThemeToggle;
