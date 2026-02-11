import { User } from "../models/user.model.js";

/**
 * Updates a user's badge based on their stats
 * @param {string} userId - The user's ID
 */
export const updateUserBadge = async (userId) => {
  const user = await User.findById(userId);
  
  if (!user) return;
  
  // Don't downgrade badges, only upgrade
  if (user.likesCount >= 100 && user.badge !== "trendsetter") {
    user.badge = "trendsetter";
    await user.save();
  } else if (user.followersCount >= 50 && user.badge !== "trendsetter" && user.badge !== "pro") {
    user.badge = "pro";
    await user.save();
  } else if (user.postsCount >= 5 && user.badge === "newbie") {
    user.badge = "rising";
    await user.save();
  }
  
  // If none of the conditions are met, keep the current badge
};

/**
 * Updates interaction points for a user
 * @param {string} userId - The user's ID
 * @param {string} interactionType - The type of interaction (like, comment, favorite, follow)
 */
export const updateInteractionPoints = async (userId, interactionType) => {
  let points = 0;
  
  switch (interactionType.toLowerCase()) {
    case 'like':
      points = 1;
      break;
    case 'comment':
      points = 2;
      break;
    case 'favorite':
    case 'bookmark':
    case 'save':
      points = 2;
      break;
    case 'follow':
      points = 2;
      break;
    default:
      points = 0;
  }
  
  if (points > 0) {
    await User.findByIdAndUpdate(userId, { 
      $inc: { interactionsCount: points } 
    });
  }
}; 