# ProConnect

**ProConnect** is a full-stack social media platform inspired by Instagram, built for creators to connect, share, and grow. It features image sharing, short-form video reels, real-time messaging, AI-powered tools, and a comprehensive admin panel — all in one platform.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Features](#features)
   - [Authentication](#1-authentication)
   - [Feed](#2-feed)
   - [Image Upload & Management](#3-image-upload--management)
   - [Reels](#4-reels)
   - [Comments](#5-comments)
   - [Likes & Favorites](#6-likes--favorites)
   - [Collections](#7-collections)
   - [Follow System](#8-follow-system)
   - [User Profiles](#9-user-profiles)
   - [Search & Explore](#10-search--explore)
   - [Real-time Messaging](#11-real-time-messaging)
   - [Notifications](#12-notifications)
   - [AI Chat Assistant](#13-ai-chat-assistant)
   - [AI Reply Suggestions](#14-ai-reply-suggestions)
   - [AI Creator Growth Insights](#15-ai-creator-growth-insights)
   - [AI Similar Images](#16-ai-similar-images)
   - [AI Smart Feed](#17-ai-smart-feed)
   - [Content Moderation](#18-content-moderation)
   - [Theme System](#19-theme-system)
   - [Admin Panel](#20-admin-panel)
   - [Settings & Account Management](#21-settings--account-management)
4. [Environment Variables](#environment-variables)
5. [Installation & Setup](#installation--setup)
6. [Running the Application](#running-the-application)
7. [Google OAuth Setup](#google-oauth-setup)

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 14** (App Router) | React framework with SSR/SSG |
| **Tailwind CSS** | Utility-first styling |
| **NextAuth.js** | Authentication (Credentials + Google OAuth) |
| **Socket.io Client** | Real-time messaging and notifications |
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
| **JWT** | Stateless authentication tokens |
| **Nodemailer** | Password reset emails |
| **Multer** | File upload middleware |
| **Google Gemini AI** | All AI-powered features |

---

## Project Structure

```
ProConnect/
├── frontend/               # Next.js 14 application
│   └── src/
│       ├── app/            # App Router pages and layouts
│       │   ├── (auth)/     # Login, register, forgot password pages
│       │   ├── (protected)/# Feed, profile, explore, messages, etc.
│       │   ├── admin/      # Admin panel pages
│       │   └── api/        # Next.js API routes (NextAuth)
│       ├── components/     # Reusable UI components
│       ├── context/        # React context (Auth, Theme)
│       ├── hooks/          # Custom React hooks
│       └── utils/          # Helper functions
│
└── backend/                # Node.js/Express API server
    └── src/
        ├── controllers/    # Route handler logic
        ├── models/         # Mongoose data models
        ├── routes/         # Express route definitions
        ├── middlewares/    # Auth and other middleware
        ├── config/         # Cloudinary, Multer config
        ├── socket/         # Socket.io event handlers
        └── utils/          # AI utilities and helpers
```

---

## Features

### 1. Authentication

ProConnect offers multiple ways to sign in securely.

**Credentials (Email + Password):**
- Register with a username, full name, email, and password
- Passwords are hashed with bcrypt before storage
- JWT tokens are issued on login (stored in HTTP-only cookies)
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

**Security:**
- All protected routes require a valid JWT
- Middleware validates tokens on every authenticated request
- Login history is tracked (timestamp, IP address, device)

---

### 2. Feed

The main feed is the home screen after login.

- **Following Feed:** Shows posts from users you follow, ordered chronologically
- **Suggested Posts:** Surfaces relevant content from users you don't yet follow
- **Stories Bar:** Horizontal scrollable bar at the top showing active stories from followed accounts
- **Infinite Scroll:** Posts load as you scroll down without page refreshes
- **Post Cards:** Each post shows the image, author avatar, username, caption, like count, comment count, timestamp, and action buttons
- **Quick Actions:** Like, comment, save to favorites, share, and open post detail — all directly from the feed
- **For You Tab (AI Smart Feed):** An AI-ranked alternative feed (see [AI Smart Feed](#17-ai-smart-feed))
- **Sidebar:** Shows suggested users to follow and a compact navigation menu

---

### 3. Image Upload & Management

Users can upload photos and share them with the community.

**Uploading:**
- Drag-and-drop or file picker interface
- Supports JPEG, PNG, WebP, and GIF formats
- Images are uploaded to Cloudinary with automatic optimization
- Add a caption, tags, and set visibility (public or private)
- AI content moderation runs automatically on upload to screen for inappropriate content

**Image Detail Page:**
- Full-size image view with the caption and tags
- Like, comment, favorite, and share actions
- Related/similar images sidebar powered by AI (see [AI Similar Images](#16-ai-similar-images))
- Edit caption or delete your own posts

**Image Management:**
- View all your uploaded images on your profile grid
- Delete images (removes from Cloudinary and database)
- Toggle visibility between public and private
- Add images to collections

---

### 4. Reels

Short-form video content, similar to Instagram Reels.

**Uploading Reels:**
- Upload MP4 or WebM video files
- Videos are stored on Cloudinary
- Add a caption and optional hashtags

**Viewing Reels:**
- Full-screen vertical scroll experience
- Auto-plays as you scroll, pauses when scrolling away
- Like, comment, save, and share reels
- Trending reels section on the Explore page

**Reel Details:**
- Comment section with replies
- Like and save counts
- Creator profile link

---

### 5. Comments

A full-featured comment system for posts and reels.

- **Threaded replies:** Reply directly to any comment, creating nested threads
- **Likes on comments:** Like individual comments, see like counts
- **Edit and delete:** Edit your own comments or delete them
- **Real-time toxicity check:** Comments are analyzed for toxicity before posting (see [Content Moderation](#18-content-moderation))
- **AI Reply Suggestions:** Get smart AI-generated reply options with one click (see [AI Reply Suggestions](#14-ai-reply-suggestions))
- **Quick Replies:** Template replies for common responses

---

### 6. Likes & Favorites

**Likes:**
- Toggle like/unlike on any post or reel
- Like counts are displayed in real time
- View the list of users who liked a post

**Favorites:**
- Save any post to your private favorites collection
- View all favorited posts on your profile's Saved tab
- Quick-toggle from the feed or post detail

---

### 7. Collections

Organize saved content into named collections, similar to Pinterest boards.

- **Create collections:** Give them a name and set as public or private
- **Add/remove images:** Add any post to one or more collections
- **Browse collections:** View your own collections or explore public ones
- **Search collections:** Find collections by name
- **Edit and delete:** Rename or remove your collections at any time

---

### 8. Follow System

Build your network by following other creators.

- **Follow / Unfollow:** One-click toggle from profile pages or suggestions
- **Follower / Following counts:** Displayed on every profile
- **Follower / Following lists:** See exactly who follows you and who you follow
- **Suggested users:** Personalized list of accounts you might want to follow shown on the feed sidebar and the Explore page
- **Follow status indicator:** Follow button updates immediately to reflect current status

---

### 9. User Profiles

Every user has a customizable public profile page.

**Profile Header:**
- Profile picture (uploaded to Cloudinary)
- Display name, username, bio
- Website link, location
- Follower and following counts
- Edit Profile button (own profile) or Follow/Unfollow button (other profiles)
- Message button to start a direct conversation

**Profile Tabs (own profile):**
| Tab | Content |
|---|---|
| **Posts** | Grid of all uploaded images |
| **Reels** | All uploaded short videos |
| **Saved** | Privately saved/favorited posts |
| **Collections** | Named collections of saved posts |
| **Analytics** | Creator analytics dashboard |
| **AI Insights** | AI-powered growth recommendations (own profile only) |

**Creator Analytics:**
- Total posts, followers, following counts
- Engagement rate calculation
- Post performance over time (chart)
- Most liked and most commented posts
- Follower growth history
- Login history log

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

---

### 11. Real-time Messaging

ProConnect has a full-featured direct messaging system powered by Socket.io.

**Starting Conversations:**
- Click the message button on any user's profile
- Or start a new conversation from the inbox

**Messaging Features:**
- **Text messages:** Send and receive text in real time
- **Image messages:** Send photos directly in the chat
- **Voice messages:** Record and send audio clips
- **Message reactions:** React to any message with an emoji
- **Reply to message:** Quote a specific message in your reply
- **Unsend:** Delete your own messages
- **Read receipts:** Double-check marks when a message is read
- **Typing indicator:** See "typing..." when the other person is composing
- **Online/offline status:** Real-time presence indicator next to usernames
- **Unread badges:** Unread message count shown on the inbox icon

**AI Chat Assistant:**
- Within any conversation, summon the AI assistant to help compose messages or answer questions (see [AI Chat Assistant](#13-ai-chat-assistant))

---

### 12. Notifications

Stay up to date with activity on your account.

- **Like notifications:** When someone likes your post or reel
- **Comment notifications:** When someone comments on your post
- **Reply notifications:** When someone replies to your comment
- **Follow notifications:** When someone follows you
- **Mention notifications:** When someone mentions you in a comment
- **Real-time delivery:** Notifications arrive instantly via Socket.io without refreshing
- **Unread count badge:** Red badge on the bell icon shows unread count
- **Mark as read:** Mark individual or all notifications as read
- **Delete notifications:** Remove notifications you no longer need

---

### 13. AI Chat Assistant

An AI-powered assistant built into the messaging interface, powered by **Google Gemini**.

**How to use:**
- Open any conversation
- Click the sparkle/AI icon to open the assistant panel
- Type your question or request

**Capabilities:**
- Help you write or improve a message draft
- Answer general knowledge questions
- Suggest conversation starters or icebreakers
- Summarize a topic or provide information on demand
- Context-aware: understands it's operating within a social media chat context

**Safety:**
- Input is sanitized before sending to the AI
- The assistant declines requests for harmful, illegal, or inappropriate content

---

### 14. AI Reply Suggestions

Automatically generate smart, contextual reply options for any comment, powered by **Google Gemini**.

**How it works:**
1. Open the comment section on any post
2. Click the "AI Suggest" button next to any comment
3. Three AI-generated reply options appear instantly
4. Click any suggestion to populate your reply box, then edit or send

**What it considers:**
- The original post context (caption and tags)
- The specific comment being replied to
- Tone detection (matches friendly, professional, or humorous tone)

---

### 15. AI Creator Growth Insights

A dedicated AI-powered analytics tab on your own profile that gives personalized growth advice.

**Access:** Profile → AI Insights tab (only visible on your own profile)

**Sections:**

| Section | What it provides |
|---|---|
| **Performance Summary** | Overview of your engagement metrics and trends |
| **Growth Recommendations** | Specific, actionable steps to increase followers and engagement |
| **Optimal Posting Times** | Best days and times to post based on your audience activity |
| **Content Strategy** | Suggested content types and themes that resonate with your audience |
| **Competitor Insights** | Comparison against similar creators in your niche |
| **Trending Topics** | Hashtags and themes currently gaining traction that fit your content |

**Powered by:** Google Gemini AI analyzing your post history, engagement data, and follower growth patterns.

---

### 16. AI Similar Images

Discover related content by finding visually and semantically similar images.

**How to use:**
- Open any image post detail page
- In the right sidebar, click the **"Find Similar"** button
- A grid of similar images appears in the sidebar

**How it works:**
- Google Gemini AI analyzes the image's caption, tags, and metadata
- Semantic similarity matching finds posts with related themes, subjects, and styles
- Results are ranked by relevance

---

### 17. AI Smart Feed

A personalized "For You" feed tab on the Explore page that ranks content using AI.

**Access:** Explore page → "For You" tab (toggle between Default and For You)

**How it works:**
- **User interest modeling:** Your like history, save history, and followed accounts build a preference profile
- **Smart ranking:** Google Gemini AI scores candidate posts against your interest profile
- **Diversity injection:** The algorithm intentionally mixes content types to surface new creators
- **Real-time:** Rankings are calculated fresh on each tab visit

**Difference from the default feed:**
- Default Explore: Chronological, unranked public posts
- For You: AI-ranked, personalized to your demonstrated interests

---

### 18. Content Moderation

ProConnect uses a multi-layer content moderation system to keep the platform safe.

**Automatic checks on image upload:**
- AI vision analysis checks for explicit, violent, or otherwise inappropriate imagery
- Posts that fail moderation are rejected with an explanation

**Comment toxicity filtering:**
- Before a comment is posted, it is scored for toxicity by the AI
- Highly toxic comments are blocked with feedback to the user
- Borderline comments show a warning but can still be submitted

**Reporting:**
- Users can report any post or comment
- Reports are stored and visible to admins in the admin panel

---

### 19. Theme System

ProConnect supports full light and dark mode with persistence.

- **Toggle:** Click the sun/moon icon in the header
- **Persistence:** Your theme choice is saved to `localStorage` (`proconnect-theme`) and synced to your account in the database
- **System sync:** On first load, the theme matches your OS/browser preference if you haven't set a preference yet
- **Smooth transition:** Theme switches animate smoothly without a flash

---

### 20. Admin Panel

A dedicated dashboard at `/admin` for platform administrators.

**Access control:**
- Admin accounts are designated in the database (`isAdmin: true`)
- Admin login is separate from regular user login
- All admin routes are protected by the `isAdmin` middleware

**Dashboard Overview:**
- Total users, total posts, total reels, total comments
- Today's new registrations
- Platform engagement metrics chart
- Quick stats panel

**User Management:**
- View all users with profile info and join date
- **Ban / Unban users:** Toggle user access to the platform
- **Grant / Revoke admin:** Promote or demote admin status
- Search and filter users

**Content Management:**
- View all reported posts
- Delete any post directly from the admin panel
- Remove inappropriate images from Cloudinary as well

**AI Report Generation:**
- Generate a comprehensive platform health report with a single click
- Report is powered by Google Gemini AI and includes:
  - User growth trends
  - Engagement analysis
  - Content quality assessment
  - Recommended platform actions

---

### 21. Settings & Account Management

**Profile Settings:**
- Update display name, username, bio, website, location
- Change profile picture
- Update email address

**Password & Security:**
- Change password (requires current password confirmation)
- View login history (device, IP, timestamp)

**Preferences:**
- Notification preferences (what types of notifications to receive)
- Theme preference

**Account Deletion:**
- Permanently delete account and all associated content

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Server
PORT=8000
CORS_ORIGIN=http://localhost:3000

# Database
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/proconnect

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

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Admin
ADMIN_EMAIL=admin@proconnect.com
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

---

## Installation & Setup

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- **MongoDB** (local or MongoDB Atlas)
- **Cloudinary** account (free tier works)
- **Google Cloud** project with OAuth 2.0 credentials
- **Google Gemini API** key (from Google AI Studio)
- **Gmail** account with an App Password enabled (for emails)

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
# Edit .env with your values
```

### 4. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 5. Configure frontend environment

```bash
cp env.example.txt .env.local
# Edit .env.local with your values
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

## Google OAuth Setup

The "Continue to ProConnect" prompt on Google sign-in is configured in **Google Cloud Console**, not in the code.

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project
3. Navigate to **APIs & Services → OAuth consent screen**
4. Change the **App name** field to `ProConnect`
5. Click **Save and Continue**

> This is what users see on the Google consent screen when they click "Sign in with Google". It must be updated there for the branding to reflect ProConnect.

---

## License

This project is for educational and portfolio purposes.
