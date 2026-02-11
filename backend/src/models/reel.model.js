import mongoose from 'mongoose';
const { Schema } = mongoose;

// Reel schema definition
const reelSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    caption: {
      type: String,
      maxlength: 500,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true, // Cloudinary public ID
    },
    thumbnailUrl: {
      type: String,
      required: true,
    },
    thumbnailPublicId: {
      type: String,
    },
    duration: {
      type: Number, // Duration in seconds
      required: true,
      max: 60, // Max 60 seconds for reels
    },
    aspectRatio: {
      type: String,
      enum: ['9:16', '16:9', '1:1', '4:5'],
      default: '9:16',
    },
    category: {
      type: String,
      enum: ['entertainment', 'education', 'art', 'music', 'comedy', 'lifestyle', 'travel', 'food', 'fitness', 'other'],
      default: 'other',
    },
    tags: [{
      type: String,
      lowercase: true,
      trim: true,
    }],
    music: {
      name: String,
      artist: String,
      audioUrl: String,
    },
    visibility: {
      type: String,
      enum: ['public', 'private', 'followers'],
      default: 'public',
    },
    commentsAllowed: {
      type: Boolean,
      default: true,
    },
    // Analytics
    viewsCount: {
      type: Number,
      default: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    sharesCount: {
      type: Number,
      default: 0,
    },
    savesCount: {
      type: Number,
      default: 0,
    },
    // For tracking unique views
    viewedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    // Featured/Trending flags
    isFeatured: {
      type: Boolean,
      default: false,
    },
    trendingScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
reelSchema.index({ user: 1, createdAt: -1 });
reelSchema.index({ visibility: 1, createdAt: -1 });
reelSchema.index({ tags: 1 });
reelSchema.index({ category: 1 });
reelSchema.index({ trendingScore: -1 });
reelSchema.index({ viewsCount: -1 });

// Method to increment view count
reelSchema.methods.incrementViews = async function(userId) {
  if (userId && !this.viewedBy.includes(userId)) {
    this.viewedBy.push(userId);
    this.viewsCount += 1;
    // Update trending score based on engagement
    this.trendingScore = this.calculateTrendingScore();
    await this.save();
  }
};

// Calculate trending score
reelSchema.methods.calculateTrendingScore = function() {
  const hoursSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  const gravity = 1.8;
  
  const engagementScore = 
    (this.viewsCount * 1) + 
    (this.likesCount * 3) + 
    (this.commentsCount * 5) + 
    (this.sharesCount * 7) +
    (this.savesCount * 4);
  
  return engagementScore / Math.pow(hoursSinceCreation + 2, gravity);
};

export const Reel = mongoose.model('Reel', reelSchema);
