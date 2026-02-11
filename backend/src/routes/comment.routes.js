import express from 'express';
import { authenticateUser } from '../middlewares/auth.middleware.js';
import {
  createComment,
  getImageComments,
  getCommentReplies,
  updateComment,
  deleteComment,
  toggleCommentLike,
  getCommentLikes,
  testModeration
} from '../controllers/comment.controllers.js';

const router = express.Router();

// Test moderation endpoint (for testing only)
router.post('/test-moderation', testModeration);

// Comment routes
router.post('/:imageId', authenticateUser, createComment); // Create a new comment
router.get('/:imageId', getImageComments); // Get comments for an image
router.get('/:commentId/replies', getCommentReplies); // Get replies to a comment
router.patch('/:commentId', authenticateUser, updateComment); // Update a comment
router.delete('/:commentId', authenticateUser, deleteComment); // Delete a comment
router.post('/:commentId/like', authenticateUser, toggleCommentLike); // Toggle like/unlike on a comment
router.get('/:commentId/likes', getCommentLikes); // Get users who liked a comment

export default router;
