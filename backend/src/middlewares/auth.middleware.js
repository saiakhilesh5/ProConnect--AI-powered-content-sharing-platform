import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

export const authenticateUser = async (req, res, next) => {
  try {
    // Get token from headers
    const authHeader = req.header("Authorization");
    const token = req.cookies.token || authHeader?.replace("Bearer ", "");
    
    if (!token) {
      throw new ApiError(401, "Access denied. No token provided.");
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        throw new ApiError(401, "User not found.");
      }

      req.user = user;
      next();
    } catch (jwtError) {
      throw new ApiError(401, "Invalid or expired token.");
    }
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, "Invalid or expired token."));
  }
};
