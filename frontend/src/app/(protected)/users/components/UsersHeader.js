"use client"
import React from 'react';
import { Users, Search, Filter, ChevronDown } from 'lucide-react';

const UsersHeader = ({ searchQuery, setSearchQuery, filterOpen, setFilterOpen }) => {
  return (
    <div className="p-6 pb-0">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center">
            <Users className="mr-2 w-5 h-5" />
            Users & Community
          </h1>
          <p className="text-muted-foreground text-sm">Connect with creators and build your network</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-input border border-border w-full md:w-60 focus-within:ring-1 focus-within:ring-violet-500 transition">
            <Search className="text-muted-foreground w-4 h-4 flex-shrink-0" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find users..." 
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm"
              style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
            />
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setFilterOpen(!filterOpen)} 
              className="flex items-center gap-2 bg-input border border-border rounded-lg py-2 px-4 hover:bg-secondary/50 transition"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filters</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {filterOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-input border border-border rounded-lg shadow-xl z-10">
                <div className="p-3">
                  <h3 className="text-sm font-medium mb-2">Filter by</h3>
                  <div className="space-y-2">
                    {['All Users', 'Verified', 'Pro Users', 'New Users'].map((filter, idx) => (
                      <div key={idx} className="flex items-center">
                        <input 
                          type="checkbox" 
                          id={`filter-${idx}`} 
                          className="w-4 h-4 rounded border-white/20 text-violet-600 focus:ring-violet-500 bg-zinc-700"
                        />
                        <label htmlFor={`filter-${idx}`} className="ml-2 text-sm text-muted-foreground">{filter}</label>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button className="text-xs text-violet-400 hover:text-violet-300">Apply Filters</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersHeader; 


