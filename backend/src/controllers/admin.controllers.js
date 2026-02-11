import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateAdminReport, getQuickStats } from "../utils/aiReportGenerator.js";
import { User } from "../models/user.model.js";
import { Image } from "../models/image.model.js";
import jwt from "jsonwebtoken";

// Admin credentials from environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@pixora.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

/**
 * @desc Admin Login with dedicated credentials
 * @route POST /api/admin/login
 * @access Public
 */
export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Check against admin credentials
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    throw new ApiError(401, "Invalid admin credentials");
  }

  // Generate admin token with special flag
  const adminToken = jwt.sign(
    { 
      isAdmin: true, 
      email: ADMIN_EMAIL,
      role: 'admin'
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: "24h" }
  );

  res.cookie("adminToken", adminToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  res.status(200).json(
    new ApiResponse(200, "Admin login successful", {
      email: ADMIN_EMAIL,
      isAdmin: true,
      token: adminToken
    })
  );
});

/**
 * @desc Admin Logout
 * @route POST /api/admin/logout
 * @access Admin
 */
export const adminLogout = asyncHandler(async (req, res) => {
  res.clearCookie("adminToken");
  res.status(200).json(
    new ApiResponse(200, "Admin logged out successfully")
  );
});

/**
 * @desc Verify admin session
 * @route GET /api/admin/verify
 * @access Public
 */
export const verifyAdminSession = asyncHandler(async (req, res) => {
  const token = req.cookies?.adminToken || req.headers['x-admin-token'] || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(200).json(
      new ApiResponse(200, "No admin session", { isAdmin: false })
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.isAdmin && decoded.role === 'admin') {
      return res.status(200).json(
        new ApiResponse(200, "Admin session valid", { 
          isAdmin: true, 
          email: decoded.email 
        })
      );
    }
  } catch (error) {
    // Token invalid or expired
  }

  res.status(200).json(
    new ApiResponse(200, "Invalid admin session", { isAdmin: false })
  );
});

/**
 * Middleware to check if user is admin (via token)
 */
export const isAdmin = asyncHandler(async (req, res, next) => {
  // Check for admin token first
  const adminToken = req.cookies?.adminToken || req.headers['x-admin-token'];
  
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
      if (decoded.isAdmin && decoded.role === 'admin') {
        req.isAdminSession = true;
        return next();
      }
    } catch (error) {
      // Token invalid, continue to check user
    }
  }

  // Fallback to checking user's isAdmin flag
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  const user = await User.findById(req.user._id);
  
  if (!user || !user.isAdmin) {
    throw new ApiError(403, "Admin access required");
  }

  next();
});

/**
 * @desc Generate AI-powered admin report
 * @route POST /api/admin/generate-report
 * @access Admin
 */
export const generateReport = asyncHandler(async (req, res) => {
  const { period = 'weekly' } = req.body;

  const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly'];
  if (!validPeriods.includes(period)) {
    throw new ApiError(400, "Invalid period. Must be: daily, weekly, monthly, or quarterly");
  }

  const result = await generateAdminReport(period);

  if (!result.success) {
    throw new ApiError(500, result.error || "Failed to generate report");
  }

  res.status(200).json(
    new ApiResponse(200, "Report generated successfully", result.report)
  );
});

/**
 * @desc Get quick dashboard statistics
 * @route GET /api/admin/quick-stats
 * @access Admin
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const result = await getQuickStats();

  if (!result.success) {
    throw new ApiError(500, result.error || "Failed to get statistics");
  }

  res.status(200).json(
    new ApiResponse(200, "Statistics retrieved successfully", result.stats)
  );
});

/**
 * @desc Get all users with pagination (Admin)
 * @route GET /api/admin/users
 * @access Admin
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search || '';
  const filter = req.query.filter || 'all'; // all, banned, premium, admin

  let query = {};

  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { fullName: { $regex: search, $options: 'i' } }
    ];
  }

  if (filter === 'banned') query.isBanned = true;
  if (filter === 'premium') query.isPremium = true;
  if (filter === 'admin') query.isAdmin = true;

  const users = await User.find(query)
    .select('-password -loginHistory')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, "Users retrieved successfully", {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  );
});

/**
 * @desc Toggle user ban status (Admin)
 * @route PATCH /api/admin/users/:userId/ban
 * @access Admin
 */
export const toggleUserBan = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  const user = await User.findById(userId);
  
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isAdmin) {
    throw new ApiError(403, "Cannot ban an admin user");
  }

  user.isBanned = !user.isBanned;
  if (user.isBanned) {
    user.banReason = reason || "Violated community guidelines";
    user.banDate = new Date();
  } else {
    user.banReason = null;
    user.banDate = null;
  }

  await user.save();

  res.status(200).json(
    new ApiResponse(200, user.isBanned ? "User banned successfully" : "User unbanned successfully", {
      userId: user._id,
      isBanned: user.isBanned
    })
  );
});

/**
 * @desc Toggle user admin status (Admin)
 * @route PATCH /api/admin/users/:userId/admin
 * @access Admin
 */
export const toggleUserAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Prevent removing own admin status
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(403, "Cannot modify your own admin status");
  }

  user.isAdmin = !user.isAdmin;
  await user.save();

  res.status(200).json(
    new ApiResponse(200, user.isAdmin ? "Admin access granted" : "Admin access revoked", {
      userId: user._id,
      isAdmin: user.isAdmin
    })
  );
});

/**
 * @desc Delete an image (Admin)
 * @route DELETE /api/admin/images/:imageId
 * @access Admin
 */
export const deleteImage = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const { reason } = req.body;

  const image = await Image.findById(imageId).populate('user', 'username');
  
  if (!image) {
    throw new ApiError(404, "Image not found");
  }

  // Add warning to user
  if (image.user) {
    await User.findByIdAndUpdate(image.user._id, {
      $push: {
        warnings: {
          reason: reason || "Content removed by admin",
          type: 'image',
          date: new Date()
        }
      }
    });
  }

  await Image.findByIdAndDelete(imageId);

  res.status(200).json(
    new ApiResponse(200, "Image deleted successfully", { imageId })
  );
});

/**
 * @desc Get platform overview (Admin)
 * @route GET /api/admin/overview
 * @access Admin
 */
export const getPlatformOverview = asyncHandler(async (req, res) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Import models dynamically to avoid circular dependencies
  const { Comment } = await import("../models/comment.model.js");
  const { Like } = await import("../models/like.model.js");
  const { Report } = await import("../models/report.model.js");

  const [
    totalUsers,
    totalImages,
    usersToday,
    uploadsToday,
    commentsToday,
    bannedUsers,
    premiumUsers,
    activeUsers7d,
    pendingReports,
    flaggedContent,
    topTags
  ] = await Promise.all([
    User.countDocuments(),
    Image.countDocuments(),
    User.countDocuments({ createdAt: { $gte: today } }),
    Image.countDocuments({ createdAt: { $gte: today } }),
    Comment.countDocuments({ createdAt: { $gte: today } }),
    User.countDocuments({ isBanned: true }),
    User.countDocuments({ isPremium: true }),
    // Active users in last 7 days (uploaded or commented or liked)
    User.countDocuments({ 
      $or: [
        { lastLogin: { $gte: sevenDaysAgo } },
        { createdAt: { $gte: sevenDaysAgo } }
      ]
    }),
    // Pending reports
    Report.countDocuments({ status: 'pending' }).catch(() => 0),
    // Flagged content (images with moderation issues)
    Image.countDocuments({ 
      $or: [
        { isFlagged: true },
        { 'moderation.isApproved': false }
      ]
    }).catch(() => 0),
    // Top tags
    Image.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]).catch(() => [])
  ]);

  res.status(200).json(
    new ApiResponse(200, "Overview retrieved successfully", {
      totalUsers,
      totalImages,
      usersToday,
      uploadsToday,
      commentsToday,
      bannedUsers,
      premiumUsers,
      activeUsers7d,
      pendingReports,
      flaggedContent,
      topTags
    })
  );
});
