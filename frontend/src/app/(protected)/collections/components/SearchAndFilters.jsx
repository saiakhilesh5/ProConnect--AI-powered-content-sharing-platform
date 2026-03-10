import React from 'react';
import { 
  Search, 
  ChevronDown, 
  SortAsc, 
  Clock, 
  Calendar, 
  Grid, 
  Layers 
} from 'lucide-react';

const SearchAndFilters = ({ 
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  sortOption,
  sortOrder,
  setSortOption,
  setSortOrder,
  filterOpen,
  setFilterOpen
}) => {
  // Helper for sort option display
  const getSortDisplay = () => {
    switch(sortOption) {
      case 'updatedAt':
        return sortOrder === 'desc' ? 'Most Recent' : 'Oldest First';
      case 'name':
        return sortOrder === 'asc' ? 'Name (A-Z)' : 'Name (Z-A)';
      case 'imageCount':
        return sortOrder === 'desc' ? 'Most Images' : 'Fewest Images';
      default:
        return 'Sort';
    }
  };

  return (
    <div className="mb-6 grid grid-cols-12 gap-4">
      <div className="col-span-12 md:col-span-9">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-input border border-border w-full focus-within:ring-1 focus-within:ring-violet-500 transition">
          <Search className="text-muted-foreground w-4 h-4 flex-shrink-0" />
          <input 
            type="text" 
            placeholder="Search collections by name, description or tags..." 
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm"
            style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="col-span-12 md:col-span-3 grid grid-cols-2">
        <div className="flex gap-3 items-end">
          <button 
            onClick={() => setViewMode('grid')}
            className={`flex-1 flex items-center justify-center p-2 rounded-lg border ${viewMode === 'grid' ? 'bg-accent border-violet-500' : 'border-border hover:bg-accent/50'} transition-colors`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`flex-1 flex items-center justify-center p-2 rounded-lg border ${viewMode === 'list' ? 'bg-accent border-violet-500' : 'border-border hover:bg-accent/50'} transition-colors`}
          >
            <Layers className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchAndFilters; 