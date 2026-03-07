"use client";
import React from 'react';
import { motion } from 'framer-motion';

const categories = [
  { id: 'all', label: 'All', emoji: '✨' },
  { id: 'nature', label: 'Nature', emoji: '🌿' },
  { id: 'architecture', label: 'Architecture', emoji: '🏛️' },
  { id: 'people', label: 'People', emoji: '👥' },
  { id: 'animals', label: 'Animals', emoji: '🐾' },
  { id: 'food', label: 'Food', emoji: '🍕' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'art', label: 'Art', emoji: '🎨' },
  { id: 'technology', label: 'Tech', emoji: '💻' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
];

const CategoryFilter = ({ selectedCategory, setSelectedCategory }) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((category) => (
        <motion.button
          key={category.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelectedCategory(category.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === category.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-foreground hover:bg-secondary/80'
          }`}
        >
          <span>{category.emoji}</span>
          <span>{category.label}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default CategoryFilter;
