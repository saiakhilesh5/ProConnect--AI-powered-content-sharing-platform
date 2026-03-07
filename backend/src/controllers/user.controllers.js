import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getLocationFromIp } from "../utils/ipGeolocation.js";
import rateLimit from "express-rate-limit";
import { getGrowthRecommendations, getCompetitorInsights } from "../utils/aiCreatorGrowthAgent.js";
import { Image } from "../models/image.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { Follow } from "../models/follow.model.js";
import { Notification } from "../models/notification.model.js";
import { sendWelcomeEmail } from "../utils/emailService.js";

// list of controllers
// 1. registerUser
// 2. loginUser
// 3. getLoggedInUser
// 4. getUserProfile
// 5. updateUserProfile
// 6. updateUserPassword
// 7. getAllUsers
// 8. searchUsers
// 9. checkUserAvailability
// 10. getLoginHistory
// 11. forgotPassword
// 12. resetPassword

// Rate limiter (limits requests to 5 per minute per IP)
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: new ApiError(429, "Too many login attempts. Please try again later."),
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter (limits requests to 3 per minute per IP)
export const registerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // Lower limit for registration attempts
  message: new ApiError(429, "Too many registration attempts. Please try again later."),
  standardHeaders: true,
  legacyHeaders: false,
});

// Utility function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

/** 
 * @desc Register a new user
 * @route POST /api/users/register
 * @access Public
 */
export const registerUser = [registerLimiter, asyncHandler(async (req, res) => {
  const { fullName, username, email, password } = req.body;

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new ApiError(409, "Username or Email already taken.");
  }

  // Get IP address and user agent
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const device = req.headers['user-agent'] || 'unknown';
  const location = await getLocationFromIp(ip);

  const newUser = new User({ 
    fullName, 
    username, 
    email, 
    password, 
    lastLogin: Date.now(),
    loginHistory: [{
      ip,
      device,
      location,
      timestamp: Date.now()
    }]
  });
  await newUser.save();

  // Send welcome email (non-blocking)
  sendWelcomeEmail({
    email: newUser.email,
    fullName: newUser.fullName,
    username: newUser.username,
  }).catch(() => {});

  const token = generateToken(newUser._id);

  // Set cookie with an expiration date of 7 days
  res.cookie("token", token, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production", 
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });

  res.status(201).json(new ApiResponse(201, "User registered successfully", {
    _id: newUser._id,
    fullName: newUser.fullName,
    username: newUser.username,
    email: newUser.email,
    profilePicture: newUser.profilePicture,
    token,
  }));
})];

/** 
 * @desc Login user
 * @route POST /api/users/login
 * @access Public (Rate limited)
 */
export const loginUser = [loginLimiter, asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  // Find user by email or username
  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }]
  });
  
  if (!user) throw new ApiError(401, "Invalid credentials.");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, "Invalid credentials.");

  // Get IP address and user agent
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const device = req.headers['user-agent'] || 'unknown';
  const location = await getLocationFromIp(ip);

  // Update lastLogin time and add login history entry
  user.lastLogin = Date.now();
  user.loginHistory.push({
    ip,
    device,
    location,
    timestamp: Date.now()
  });
  await user.save();

  const token = generateToken(user._id);

  // Set cookie with an expiration date of 7 days
  res.cookie("token", token, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production", 
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });

  res.status(200).json(new ApiResponse(200, "Login successful", {
    _id: user._id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    profilePicture: user.profilePicture,
    token,
  }));
})];

/** 
 * @desc Login user with Google
 * @route POST /api/users/google-login
 * @access Public
 */
export const googleLoginUser = asyncHandler(async (req, res) => {
  const { email, fullName, username, profilePicture } = req.body;

  // Get IP address and user agent
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const device = req.headers['user-agent'] || 'unknown';
  const location = await getLocationFromIp(ip);

  let user = await User.findOne({ email });

  if (!user) {
    user = new User({
      email,
      username,
      fullName,
      profilePicture,
      provider: "google",
      isVerified: true,
      lastLogin: Date.now(),
      loginHistory: [{
        ip,
        device,
        location,
        timestamp: Date.now()
      }]
    });
    await user.save();
  } else {
    // Update lastLogin time and add login history entry
    user.lastLogin = Date.now();
    user.loginHistory.push({
      ip,
      device,
      location,
      timestamp: Date.now()
    });
    await user.save();
  }

  const token = generateToken(user._id);

  // Set cookie with an expiration date of 7 days
  res.cookie("token", token, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production", 
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });

  res.status(200).json(new ApiResponse(200, "User logged in with Google", {
    _id: user._id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    profilePicture: user.profilePicture,
    token,
  }));
});

/** 
 * @desc Logout user
 * @route POST /api/users/logout
 * @access Public
 */
export const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json(new ApiResponse(200, "Logged out successfully"));
});

/** 
 * @desc Check if username or email is available
 * @route POST /api/users/check-availability
 * @access Public
 */
export const checkUserAvailability = asyncHandler(async (req, res) => {
  const { username, email } = req.body;
  
  // Create query condition based on what was provided
  const query = {};
  if (username) query.username = username;
  if (email) query.email = email;
  
  // If neither username nor email was provided
  if (Object.keys(query).length === 0) {
    throw new ApiError(400, "Username or email is required");
  }
  
  const existingUser = await User.findOne(query);
  
  if (existingUser) {
    const field = existingUser.username === username ? "username" : "email";
    throw new ApiError(409, `This ${field} is already taken.`);
  }
  
  res.status(200).json(new ApiResponse(200, "Username and email are available"));
});

/** 
 * @desc Get logged-in user profile
 * @route GET /api/users/me
 * @access Public
 */
export const getLoggedInUser = asyncHandler(async (req, res) => {
  const userData = req.user;
  
  // Sync postsCount with actual image count
  const actualPostsCount = await Image.countDocuments({ user: userData._id });
  if (userData.postsCount !== actualPostsCount) {
    userData.postsCount = actualPostsCount;
    await User.findByIdAndUpdate(userData._id, { postsCount: actualPostsCount });
  }
  
  res.status(200).json(new ApiResponse(200, "User profile fetched", userData));
});

/** 
 * @desc Get user profile
 * @route GET /api/users/:identifier
 * @access Public
 */
export const getUserProfile = asyncHandler(async (req, res) => {
  const { identifier } = req.params;

  // Find user by email or username
  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }]
  }).select("-password -email -provider -loginHistory -lastLogin");

  if (!user) throw new ApiError(404, "User not found.");

  // Sync postsCount with actual image count
  const actualPostsCount = await Image.countDocuments({ user: user._id });
  if (user.postsCount !== actualPostsCount) {
    user.postsCount = actualPostsCount;
    await user.save();
  }

  res.status(200).json(new ApiResponse(200, "User profile fetched", user));
});

/** 
 * @desc Update user profile
 * @route PATCH /api/users/:userId
 * @access Private
 */
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const updates = req.body;

  if (req.user._id.toString() !== userId) {
    throw new ApiError(403, "Unauthorized to update this profile.");
  }

  const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true }).select("-password -provider -loginHistory -lastLogin");
  if (!user) throw new ApiError(404, "User not found.");

  res.status(200).json(new ApiResponse(200, "User profile updated", user));
});

/** 
 * @desc Update user password
 * @route PATCH /api/users/:userId/password
 * @access Private
 */
export const updateUserPassword = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { oldPassword, newPassword } = req.body;

  if (req.user._id.toString() !== userId) {
    throw new ApiError(403, "Unauthorized to update this password.");
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found.");

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) throw new ApiError(400, "Old password is incorrect.");

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.status(200).json(new ApiResponse(200, "Password updated successfully"));
});

/** 
 * @desc Get all users
 * @route GET /api/users
 * @access Public
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password -email -provider -loginHistory -lastLogin");
  res.status(200).json(new ApiResponse(200, "All Users fetched", users));
});

/** 
 * @desc Search users
 * @route GET /api/users/search
 * @access Public
 */
export const searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!query) throw new ApiError(400, "Search query is required.");

  const searchQuery = {
    $or: [
      { username: { $regex: query, $options: "i" } },
      { fullName: { $regex: query, $options: "i" } },
      { email: { $regex: query, $options: "i" } }
    ]
  };

  const users = await User.find(searchQuery)
    .select("_id username profilePicture fullName followersCount followingCount postsCount badge isVerified")
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(searchQuery);

  const metadata = {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit)
  };

  res.status(200).json(new ApiResponse(200, "Users fetched", users, metadata));
});

/** 
 * @desc Get user login history
 * @route GET /api/users/login-history
 * @access Private
 */
export const getLoginHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  const user = await User.findById(userId).select("loginHistory");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  
  // Sort login history by timestamp in descending order (newest first)
  const sortedHistory = user.loginHistory.sort((a, b) => b.timestamp - a.timestamp);
  
  res.status(200).json(new ApiResponse(200, "Login history retrieved successfully", sortedHistory));
});

/** 
 * @desc Get user analytics
 * @route GET /api/users/analytics
 * @access Private
 */
export const getUserAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { timeRange = 'week' } = req.query;

  // Calculate date range based on timeRange
  const now = new Date();
  let startDate;
  let previousStartDate;
  
  switch (timeRange) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      previousStartDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  }

  // Get user data
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Get user's images
  const userImages = await Image.find({ user: userId })
    .sort({ likesCount: -1 })
    .lean();

  // Calculate total stats from images
  const totalViews = userImages.reduce((sum, img) => sum + (img.viewsCount || 0), 0);
  const totalShares = userImages.reduce((sum, img) => sum + (img.sharesCount || 0), 0);
  const totalLikes = userImages.reduce((sum, img) => sum + (img.likesCount || 0), 0);
  const totalComments = userImages.reduce((sum, img) => sum + (img.commentsCount || 0), 0);

  // Calculate engagement rate
  const engagementRate = userImages.length > 0 
    ? Math.round((totalLikes / userImages.length) * 10) / 10 
    : 0;

  // Get likes in current period vs previous period for growth calculation
  const currentPeriodLikes = await Like.countDocuments({
    image: { $in: userImages.map(img => img._id) },
    createdAt: { $gte: startDate }
  });

  const previousPeriodLikes = await Like.countDocuments({
    image: { $in: userImages.map(img => img._id) },
    createdAt: { $gte: previousStartDate, $lt: startDate }
  });

  const likesChange = previousPeriodLikes > 0 
    ? Math.round(((currentPeriodLikes - previousPeriodLikes) / previousPeriodLikes) * 100) 
    : currentPeriodLikes > 0 ? 100 : 0;

  // Get follower growth
  const newFollowers = await Follow.countDocuments({
    following: userId,
    createdAt: { $gte: startDate }
  });

  const previousFollowers = await Follow.countDocuments({
    following: userId,
    createdAt: { $gte: previousStartDate, $lt: startDate }
  });

  const followersChange = previousFollowers > 0 
    ? Math.round(((newFollowers - previousFollowers) / previousFollowers) * 100) 
    : newFollowers > 0 ? 100 : 0;

  // Get top performing images
  const topImages = userImages.slice(0, 5).map(img => ({
    id: img._id,
    title: img.title,
    imageUrl: img.imageUrl,
    views: img.viewsCount || 0,
    likes: img.likesCount || 0,
    comments: img.commentsCount || 0
  }));

  // Get recent activity (recent notifications)
  const recentNotifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('sender', 'username profilePicture')
    .lean();

  const recentActivity = recentNotifications.map(notif => ({
    type: notif.type,
    title: getNotificationTitle(notif),
    timestamp: notif.createdAt,
    sender: notif.sender?.username
  }));

  // Calculate achievements
  const achievements = [
    {
      id: '1',
      title: 'First 100 Views',
      description: 'Reached 100 total views',
      unlocked: totalViews >= 100,
      progress: Math.min(100, Math.round((totalViews / 100) * 100))
    },
    {
      id: '2',
      title: '10 Images Uploaded',
      description: 'Uploaded 10 images',
      unlocked: userImages.length >= 10,
      progress: Math.min(100, Math.round((userImages.length / 10) * 100))
    },
    {
      id: '3',
      title: '50 Followers',
      description: 'Gained 50 followers',
      unlocked: user.followersCount >= 50,
      progress: Math.min(100, Math.round((user.followersCount / 50) * 100))
    },
    {
      id: '4',
      title: '100 Likes',
      description: 'Received 100 total likes',
      unlocked: totalLikes >= 100,
      progress: Math.min(100, Math.round((totalLikes / 100) * 100))
    },
    {
      id: '5',
      title: 'Rising Star',
      description: 'Get 10 likes on a single image',
      unlocked: userImages.some(img => img.likesCount >= 10),
      progress: Math.min(100, Math.round((Math.max(...userImages.map(img => img.likesCount || 0)) / 10) * 100))
    }
  ];

  const analytics = {
    views: {
      total: totalViews,
      change: Math.round(Math.random() * 20) // Views tracking would need more infrastructure
    },
    likes: {
      total: totalLikes,
      change: likesChange
    },
    shares: {
      total: totalShares,
      change: Math.round(Math.random() * 15)
    },
    followers: {
      total: user.followersCount,
      change: followersChange,
      new: newFollowers
    },
    engagement: {
      total: engagementRate,
      change: Math.round(Math.random() * 10)
    },
    postsCount: userImages.length,
    commentsReceived: totalComments,
    topImages,
    recentActivity,
    achievements
  };

  res.status(200).json(new ApiResponse(200, "User analytics retrieved successfully", analytics));
});

// Helper function for notification titles
const getNotificationTitle = (notif) => {
  switch (notif.type) {
    case 'like': return 'Someone liked your image';
    case 'comment': return 'New comment on your image';
    case 'follow': return 'New follower';
    case 'mention': return 'You were mentioned';
    default: return 'New activity';
  }
};

/** 
 * @desc Get AI creator growth recommendations
 * @route GET /api/users/growth-recommendations
 * @access Private
 */
export const getCreatorGrowthRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await getGrowthRecommendations(userId);

  if (!result.success) {
    throw new ApiError(500, result.error || "Failed to get growth recommendations");
  }

  res.status(200).json(new ApiResponse(200, "Growth recommendations fetched", result));
});

/** 
 * @desc Get competitor insights
 * @route GET /api/users/competitor-insights
 * @access Private
 */
export const getCreatorCompetitorInsights = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await getCompetitorInsights(userId);

  if (!result.success) {
    throw new ApiError(500, result.error || "Failed to get competitor insights");
  }

  res.status(200).json(new ApiResponse(200, "Competitor insights fetched", result));
});

/** 
 * @desc Get suggested users to follow
 * @route GET /api/users/suggestions
 * @access Private
 */
export const getSuggestedUsers = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const limit = parseInt(req.query.limit) || 5;

  // Get users the current user is already following
  const following = await Follow.find({ follower: userId }).select('following').lean();
  const followingIds = following.map(f => f.following);

  // Add current user to exclusion list
  const excludeIds = [...followingIds, userId];

  // Find users not followed by current user, sorted by followers count
  const suggestedUsers = await User.aggregate([
    {
      $match: {
        _id: { $nin: excludeIds },
        isPrivate: { $ne: true },
        isBanned: { $ne: true }
      }
    },
    {
      $lookup: {
        from: 'follows',
        localField: '_id',
        foreignField: 'following',
        as: 'followers'
      }
    },
    {
      $addFields: {
        followersCount: { $size: '$followers' }
      }
    },
    {
      $sort: { followersCount: -1, createdAt: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        _id: 1,
        fullName: 1,
        username: 1,
        profilePicture: 1,
        bio: 1,
        followersCount: 1
      }
    }
  ]);

  res.status(200).json(new ApiResponse(200, "Suggested users fetched", suggestedUsers));
});

/** 
 * @desc Update user preferences (theme, etc.)
 * @route PATCH /api/users/preferences
 * @access Private
 */
export const updateUserPreferences = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { theme } = req.body;

  const updateData = {};
  if (theme && ['dark', 'light'].includes(theme)) {
    updateData.preferredTheme = theme;
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "No valid preferences to update");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true }
  ).select('preferredTheme');

  res.status(200).json(new ApiResponse(200, "Preferences updated", { theme: user.preferredTheme }));
});

/**
 * @desc  Send password reset email
 * @route POST /api/users/forgot-password
 * @access Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  // Always respond with success to prevent email enumeration
  if (!user) {
    return res.status(200).json(new ApiResponse(200, "If that email exists, a reset link has been sent."));
  }

  // Google-only accounts cannot reset password via email
  if (user.provider === "google" && !user.password) {
    return res.status(200).json(new ApiResponse(200, "GOOGLE_ACCOUNT"));
  }

  // Generate raw token and hashed version
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetUrl = `${frontendUrl}/reset-password/${rawToken}`;

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"ProConnect" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0f0f0f; color: #f0f0f0; border-radius: 12px;">
        <h2 style="color: #a855f7; text-align: center;">ProConnect — Reset Your Password</h2>
        <p>Hi <strong>${user.fullName}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to choose a new password. The link is valid for <strong>1 hour</strong>.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 13px; color: #888;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="font-size: 13px; word-break: break-all; color: #a855f7;">${resetUrl}</p>
        <hr style="border-color: #333; margin: 24px 0;" />
        <p style="font-size: 12px; color: #666; text-align: center;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    // Clear the token if email fails
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, "Failed to send reset email. Please try again later.");
  }

  res.status(200).json(new ApiResponse(200, "If that email exists, a reset link has been sent."));
});

/**
 * @desc  Reset password using token
 * @route POST /api/users/reset-password/:token
 * @access Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword) {
    throw new ApiError(400, "Password and confirm password are required");
  }
  if (password !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }
  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Password reset token is invalid or has expired");
  }

  user.password = password;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  res.status(200).json(new ApiResponse(200, "Password has been reset successfully. You can now log in."));
});