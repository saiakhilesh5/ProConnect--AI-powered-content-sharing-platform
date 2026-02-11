import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * @desc Create a new notification
 * @route POST /api/notifications
 * @access Private
 */
export const createNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.createNotification(req.body);
  
  res.status(201).json(
    new ApiResponse(201, "Notification created successfully", notification)
  );
});

/**
 * @desc Get user's notifications with pagination
 * @route GET /api/notifications
 * @access Private
 */
export const getUserNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const { notifications, metadata } = await Notification.getUserNotifications(
    req.user._id,
    page,
    limit
  );

  res.status(200).json(
    new ApiResponse(200, "Notifications fetched successfully", notifications, metadata)
  );
});

/**
 * @desc Mark notification as read
 * @route PATCH /api/notifications/:notificationId/read
 * @access Private
 */
export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  
  const notification = await Notification.markAsRead(notificationId, req.user._id);

  res.status(200).json(
    new ApiResponse(200, "Notification marked as read", notification)
  );
});

/**
 * @desc Mark all notifications as read
 * @route PATCH /api/notifications/read-all
 * @access Private
 */
export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  await Notification.markAllAsRead(req.user._id);

  res.status(200).json(
    new ApiResponse(200, "All notifications marked as read")
  );
});

/**
 * @desc Delete a notification
 * @route DELETE /api/notifications/:notificationId
 * @access Private
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const result = await Notification.deleteNotification(notificationId, req.user._id);

  res.status(200).json(
    new ApiResponse(200, result.message)
  );
});

/**
 * @desc Get unread notifications count
 * @route GET /api/notifications/unread/count
 * @access Private
 */
export const getUnreadNotificationsCount = asyncHandler(async (req, res) => {
  const count = await Notification.getUnreadCount(req.user._id);

  res.status(200).json(
    new ApiResponse(200, "Unread notifications count fetched", { count })
  );
});

/**
 * @desc Delete old notifications (older than 30 days)
 * @route DELETE /api/notifications/cleanup
 * @access Private
 */
export const deleteOldNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteOldNotifications();

  res.status(200).json(
    new ApiResponse(200, "Old notifications deleted successfully")
  );
});
