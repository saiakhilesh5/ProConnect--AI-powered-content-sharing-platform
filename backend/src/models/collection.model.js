import mongoose from 'mongoose';
const { Schema } = mongoose;

// Collection schema definition
const collectionSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model, the owner of the collection
      required: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 100, // Maximum length for the collection name
    },
    description: {
      type: String,
      maxlength: 500, // Maximum length for the collection description
      default: '',
    },
    coverImage: {
      type: String,
      default: null, // URL to the cover image (could be the first image in the collection)
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'private',
    },
    images: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image',
    }],
    tags: [{
      type: String,
      lowercase: true,
      trim: true,
    }],
    isStarred: {
      type: Boolean,
      default: false,
    },
    lastViewed: {
      type: Date,
      default: null,
    }
  },
  {
    timestamps: true, // Automatically handle createdAt and updatedAt fields
  }
);

// Add a virtual field for imageCount
collectionSchema.virtual('imageCount').get(function() {
  return this.images ? this.images.length : 0;
});

// Ensure virtual fields are included when converting to JSON
collectionSchema.set('toJSON', { virtuals: true });
collectionSchema.set('toObject', { virtuals: true });

export const Collection = mongoose.model('Collection', collectionSchema); 