/*
Username
Email
Password
Full Name
Profile Picture
Cover Picture
Bio
Profile Visibility ["public", "private"]
Account Status ["active", "suspended", "deleted"]
Social Links
Is Verified
Is Premium
Is DP Confirm
User status ["online", "away", "busy", "offline"]

Followers Count
Following Count
Likes Count
Posts Count

Badge ["newbie", "rising", "pro", "trendsetter"]
- Badges:
  1. Newbie: default
  2. Rising: posts > 4
  3. Pro: followers > 49
  4. Trendsetter: likes > 100

Interactions Count
- Points on interactions:-
  1Point - Like
  2Point - Comment
  2Point - Save/Bookmark
  2Point - Follow


Login History
Provider ["credentials", "google"]
Last Login
*/

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

// User schema definition
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      maxlength: 30,
      trim: true,
      lowercase: true, // Store username in lowercase
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true, // Store email in lowercase
      match: [/\S+@\S+\.\S+/, "Please use a valid email address"],
    },
    password: {
      type: String,
      required: function () {
        return this.provider !== "google"; // Password is not required for Google login
      },
      minlength: 6,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 33, // Maximum length for full name
    },
    profilePicture: {
      type: String, // URL or file path of the profile picture
      default: "/images/default-profile.jpg", // Default profile picture
    },
    coverPicture: {
      type: String, // URL or file path of the profile picture
      default: "/images/default-cover.jpg", // Default profile picture
    },
    bio: {
      type: String,
      maxlength: 260, // Maximum length for user bio
      default: "Sharing moments, memories, and creativity through images. Explore my gallery and dive into a world of colors, landscapes, portraits, and more! Let’s connect and inspire each other through art. 📸✨",
    },
    badge: {
      type: String,
      enum: ["newbie", "rising", "pro", "trendsetter"],
      default: "newbie",
    },
    profileVisibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
    },
    userStatus: {
      type: String,
      enum: ["online", "away", "busy", "offline"],
      default: "online",
    },
    socialLinks: {
      instagram: {
        type: String,
        match: /^https?:\/\/(www\.)?instagram\.com\/[\w\-\.]+\/?$/,
      },
      twitter: {
        type: String,
        match: /^https?:\/\/(www\.)?twitter\.com\/[\w\-\.]+\/?$/,
      },
      facebook: {
        type: String,
        match: /^https?:\/\/(www\.)?facebook\.com\/[\w\-\.]+\/?$/,
      },
    },
    isDpConfirm: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials"
    },
    isVerified: {
      type: Boolean,
      default: function () {
        return this.provider === "google";
      },
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    storageUsed: {
      type: Number,
      default: 0, // Storage used in KB
    },
    loginHistory: [{
      ip: String,
      device: String,
      location: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    lastLogin: {
      type: Date,
      default: null,
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    postsCount: {
      type: Number,
      default: 0,
    },
    likesCount: {
      type: Number,
      default: 0,
    },
    interactionsCount: {
      type: Number,
      default: 0,
    },
    // Content moderation warnings
    warnings: [{
      reason: String,
      type: {
        type: String,
        enum: ['comment', 'image', 'other'],
      },
      date: {
        type: Date,
        default: Date.now
      }
    }],
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: null,
    },
    banDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash the user's password before saving the user document
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// Create the User model
export const User = mongoose.model("User", userSchema);