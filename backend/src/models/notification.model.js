import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

const { Schema } = mongoose;

// Notification schema definition
const notificationSchema = new Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['follow', 'like', 'comment', 'reply', 'favorite', 'report', 'message', 'reel_like', 'reel_comment'],
    },
    read: {
      type: Boolean,
      default: false,
    },
    content: {
      type: String,
      required: true,
    },
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    relatedImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Image',
    },
    relatedComment: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Comment',
    },
    relatedReel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reel',
    },
    relatedConversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
    }
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

// Create notification
notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = await this.create(data);
    return notification;
  } catch (error) {
    throw new ApiError(500, "Error creating notification");
  }
};

// Get user's notifications with pagination
notificationSchema.statics.getUserNotifications = async function(userId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const notifications = await this.find({ recipient: userId })
    .populate('sender', 'username profilePicture fullName')
    .populate('relatedUser', 'username profilePicture fullName')
    .populate('relatedImage', 'title imageUrl')
    .populate('relatedComment', 'text')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments({ recipient: userId });

  return {
    notifications,
    metadata: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

// Mark notification as read
notificationSchema.statics.markAsRead = async function(notificationId, userId) {
  const notification = await this.findById(notificationId);
  
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  if (notification.recipient.toString() !== userId.toString()) {
    throw new ApiError(403, "Not authorized to update this notification");
  }

  notification.read = true;
  await notification.save();
  
  return notification;
};

// Mark all notifications as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  await this.updateMany(
    { recipient: userId, read: false },
    { read: true }
  );
};

// Delete notification
notificationSchema.statics.deleteNotification = async function(notificationId, userId) {
  const notification = await this.findById(notificationId);
  
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  if (notification.recipient.toString() !== userId.toString()) {
    throw new ApiError(403, "Not authorized to delete this notification");
  }

  await notification.deleteOne();
  return { message: "Notification deleted successfully" };
};

// Get unread notifications count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ recipient: userId, read: false });
};

// Delete old notifications (older than 30 days)
notificationSchema.statics.deleteOldNotifications = async function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  await this.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });
};

export const Notification = mongoose.model('Notification', notificationSchema);
