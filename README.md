# Pixora

**Pixora** is a full-stack, AI-powered social media platform for creators to connect, share, and grow. It combines Instagram-style photo sharing with TikTok-style short-form reels, real-time messaging with voice and video calls, 14 distinct AI-powered features, multilingual content moderation, and a comprehensive admin dashboard — all in one platform.

**Live:** [pixora.vercel.app](https://pro-connect-ai-powered-content-shar.vercel.app/)

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Features](#features)
   - [Authentication & Security](#1-authentication--security)
   - [Feed & Discovery](#2-feed--discovery)
   - [Image Upload & Management](#3-image-upload--management)
   - [Reels](#4-reels)
   - [Comments](#5-comments)
   - [Likes & Favorites](#6-likes--favorites)
   - [Collections](#7-collections)
   - [Follow System](#8-follow-system)
   - [User Profiles & Badges](#9-user-profiles--badges)
   - [Search & Explore](#10-search--explore)
   - [Real-time Messaging](#11-real-time-messaging)
   - [Voice & Video Calling](#12-voice--video-calling)
   - [Notifications](#13-notifications)
   - [AI Features](#14-ai-features)
   - [Content Moderation](#15-content-moderation)
   - [Theme System](#16-theme-system)
   - [Admin Panel](#17-admin-panel)
   - [Settings & Account Management](#18-settings--account-management)
4. [Frontend Pages](#frontend-pages)
5. [State Management](#state-management)
6. [Real-time Architecture](#real-time-architecture)
7. [Environment Variables](#environment-variables)
8. [Installation & Setup](#installation--setup)
9. [Running the Application](#running-the-application)
10. [Deployment](#deployment)
11. [Google OAuth Setup](#google-oauth-setup)

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 15** (App Router) | React framework with SSR/SSG |
| **Tailwind CSS** | Utility-first styling |
| **NextAuth.js** | Authentication (Credentials + Google OAuth) |
| **Socket.io Client** | Real-time messaging, calls, and notifications |
| **Framer Motion** | Animations and transitions |
| **Axios** | HTTP client |
| **React Hot Toast** | Toast notifications |
| **Lucide React** | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API server |
| **MongoDB + Mongoose** | Database and ODM |
| **Socket.io** | WebSocket server for real-time features |
| **Cloudinary** | Image and video cloud storage |
| **JWT** | Stateless authentication tokens (7-day expiry) |
| **Nodemailer** | Password reset and notification emails |
| **Multer** | File upload middleware |
| **Helmet** | Security headers (XSS, clickjacking, MIME sniffing) |
| **Google Gemini AI** | All 14 AI-powered features (gemini-2.5-flash) |

### AI Infrastructure
| Component | Details |
|---|---|
| **Model** | Google Gemini 2.5 Flash (text + vision) |
| **API Keys** | 8-key round-robin rotation system |
| **Rate Limit Handling** | Automatic failover on 429/403/503 errors |
| **Capabilities** | Text generation, image analysis, content moderation, semantic search |

---

## Project Structure

```
Pixora/
├── frontend/                    # Next.js 15 application
│   └── src/
│       ├── app/                 # App Router pages and layouts
│       │   ├── (auth)/          # Login, register, forgot/reset password, help, terms, privacy
│       │   ├── (protected)/     # Feed, profile, explore, messages, reels, AI tools, etc.
│       │   ├── admin/           # Admin panel (dashboard, login)
│       │   └── api/             # Next.js API routes (NextAuth)
│       ├── components/          # Reusable UI components
│       │   ├── auth/            # Authentication forms
│       │   ├── cards/           # Post, reel, user cards
│       │   ├── features/        # Feature-specific components
│       │   ├── layout/          # Header, sidebar, navigation
│       │   ├── screens/         # Full-page screen components
│       │   ├── skeletons/       # Loading skeleton placeholders
│       │   └── ui/              # Shadcn/Radix UI primitives
│       ├── context/             # 10 React context providers
│       ├── hooks/               # Custom React hooks
│       └── utils/               # Helper functions
│
└── backend/                     # Node.js/Express API server
    └── src/
        ├── controllers/         # 11 route handler files
        ├── models/              # 18 Mongoose data models
        ├── routes/              # 11 Express route files (150+ endpoints)
        ├── middlewares/         # Auth middleware (JWT + admin verification)
        ├── config/              # Cloudinary, Multer configuration
        ├── socket/              # Socket.io event handlers (messaging, calls, presence)
        └── utils/               # 14 AI utilities + helpers
            ├── aiClient.js              # Centralized AI client with 8-key rotation
            ├── aiImageAnalysis.js       # Image metadata auto-generation (vision)
            ├── aiSemanticSearch.js       # Natural language search parsing
            ├── aiCopyrightDetection.js   # Perceptual hashing & plagiarism detection
            ├── aiChatAssistant.js        # Context-aware AI chat assistant
            ├── aiSmartFeedRanking.js     # Personalized image feed ranking
            ├── aiSmartReelRanking.js     # Personalized reel feed ranking
            ├── aiReelAnalyzer.js         # Reel metadata & caption generation
            ├── aiCreatorGrowthAgent.js   # Growth analytics & recommendations
            ├── aiAutoReplySuggestions.js  # Smart comment reply generation
            ├── aiReportGenerator.js      # Admin analytics report generation
            ├── contentModeration.js      # Context-aware text moderation
            └── advancedContentModeration.js  # Multilingual AI moderation (15+ languages)
```

---

## Features

### 1. Authentication & Security

Pixora offers multiple secure sign-in methods with comprehensive security measures.

**Credentials (Email + Password):**
- Register with a username, full name, email, and password
- Passwords are hashed with bcrypt before storage
- JWT tokens are issued on login (stored in HTTP-only cookies, 7-day expiry)
- Real-time availability check for username and email during registration

**Google OAuth:**
- One-click sign-in with a Google account via NextAuth.js
- New accounts are automatically created on first Google sign-in
- Existing email accounts are linked to the Google login automatically

**Forgot Password:**
- Enter your email to receive a secure reset link
- Link contains a time-limited, single-use token
- Email is sent from the platform with a branded HTML template
- New password is set via the reset form

**Security Measures:**
- All protected routes require a valid JWT via auth middleware
- Login history tracking (timestamp, IP address, device, geolocation)
- IP geolocation on login for location-based activity tracking
- CORS protection with whitelist of allowed origins
- Helmet security headers (XSS, clickjacking, MIME sniffing prevention)
- Gzip compression for all responses
- Rate limiting:
  - **Global:** 300 requests/minute per IP
  - **Login:** 5 attempts/minute
  - **Registration:** 3 attempts/minute

---

### 2. Feed & Discovery

The main feed is the home screen after login.

- **Following Feed:** Shows posts from users you follow, ordered chronologically
- **Suggested Posts:** Surfaces relevant content from users you don't yet follow
- **Stories Bar:** Horizontal scrollable bar at the top showing active stories from followed accounts
- **Infinite Scroll:** Posts load as you scroll down without page refreshes
- **Post Cards:** Each post shows the image, author avatar, username, caption, like count, comment count, timestamp, and action buttons
- **Quick Actions:** Like, comment, save to favorites, share, and open post detail — all directly from the feed
- **For You Tab (AI Smart Feed):** An AI-ranked alternative feed personalized by your engagement history (see [AI Smart Feed](#ai-smart-feed-ranking))
- **Sidebar:** Shows suggested users to follow and a compact navigation menu

---

### 3. Image Upload & Management

Users can upload photos and share them with the community.

**Uploading:**
- Drag-and-drop or file picker interface
- Supports JPEG, PNG, WebP, and GIF formats
- Images are uploaded to Cloudinary with automatic optimization
- Add a caption, tags, and set visibility (public, private, or followers-only)
- **AI Auto-Fill:** One-click AI generation of title, description, tags, category, and alt-text from the image itself using Gemini vision
- AI content moderation runs automatically on upload to screen for inappropriate content
- AI copyright detection checks for duplicate/similar existing images

**Image Detail Page:**
- Full-size image view with caption and tags
- Like, comment, favorite, and share actions
- Related/similar images sidebar powered by AI semantic matching
- Edit caption or delete your own posts
- View analytics (views, engagement metrics)
- Story mode for ephemeral sharing

**Image Management:**
- View all your uploaded images on your profile grid
- Delete images (removes from Cloudinary and database)
- Toggle visibility between public, private, and followers-only
- Add images to collections
- Category classification (Nature, Architecture, Portrait, Street, Food, Travel, etc.)
- Review and rating system for images

---

### 4. Reels

Short-form video content, similar to Instagram Reels and TikTok.

**Uploading Reels:**
- Upload MP4 or WebM video files (up to 60 seconds)
- Multiple aspect ratios supported (9:16 vertical, 16:9 horizontal, 1:1 square)
- Videos are stored on Cloudinary with automatic thumbnail generation
- **AI Auto-Fill:** One-click AI generation of catchy captions (200 chars), trending hashtags (8-15), and category classification from video frames
- AI extracts 3 key frames from the video for visual analysis

**Viewing Reels:**
- Full-screen vertical scroll experience (TikTok-style)
- Auto-plays as you scroll, pauses when scrolling away
- Like, comment, save, and share reels
- Trending reels section on the Explore page
- AI-powered "For You" reel feed personalized to your interests

**Reel Details:**
- Comment section with threaded replies
- Like and save counts
- Creator profile link
- Share to messages
- 20 reel categories (Comedy, Dance, Music, Food, Tech, Fitness, Travel, etc.)

**Reel Analytics:**
- View counts and engagement metrics
- Performance scoring
- Content quality ranking

---

### 5. Comments

A full-featured comment system for posts and reels.

- **Threaded replies:** Reply directly to any comment, creating nested conversation threads
- **Likes on comments:** Like individual comments, see like counts
- **Edit and delete:** Edit your own comments or delete them
- **Real-time AI moderation:** Comments are analyzed for toxicity before posting using context-aware Gemini AI — understands slang, creative language, and multilingual content
- **AI Reply Suggestions:** Get 3 smart AI-generated reply options with one click, considering post context and comment tone
- **Quick Replies:** Template replies for common responses

---

### 6. Likes & Favorites

**Likes:**
- Toggle like/unlike on any post or reel
- Like counts are displayed in real time
- View the list of users who liked a post
- Separate like tracking for images, reels, and comments

**Favorites:**
- Save any post to your private favorites collection
- View all favorited posts on a dedicated Favorites page
- Quick-toggle from the feed or post detail
- Favorites are private — only you can see what you've saved

---

### 7. Collections

Organize saved content into named collections, similar to Pinterest boards.

- **Create collections:** Give them a name, description, and set visibility as public or private
- **Add/remove images:** Add any post to one or more collections
- **Browse collections:** View your own collections or explore public ones from other users
- **Search collections:** Find collections by name
- **Collection covers:** Automatic cover image from the first added image
- **Edit and delete:** Rename, update, or remove your collections at any time
- **Get collections by image:** See which collections contain a specific image

---

### 8. Follow System

Build your network by following other creators.

- **Follow / Unfollow:** One-click toggle from profile pages or suggestions
- **Follower / Following counts:** Displayed on every profile, auto-updated
- **Follower / Following lists:** See exactly who follows you and who you follow
- **Suggested users:** Personalized list of accounts you might want to follow shown on the feed sidebar and Explore page
- **Follow status indicator:** Follow button updates immediately to reflect current status
- **Follow notifications:** Users are notified when someone follows them

---

### 9. User Profiles & Badges

Every user has a customizable public profile page with an automatic badge system.

**Profile Header:**
- Profile picture (uploaded to Cloudinary)
- Display name, username, bio
- Website link, location
- Follower and following counts
- Creator badge (auto-assigned based on activity)
- Edit Profile button (own profile) or Follow/Message buttons (other profiles)

**Creator Badges:**
| Badge | Criteria |
|---|---|
| 🌱 **Newbie** | New account, just getting started |
| 📈 **Rising** | Growing engagement and follower base |
| ⭐ **Pro** | Established creator with consistent activity |
| 🔥 **Trendsetter** | Top-tier creator with high engagement |

Badges are automatically calculated and updated based on follower count, post count, and engagement metrics.

**Profile Tabs:**
| Tab | Content |
|---|---|
| **Posts** | Grid of all uploaded images |
| **Reels** | All uploaded short videos |
| **Saved** | Privately saved/favorited posts |
| **Collections** | Named collections of saved posts |
| **Analytics** | Creator analytics dashboard |
| **AI Insights** | AI-powered growth recommendations (own profile only) |

**Profile Visibility:**
- Public profiles visible to everyone
- Private profiles visible only to followers
- Followers-only content settings

**Creator Analytics Dashboard:**
- Total posts, followers, following counts
- Engagement rate calculation
- Post performance over time
- Most liked and most commented posts
- Follower growth history
- Login history log (devices, IPs, timestamps)

---

### 10. Search & Explore

**Search Bar (Header):**
- Search users and posts from anywhere in the app
- Recent searches are saved locally and shown as suggestions
- Instant results as you type

**Explore Page:**
- **Trending tag browser:** Click any trending hashtag to filter posts
- **People tab:** Discover and follow suggested users
- **Trending Reels:** Horizontally scrollable row of popular reels
- **Image grid:** Browse all public posts in a masonry-style grid
- **AI Smart Feed tab ("For You"):** AI-ranked content feed personalized to your interests

**AI Semantic Search:**
- Natural language search queries (e.g., "sunset photos on the beach")
- AI extracts mood, style, colors, and subject from your query
- Results ranked by keyword matching, category matching, tag overlap, and color-based matching
- Search suggestions and query refinement

**Tag Discovery:**
- Browse trending tags
- View all images tagged with a specific tag
- Tag-based content discovery

---

### 11. Real-time Messaging

Pixora has a full-featured messaging system powered by Socket.io with support for one-on-one chats, group conversations, and rich media.

**Conversations:**
- **One-on-one chats:** Direct messages between two users
- **Group conversations:** Multi-person chat groups with admin management
- Click the message button on any user's profile to start a conversation
- Archive or delete conversations
- Full conversation history

**Text & Media Messages:**
- **Text messages:** Send and receive text in real time
- **Image messages:** Send photos directly in chat
- **Voice messages:** Record and send voice notes with duration tracking
- **Video messages:** Share video content in chat
- **GIF support:** Send animated GIFs
- **Sticker packs:** Custom sticker support
- **File attachments:** Share documents and files
- **Reel sharing:** Share reels directly in messages
- **Story replies:** Reply to stories in chat

**Message Actions:**
- **Edit messages:** Edit sent messages
- **Delete messages:** Remove messages
- **Unsend messages:** Delete for everyone
- **Forward messages:** Share messages to other chats
- **Reply to message:** Quote a specific message in your reply
- **Pin messages:** Pin important messages in a conversation
- **Star messages:** Personal message bookmarks
- **Message search:** Full-text search within a conversation
- **Message reactions:** React with 10 emoji options: ❤️ 😂 😮 😢 😡 👍 👎 🔥 💯 🎉

**Polls in Messages:**
- Create interactive polls within conversations
- Multiple choice voting
- Anonymous voting option
- Results visibility controls
- Poll expiration timers

**Location Sharing:**
- Send your current location with coordinates and address

**Chat Customization:**
- **Chat themes:** Customize bubble colors, background color, and text color per conversation
- **Quick emoji:** Set a custom reaction emoji per chat
- **Nicknames:** Custom contact names per conversation
- **Mute conversations:** Disable notifications for specific chats
- **Vanish mode:** Disappearing messages that auto-delete

**Real-time Indicators:**
- **Typing indicator:** See "typing..." when the other person is composing
- **Online/offline status:** Real-time presence indicator next to usernames
- **Read receipts:** Double-check marks when a message is read
- **Unread badges:** Unread message count shown on the inbox icon

**Group Chat Features:**
- Create groups with name and image
- Add and remove members
- Leave group
- Admin management (assign/remove admins)
- Only admins can manage group settings

---

### 12. Voice & Video Calling

Real-time voice and video calling powered by WebRTC with Socket.io signaling.

**Call Types:**
- **Audio calls:** Voice-only calling
- **Video calls:** Video + audio calling
- **Group calls:** Support up to 8 participants simultaneously

**Call Controls:**
- Answer, decline, or end calls
- Mute/unmute microphone
- Toggle camera on/off
- Call quality monitoring

**Call Management:**
- **Call status tracking:** Ringing → Ongoing → Ended
- **Missed calls:** Track missed call history
- **Call history page:** Full call log with timestamps and durations
- **Call duration tracking:** Monitor length of each call
- **Call messages:** Calls are recorded as messages in the conversation

**Group Calling Features:**
- Start group video/audio calls
- Track active participants
- Dynamic join/leave during active calls

---

### 13. Notifications

Stay up to date with activity on your account.

**Notification Types:**
- **Like notifications:** When someone likes your post or reel
- **Comment notifications:** When someone comments on your post
- **Reply notifications:** When someone replies to your comment
- **Follow notifications:** When someone follows you
- **Favorite notifications:** When someone favorites your image
- **Message notifications:** When you receive a direct message
- **Report notifications:** Content report alerts
- **Reel interactions:** Reel likes and comments
- **Story interactions:** Story likes and replies

**Notification Management:**
- Mark individual notifications as read
- Mark all notifications as read in one click
- Delete single notifications
- Auto-cleanup of old notifications
- Unread count badge on the notification bell
- **Real-time delivery:** Notifications arrive instantly via Socket.io without page refresh

---

### 14. AI Features

Pixora includes **14 distinct AI-powered features**, all running on **Google Gemini 2.5 Flash** with an 8-key round-robin rotation system for reliability.

#### AI Image Analysis
Automatically generate complete metadata for uploaded images using Gemini's vision capabilities.
- AI-generated title (up to 50 characters)
- Detailed description (300+ characters)
- Relevant tags (5-10 tags)
- Category classification
- Accessibility alt-text for screen readers
- One-click "AI Auto-Fill" button on the upload page

#### AI Reel Analyzer
Automatically generate metadata for uploaded reels by analyzing video frames.
- Extracts 3 key frames from the video via Cloudinary
- Generates catchy captions (1-3 sentences, up to 200 characters)
- Suggests 8-15 trending hashtags
- Classifies into one of 20 reel categories
- Falls back to thumbnail analysis for faster processing

#### AI Semantic Search
Natural language search that understands what you mean, not just keywords.
- Parses search queries to extract mood, style, colors, and subject
- Identifies time context (day, night, sunrise, sunset)
- Ranks results using keyword matching, category matching, tag overlap, and color similarity
- Provides search refinement suggestions

#### AI Chat Assistant
An AI assistant built into the messaging interface.
- **User context analysis:** Understands your follower count, post count, engagement rate, recent images, and creator badge
- **Image context queries:** Answer questions about specific images and their performance
- **Engagement insights:** Analyze your best-performing content
- **Caption suggestions:** Generate context-aware captions with emojis and hashtag optimization
- **Safety:** Declines harmful or inappropriate requests

#### AI Smart Feed Ranking
Personalized "For You" image feed that replaces chronological ordering with AI-ranked content.
- **User interest profiling:** Analyzes your liked images, favorited content, and followed creators
- **Category preferences:** Weighted category scores based on engagement
- **Tag preferences:** Normalized tag interest scoring
- **Engagement prediction:** Predicts which posts you'll interact with
- **Content recency decay:** Fresh content gets a boost
- **Creator relationship signals:** Content from creators you engage with ranks higher
- **Diversity injection:** Intentionally surfaces new creators

#### AI Smart Reel Ranking
Personalized "For You" reel feed using the same approach as smart image ranking.
- Track liked, saved, and commented reels
- Weight engagement signals (comments > saves > likes)
- Category and tag preference modeling
- Creator relationship tracking
- Watch time pattern analysis

#### AI Creator Growth Agent
Personalized growth analytics and recommendations for creators.
- **Posting pattern analysis:** Identifies your best-performing hours and days
- **Growth recommendations:** Top 3 optimal posting times, engagement trends, frequency advice
- **Competitor insights:** Compare your performance against similar creators
- **Trending topics:** Suggest trending content categories and themes relevant to your niche
- **Hashtag strategy:** Recommend hashtag combinations for maximum reach

#### AI Auto-Reply Suggestions
Smart, contextual reply options for comments.
- **Comment sentiment analysis:** Classifies as positive, negative, neutral, question, or critique
- **User style matching:** Matches reply tone to your typical communication style
- **Image-aware responses:** Considers the post context when generating replies
- Three suggestions generated per comment with one click

#### AI Copyright Detection
Detect duplicate or plagiarized images before they're posted.
- **Perceptual hashing:** Compare image fingerprints
- **Similarity analysis:** Find similar or duplicate images across the platform
- **Multiple image comparison:** Compare against up to 5 existing images
- **Image hash storage:** Store hashes for ongoing comparison

#### AI Report Generator
Generate comprehensive platform analytics reports for admins.
- **User growth statistics:** New users, active users, banned/premium user counts
- **Engagement metrics:** Likes, comments, follows over time
- **Top trending images:** Identify the most engaging content
- **Category breakdowns:** Content distribution analysis
- **Creator performance ranking:** Top creators by engagement
- **Time-period based reporting:** Custom date range analytics

#### Content Moderation (AI-Powered)
Context-aware content moderation using Gemini AI instead of rigid keyword filters.
- **Comment moderation:** Gemini analyzes the full context of a comment before blocking
- **Caption moderation:** Dedicated prompt with higher thresholds for creative/AI-generated content
- **Multilingual support:** Moderation in 15+ languages including:
  - English, Hindi/Hinglish, Telugu, Tamil, Kannada, Malayalam
  - Bengali, Punjabi, Marathi, Gujarati
  - Urdu/Arabic, Spanish, Portuguese, French, German
- **Creative language understanding:** AI distinguishes between toxic content and creative/poetic expression
- **Leetspeak and transliteration:** Handles intentional misspellings and transliterated abuse
- **User warnings:** Track per-user violation counts

#### AI Client (Infrastructure)
Centralized AI client managing all Gemini API interactions.
- **8-key round-robin rotation:** Equal distribution of requests across all API keys
- **Automatic failover:** On 429 (rate limit), 403 (quota), or 503 (service unavailable), automatically tries the next key
- **Logging:** Logs which key was used and any failures
- **Single configuration:** All 14 AI features use the same centralized client

---

### 15. Content Moderation

Pixora uses a multi-layer content moderation system to keep the platform safe.

**Automatic checks on image upload:**
- Gemini AI vision analysis checks for explicit, violent, or otherwise inappropriate imagery
- Posts that fail moderation are rejected with an explanation
- AI copyright detection checks for duplicates

**Comment & caption moderation:**
- Context-aware Gemini AI moderation (not rigid keyword matching)
- Understands creative language, slang, and AI-generated captions
- Multilingual support for 15+ languages
- Different thresholds for comments vs. creative captions
- Highly toxic content is blocked; borderline content shows a warning

**Reporting:**
- Users can report any post, comment, or reel
- Reports include a reason category and description
- Reports are queued for admin review in the admin panel

---

### 16. Theme System

Pixora supports full light and dark mode with persistence.

- **Toggle:** Click the sun/moon icon in the header
- **Persistence:** Your theme choice is saved to `localStorage` and synced to your account in the database
- **System sync:** On first load, the theme matches your OS/browser preference if you haven't set one yet
- **Smooth transition:** Theme switches animate smoothly without a flash

---

### 17. Admin Panel

A dedicated dashboard at `/admin` for platform administrators.

**Access Control:**
- Admin accounts are designated in the database (`isAdmin: true`)
- Admin login is separate from regular user login
- All admin routes are protected by the `isAdmin` middleware
- Promote users to admin via the `makeAdmin.js` CLI script

**Dashboard Overview:**
- Total users, total posts, total reels, total comments
- Today's new registrations
- Platform engagement metrics charts
- Quick stats panel with real-time data

**User Management:**
- View all users with profile info, join date, and activity
- **Ban / Unban users:** Toggle user access to the platform
- **Grant / Revoke admin:** Promote or demote admin status
- Search and filter users

**Content Management:**
- View all reported posts, comments, and reels
- Delete any post or reel directly from the admin panel
- Remove content from Cloudinary storage as well
- Moderation queue for handling reports and complaints

**AI Report Generation:**
- Generate a comprehensive platform health report with a single click
- Report is powered by Google Gemini AI and includes:
  - User growth trends and daily growth visualization
  - Engagement analysis (likes, comments, follows)
  - Content quality assessment and category breakdowns
  - Top creator performance rankings
  - Recommended platform actions

---

### 18. Settings & Account Management

**Profile Settings:**
- Update display name, username, bio, website, location
- Change profile picture
- Update email address

**Password & Security:**
- Change password (requires current password confirmation)
- View login history (device, IP, timestamp, geolocation)

**Preferences:**
- Notification preferences (choose which notification types to receive)
- Theme preference (light/dark)
- Profile visibility settings

**Account Deletion:**
- Permanently delete account and all associated content

---

## Frontend Pages

### Authentication Pages
| Page | Path | Description |
|---|---|---|
| Login | `/login` | Email/username + password login |
| Register | `/register` | New user signup |
| Forgot Password | `/forgot-password` | Request password reset email |
| Reset Password | `/reset-password/[token]` | Token-based password reset form |
| Help | `/help` | FAQ and support |
| Terms | `/terms` | Terms of service |
| Privacy | `/privacy` | Privacy policy |

### Main App Pages
| Page | Path | Description |
|---|---|---|
| Feed | `/feed` | Main social feed (chronological or AI-ranked) |
| For You | `/for-you` | AI-personalized content recommendations |
| Explore | `/explore` | Browse trending content and discover creators |
| Search | `/search` | Full-text search across the platform |
| Reels | `/reels` | TikTok-style vertical reel feed |

### Content Pages
| Page | Path | Description |
|---|---|---|
| Upload Image | `/upload-image` | Upload images with AI auto-fill |
| Upload Reel | `/upload-reel` | Upload short-form videos with AI auto-fill |
| Image Detail | `/image/[imageId]` | Full image view with comments and actions |
| Tags | `/tags` | Browse trending tags |
| Tag Detail | `/tags/[tag]` | All images with a specific tag |

### Social Pages
| Page | Path | Description |
|---|---|---|
| Profile | `/profile/[username]` | User profile with posts, reels, collections |
| Users Directory | `/users` | Browse and discover all users |
| Suggestions | `/suggestions` | AI-recommended users to follow |
| Likes | `/likes` | Gallery of all liked images |
| Favorites | `/favorites` | Gallery of all favorited/saved images |
| Collections | `/collections` | Your collections list |
| Collection Detail | `/collections/[id]` | Contents of a specific collection |

### Communication Pages
| Page | Path | Description |
|---|---|---|
| Messages Inbox | `/messages` | All conversations |
| Conversation | `/messages/[conversationId]` | Chat interface |
| Call History | `/messages/calls` | Voice/video call log |
| Notifications | `/notifications` | Notification center |

### AI & Tools Pages
| Page | Path | Description |
|---|---|---|
| AI Assistant | `/ai-assistant` | Chat with AI about your images and content |
| Creator Growth | `/creator-growth` | AI growth analytics and recommendations |
| Settings | `/settings` | User settings and preferences |

### Admin Pages
| Page | Path | Description |
|---|---|---|
| Admin Login | `/admin/login` | Admin authentication |
| Admin Dashboard | `/admin/dashboard` | Full admin panel |

---

## State Management

Pixora uses 10 React Context providers for client-side state management:

| Context | Purpose |
|---|---|
| **AuthContext** | User authentication state, login/logout |
| **SocketContext** | WebSocket connection management |
| **MessagesContext** | Conversations, messages, and chat state |
| **CallContext** | Voice/video call state and WebRTC management |
| **ReelsContext** | Reel feed state and interactions |
| **LikesFavoritesContext** | Like and favorite tracking across all content |
| **FollowContext** | Follow/unfollow state and relationships |
| **UsersContext** | User data and profiles |
| **ChatAssistantContext** | AI chat assistant state |
| **ThemeContext** | Light/dark theme toggle and persistence |

**Custom Hooks:**
| Hook | Purpose |
|---|---|
| `useApi` | Centralized API request handler |
| `useAIFeatures` | AI feature utilities |
| `useCollections` | Collection management |
| `useLikesFavorites` | Like and favorite state tracking |

---

## Real-time Architecture

Pixora uses Socket.io for all real-time features:

**Connection Events:**
- `presence:online` — User comes online
- `presence:offline` — User goes offline

**Messaging Events:**
- `message:send` — New message sent
- `message:read` — Message marked as read
- `user:typing` — Typing indicator

**Call Events (WebRTC Signaling):**
- `call:initiate` — Start a voice/video call
- `call:answer` — Accept incoming call
- `call:decline` — Reject incoming call
- `call:end` — Terminate active call

**Other Events:**
- Reaction updates in real time
- Notification push events
- Online status broadcasting

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Server
PORT=8000
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Database
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/pixora

# Authentication
ACCESS_TOKEN_SECRET=your_jwt_access_secret
ACCESS_TOKEN_EXPIRY=7d
REFRESH_TOKEN_SECRET=your_jwt_refresh_secret
REFRESH_TOKEN_EXPIRY=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (for password reset)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Google Gemini AI (8 keys for round-robin rotation)
GEMINI_API_KEY_1=your_gemini_api_key_1
GEMINI_API_KEY_2=your_gemini_api_key_2
GEMINI_API_KEY_3=your_gemini_api_key_3
GEMINI_API_KEY_4=your_gemini_api_key_4
GEMINI_API_KEY_5=your_gemini_api_key_5
GEMINI_API_KEY_6=your_gemini_api_key_6
GEMINI_API_KEY_7=your_gemini_api_key_7
GEMINI_API_KEY_8=your_gemini_api_key_8

# Admin
ADMIN_EMAIL=admin@pixora.com
ADMIN_SECRET_KEY=your_admin_secret
```

### Frontend (`frontend/.env.local`)

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

> **Note:** You need at least 1 Gemini API key for AI features to work. Get free keys from [Google AI Studio](https://aistudio.google.com/apikey). More keys = higher rate limits (each key allows ~15 requests/minute).

---

## Installation & Setup

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)
- **Cloudinary** account ([free tier](https://cloudinary.com/) works)
- **Google Cloud** project with OAuth 2.0 credentials
- **Google Gemini API** key(s) from [Google AI Studio](https://aistudio.google.com/apikey)
- **Gmail** account with an App Password enabled (for password reset emails)

### 1. Clone the repository

```bash
git clone <repository-url>
cd Pixora-main
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure backend environment

```bash
cp env.example.txt .env
# Edit .env with your actual values
```

### 4. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 5. Configure frontend environment

```bash
cp env.example.txt .env.local
# Edit .env.local with your actual values
```

---

## Running the Application

### Development mode

**Start the backend server:**
```bash
cd backend
npm run dev
```
The API will run at `http://localhost:8000`

**Start the frontend (in a new terminal):**
```bash
cd frontend
npm run dev
```
The app will be available at `http://localhost:3000`

### Production build

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

### Creating an admin account

After the backend is running and a user account exists, promote it to admin:

```bash
cd backend
node makeAdmin.js
```

Follow the prompts to enter the user's email and the admin secret key.

---

## Deployment

### Backend (Render)

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Set the **Root Directory** to `backend`
4. Set **Build Command:** `npm install`
5. Set **Start Command:** `npm start`
6. Add all backend environment variables from `.env`
7. Set `CORS_ORIGIN` and `FRONTEND_URL` to your frontend URL

### Frontend (Vercel)

1. Import your repository on [Vercel](https://vercel.com)
2. Set the **Root Directory** to `frontend`
3. Add all frontend environment variables from `.env.local`
4. Set `NEXT_PUBLIC_API_URL` to your Render backend URL + `/api/v1`
5. Set `NEXT_PUBLIC_SOCKET_URL` to your Render backend URL
6. Set `NEXTAUTH_URL` to your Vercel deployment URL
7. Deploy

### Post-Deployment Checklist

- Update `CORS_ORIGIN` on Render to include your Vercel URL
- Update Google Cloud Console OAuth redirect URIs to include your Vercel URL
- Ensure all 8 Gemini API keys are set on Render

---

## Google OAuth Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services → OAuth consent screen**
4. Set the **App name** to `Pixora`
5. Add your domain to **Authorized domains**
6. Navigate to **APIs & Services → Credentials**
7. Create an **OAuth 2.0 Client ID** (Web application)
8. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-vercel-url.vercel.app/api/auth/callback/google` (production)
9. Copy the **Client ID** and **Client Secret** to your frontend `.env.local`

---

## Platform Statistics

| Category | Count |
|----------|-------|
| Backend Route Files | 11 |
| Controllers | 11 |
| Database Models | 18 |
| AI Features | 14 |
| Frontend Pages | 31 |
| Context Providers | 10 |
| API Endpoints | 150+ |
| Real-time Socket Events | 15+ |
| Supported Moderation Languages | 15+ |

---

## License

This project is for educational and portfolio purposes.
