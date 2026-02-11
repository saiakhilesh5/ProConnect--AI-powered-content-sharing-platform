import { Router } from "express";
import {
  createCollection,
  getUserCollections,
  getCollectionById,
  updateCollection,
  deleteCollection,
  addImageToCollection,
  removeImageFromCollection,
  getCollectionsByImage,
  getPublicCollections,
  searchCollections
} from "../controllers/collection.controllers.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication
router.post("/", authenticateUser, createCollection);
router.get("/", authenticateUser, getUserCollections);
router.get("/public", authenticateUser, getPublicCollections);
router.get("/search", authenticateUser, searchCollections);
router.get("/image/:imageId", authenticateUser, getCollectionsByImage);
router.get("/:collectionId", authenticateUser, getCollectionById);
router.put("/:collectionId", authenticateUser, updateCollection);
router.delete("/:collectionId", authenticateUser, deleteCollection);

// Image management in collections
router.post("/:collectionId/images/:imageId", authenticateUser, addImageToCollection);
router.delete("/:collectionId/images/:imageId", authenticateUser, removeImageFromCollection);

export default router; 