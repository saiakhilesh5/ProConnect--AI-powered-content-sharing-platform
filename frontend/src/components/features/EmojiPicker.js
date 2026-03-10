"use client";
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Search, Clock, Heart, Flag, Coffee, Plane, Music, Lightbulb, Cat, X } from 'lucide-react';

// Comprehensive emoji categories
const EMOJI_CATEGORIES = {
  recent: {
    icon: Clock,
    name: 'Recently Used',
    emojis: [], // Will be populated from localStorage
  },
  smileys: {
    icon: Smile,
    name: 'Smileys & Emotion',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷',
      '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐',
      '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
      '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️',
      '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
    ],
  },
  gestures: {
    icon: Heart,
    name: 'Gestures & People',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆',
      '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️',
      '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀',
      '👁️', '👅', '👄', '💋', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', '👴', '👵',
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
      '💘', '💝', '💟', '💌', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '🗨️', '🗯️', '💭',
    ],
  },
  animals: {
    icon: Cat,
    name: 'Animals & Nature',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵',
      '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
      '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕',
      '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓',
      '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🎍', '🎋', '🍃', '🍂', '🍁', '🍄', '🌾',
      '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌙', '⭐',
    ],
  },
  food: {
    icon: Coffee,
    name: 'Food & Drink',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥',
      '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠',
      '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴',
      '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝',
      '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🍢', '🍡', '🍧',
      '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🧃', '🥤', '☕', '🍵', '🧉',
    ],
  },
  activities: {
    icon: Music,
    name: 'Activities',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
      '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌',
      '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣',
      '🧗', '🚴', '🚵', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🎸',
      '🪕', '🎻', '🎲', '🎯', '🎳', '🎮', '🎰', '🧩', '♠️', '♥️', '♦️', '♣️', '🃏', '🀄', '🎴', '🎁',
    ],
  },
  travel: {
    icon: Plane,
    name: 'Travel & Places',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🦯', '🦽',
      '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋',
      '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️',
      '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '🪝', '⛽', '🚧', '🚦', '🚥',
      '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋',
      '⛰️', '🏔️', '🗻', '🏕️', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦',
    ],
  },
  objects: {
    icon: Lightbulb,
    name: 'Objects',
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼',
      '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭',
      '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '🛢️', '💸', '💵',
      '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒️', '🛠️', '⛏️',
      '🔗', '⛓️', '🪝', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️',
      '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠',
    ],
  },
  symbols: {
    icon: Flag,
    name: 'Symbols & Flags',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
      '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈',
      '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️',
      '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹',
      '✅', '☑️', '✔️', '❌', '❎', '➕', '➖', '➗', '➰', '➿', '〽️', '✳️', '✴️', '❇️', '‼️', '⁉️',
      '❓', '❔', '❕', '❗', '〰️', '©️', '®️', '™️', '#️⃣', '*️⃣', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣',
      '🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇸', '🇬🇧', '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇳', '🇧🇷', '🇫🇷', '🇩🇪', '🇮🇹',
    ],
  },
};

// Quick reaction emojis for messages
export const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🔥', '💯', '🎉'];

// Skin tone modifiers
const SKIN_TONES = ['', '🏻', '🏼', '🏽', '🏾', '🏿'];

export function EmojiPicker({ onSelect, onClose, showQuickReactions = false, position = 'bottom' }) {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState([]);
  const [skinTone, setSkinTone] = useState(0);
  const searchInputRef = useRef(null);
  const containerRef = useRef(null);

  // Load recent emojis from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('proconnect_recent_emojis');
    if (stored) {
      try {
        setRecentEmojis(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent emojis');
      }
    }
  }, []);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    onSelect?.(emoji);
    
    // Update recent emojis
    const newRecent = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 24);
    setRecentEmojis(newRecent);
    localStorage.setItem('proconnect_recent_emojis', JSON.stringify(newRecent));
  };

  // Filter emojis based on search
  const getFilteredEmojis = () => {
    if (!searchQuery) return null;
    
    const query = searchQuery.toLowerCase();
    const allEmojis = Object.values(EMOJI_CATEGORIES)
      .flatMap(cat => cat.emojis || []);
    
    return allEmojis.filter(emoji => emoji.includes(query));
  };

  const filteredEmojis = getFilteredEmojis();

  // Get current category emojis
  const getCurrentEmojis = () => {
    if (activeCategory === 'recent') {
      return recentEmojis;
    }
    return EMOJI_CATEGORIES[activeCategory]?.emojis || [];
  };

  const positionClasses = {
    bottom: 'top-full mt-2',
    top: 'bottom-full mb-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  // Quick reactions view (for message reactions)
  if (showQuickReactions) {
    return (
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`absolute ${positionClasses[position]} z-50`}
      >
        <div className="bg-card border border-border rounded-full px-2 py-1.5 shadow-xl flex items-center gap-1">
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleEmojiSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center text-xl hover:bg-secondary rounded-full transition-all hover:scale-125"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => onClose?.(true)} // Pass true to open full picker
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-full transition-all"
          >
            <span className="text-lg">+</span>
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`absolute ${positionClasses[position]} z-50 w-80`}
    >
      <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden">
        {/* Header with search */}
        <div className="p-2 border-b border-zinc-700">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-input border border-border focus-within:ring-1 focus-within:ring-blue-500">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emojis..."
              className="flex-1 bg-transparent text-white text-sm"
              style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-zinc-400 hover:text-white flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center border-b border-border px-1 overflow-x-auto scrollbar-hide">
          {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => {
            const Icon = category.icon;
            const isActive = activeCategory === key;
            const hasEmojis = key === 'recent' ? recentEmojis.length > 0 : true;
            
            if (!hasEmojis && key === 'recent') return null;
            
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveCategory(key);
                  setSearchQuery('');
                }}
                className={`flex-shrink-0 p-2.5 transition-all ${
                  isActive
                    ? 'text-blue-500 border-b-2 border-blue-500 bg-muted'
                    : 'text-zinc-400 hover:text-white hover:bg-secondary/30'
                }`}
                title={category.name}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        {/* Emoji grid */}
        <div className="h-64 overflow-y-auto p-2">
          {/* Search results */}
          {filteredEmojis !== null ? (
            <div>
              <p className="text-xs text-zinc-500 mb-2 px-1">
                {filteredEmojis.length} results for "{searchQuery}"
              </p>
              {filteredEmojis.length > 0 ? (
                <div className="grid grid-cols-8 gap-0.5">
                  {filteredEmojis.map((emoji, i) => (
                    <button
                      key={`${emoji}-${i}`}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="w-8 h-8 flex items-center justify-center text-xl hover:bg-secondary rounded transition-all hover:scale-110"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
                  <span className="text-4xl mb-2">🔍</span>
                  <p className="text-sm">No emojis found</p>
                </div>
              )}
            </div>
          ) : (
            // Category emojis
            <div>
              <p className="text-xs text-zinc-500 mb-2 px-1">
                {EMOJI_CATEGORIES[activeCategory]?.name || 'Recently Used'}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {getCurrentEmojis().map((emoji, i) => (
                  <button
                    key={`${emoji}-${i}`}
                    onClick={() => handleEmojiSelect(emoji)}
                    className="w-8 h-8 flex items-center justify-center text-xl hover:bg-secondary rounded transition-all hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {activeCategory === 'recent' && recentEmojis.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
                  <span className="text-4xl mb-2">🕐</span>
                  <p className="text-sm">No recent emojis</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Skin tone selector */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-input">
          <span className="text-xs text-zinc-500">Skin tone:</span>
          <div className="flex items-center gap-1">
            {['👋', '👋🏻', '👋🏼', '👋🏽', '👋🏾', '👋🏿'].map((emoji, i) => (
              <button
                key={i}
                onClick={() => setSkinTone(i)}
                className={`w-6 h-6 flex items-center justify-center text-sm rounded transition-all ${
                  skinTone === i ? 'bg-secondary ring-1 ring-blue-500' : 'hover:bg-zinc-600'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Compact emoji button with picker
export function EmojiButton({ onSelect, className = '' }) {
  const [showPicker, setShowPicker] = useState(false);
  const buttonRef = useRef(null);

  return (
    <div className="relative" ref={buttonRef}>
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={`p-2 text-muted-foreground hover:text-zinc-200 hover:bg-secondary rounded-full transition-colors ${className}`}
      >
        <Smile className="w-5 h-5" />
      </button>
      
      <AnimatePresence>
        {showPicker && (
          <EmojiPicker
            onSelect={(emoji) => {
              onSelect?.(emoji);
              setShowPicker(false);
            }}
            onClose={() => setShowPicker(false)}
            position="top"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default EmojiPicker;


