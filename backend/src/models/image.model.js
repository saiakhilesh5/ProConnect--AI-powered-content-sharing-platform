/*
user
title
descri
image
category
license
tags
isPublic
comments allowed
size

likecount
favoritescount
*/

import mongoose from 'mongoose';
const { Schema } = mongoose;

// Image schema definition
const imageSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model, the uploader of the image
      required: true,
    },
    title: {
      type: String,
      maxlength: 100, // Maximum length for the image title
      required: true,
    },
    description: {
      type: String,
      maxlength: 500, // Maximum length for the image description
      required: true,
    },
    imageUrl: {
      type: String,
      required: true, // The URL to the image file (uploaded to cloud storage, etc.)
    },
    publicId: {
      type: String,
      required: true, // Cloudinary public ID for the image
    },
    category: {
      type: String,
      enum: ['abstract', 'portrait', 'landscape', 'cyberpunk', 'minimal', 'other'],
      default: 'other',
    },
    license: {
      type: String,
      enum: ['standard', 'extended'],
      default: 'standard',
    },
    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ], // Tags associated with the image, for search and categorization
    altText: {
      type: String,
      maxlength: 200, // Alt text for accessibility
      default: '',
    },
    aiGenerated: {
      type: Boolean,
      default: false, // Whether metadata was AI-generated
    },
    imageSize: {
      type: Number,
      default: 0, // Size of the image in kb
    },
    favoritesCount: {
      type: Number,
      default: 0, // Initial favorites by count for the image
    },
    likesCount: {
      type: Number,
      default: 0, // Initial like count for the image
    },
    commentsCount: {
      type: Number,
      default: 0, // Initial comment count for the image
    },
    visibility: {
      type: String,
      enum: ["public", "private", "followers"],
      default: "public",
    },
    commentsAllowed: {
      type: Boolean,
      default: true, // Whether the image is public or private
    },
  },
  {
    timestamps: true, // Automatically handle createdAt and updatedAt fields
  }
);

export const Image = mongoose.model('Image', imageSchema);