import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import userRoutes from "./routes/user.routes.js";
import followRoutes from "./routes/follow.routes.js";
import imageRoutes from "./routes/image.routes.js";
import favoriteRoutes from "./routes/favorite.routes.js";
import likeRoutes from "./routes/like.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import collectionRoutes from "./routes/collection.routes.js";
import messageRoutes from "./routes/message.routes.js";
import reelRoutes from "./routes/reel.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

// ─── Trust proxy (required for Render/Heroku/Railway reverse proxies) ─────────
app.set('trust proxy', 1);

// ─── Security headers (XSS, clickjacking, MIME sniffing, etc.) ────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// ─── Gzip/Brotli compression ─────────────────────────────────────────────────
// Compresses all responses > 1 KB (~40-80% bandwidth reduction)
app.use(compression({ threshold: 1024 }));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// ─── Global rate limiter (rush handling) ─────────────────────────────────────
// 300 requests per IP per minute — protects against traffic spikes
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 300,                  // max requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/',  // skip health check
  message: {
    success: false,
    statusCode: 429,
    message: "Too many requests. Please slow down.",
  },
});
app.use(globalLimiter);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.send("Server is running!");
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/users", userRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/reels", reelRoutes);
app.use("/api/admin", adminRoutes);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route ${req.originalUrl} not found`,
  });
});

export { app };