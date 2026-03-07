"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader } from 'lucide-react';

const SearchBar = ({ 
  initialQuery, 
  onSearch, 
  loading
}) => {
  const [inputValue, setInputValue] = useState(initialQuery || '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  
  useEffect(() => {
    setInputValue(initialQuery || '');
  }, [initialQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearch(inputValue);
      inputRef.current?.blur();
    }
  };

  const clearInput = () => {
    setInputValue('');
    inputRef.current?.focus();
  };

  return (
    <div className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="max-w-screen-xl mx-auto px-4 py-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className={`
            flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-secondary border border-border transition-all duration-200
            ${isFocused ? 'ring-1 ring-primary/50' : ''}
          `}>
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input 
              ref={inputRef}
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm"
              style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
              placeholder="Search"
            />
            
            {/* Clear button */}
            {inputValue && (
              <button 
                type="button"
                onClick={clearInput}
                className="p-1 bg-muted-foreground/30 rounded-full hover:bg-muted-foreground/50 transition-colors flex-shrink-0"
              >
                <X className="w-3 h-3 text-background" />
              </button>
            )}
            
            {/* Search button */}
            <button 
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="flex-shrink-0 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SearchBar;