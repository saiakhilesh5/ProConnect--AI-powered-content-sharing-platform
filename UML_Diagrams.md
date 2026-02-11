# ProConnect UML Diagrams

## How to View These Diagrams

1. **GitHub**: Mermaid renders automatically in GitHub markdown
2. **VS Code**: Install "Markdown Preview Mermaid Support" extension
3. **Online**: Go to https://mermaid.live/ and paste the code
4. **Draw.io**: Import Mermaid diagrams directly

---

## 1. USE CASE DIAGRAM

```mermaid
flowchart LR
    subgraph Actors
        Guest((Guest))
        User((Registered User))
        Premium((Premium User))
        Creator((Content Creator))
        Admin((Administrator))
    end

    subgraph "ProConnect System"
        subgraph "Authentication & Security"
            UC1[Register with Email]
            UC2[Login with Email]
            UC3[Login with Google OAuth]
            UC4[Verify Email]
            UC5[Reset Password]
            UC6[Two-Factor Authentication]
            UC7[Logout]
        end

        subgraph "Image Management"
            UC10[Upload Image - Drag & Drop]
            UC11[View Image]
            UC12[Edit Image Details]
            UC13[Delete Image]
            UC14[Download Image]
            UC15[Image Optimization]
            UC16[Set Image Visibility]
        end

        subgraph "Reels Management"
            UC20[Upload Reel]
            UC21[View Reels Feed]
            UC22[Like Reel]
            UC23[Comment on Reel]
            UC24[Save Reel]
            UC25[Share Reel]
        end

        subgraph "AI-Powered Features"
            UC30[AI Auto-Generate Caption]
            UC31[AI Generate Tags]
            UC32[AI Detect Category]
            UC33[AI Generate Alt Text]
            UC34[AI Semantic Search]
            UC35[AI Comment Moderation]
            UC36[AI Copyright Detection]
            UC37[AI Chat Assistant]
            UC38[AI Creator Growth Agent]
            UC39[AI Smart Feed Ranking]
            UC40[AI Report Generation]
        end

        subgraph "Social Interactions"
            UC50[Like Image]
            UC51[Comment on Image]
            UC52[Reply to Comment]
            UC53[Follow User]
            UC54[Unfollow User]
            UC55[Add to Favorites]
            UC56[Share to Social Media]
        end

        subgraph "Collections"
            UC60[Create Collection]
            UC61[Add Image to Collection]
            UC62[View Collections]
            UC63[Delete Collection]
        end

        subgraph "Messaging & Notifications"
            UC70[Send Direct Message]
            UC71[View Conversations]
            UC72[View Notifications]
            UC73[Real-time Updates]
        end

        subgraph "Discovery & Search"
            UC80[Smart Search Images]
            UC81[Filter by Category]
            UC82[Filter by Tags]
            UC83[Browse Trending]
            UC84[View User Profile]
            UC85[Infinite Scroll Feed]
            UC86[Masonry Layout View]
        end

        subgraph "User Experience"
            UC90[Toggle Dark/Light Theme]
            UC91[Responsive Layout]
            UC92[Keyboard Shortcuts]
            UC93[Edit Profile]
        end

        subgraph "Analytics & Insights"
            UC100[View User Dashboard]
            UC101[View Image Analytics]
            UC102[View Engagement Stats]
            UC103[View Follower Growth]
            UC104[Get AI Growth Suggestions]
        end

        subgraph "Administration"
            UC110[View Admin Dashboard]
            UC111[Manage All Users]
            UC112[Ban/Unban User]
            UC113[View User Reports]
            UC114[Review Flagged Content]
            UC115[Generate AI Platform Report]
            UC116[Content Moderation Queue]
        end

        subgraph "Reporting & Safety"
            UC120[Report User]
            UC121[Report Image]
            UC122[Appeal Ban]
        end
    end

    Guest --> UC1
    Guest --> UC2
    Guest --> UC3
    Guest --> UC11
    Guest --> UC83
    Guest --> UC84

    User --> UC4
    User --> UC5
    User --> UC7
    User --> UC10
    User --> UC11
    User --> UC12
    User --> UC13
    User --> UC20
    User --> UC21
    User --> UC22
    User --> UC30
    User --> UC37
    User --> UC50
    User --> UC51
    User --> UC53
    User --> UC55
    User --> UC60
    User --> UC70
    User --> UC72
    User --> UC80
    User --> UC90
    User --> UC93
    User --> UC100
    User --> UC120

    Creator --> UC38
    Creator --> UC104

    Premium --> UC36
    Premium --> UC6

    Admin --> UC110
    Admin --> UC111
    Admin --> UC112
    Admin --> UC113
    Admin --> UC114
    Admin --> UC115
    Admin --> UC40
```

---

## 2. CLASS DIAGRAM

```mermaid
classDiagram
    class User {
        -ObjectId _id
        -String username
        -String email
        -String password
        -String fullName
        -String profilePicture
        -String coverPicture
        -String bio
        -Enum badge
        -Enum profileVisibility
        -Enum accountStatus
        -Boolean isVerified
        -Boolean isPremium
        -Boolean twoFactorEnabled
        -Number followersCount
        -Number followingCount
        -Number postsCount
        -Number likesCount
        -Enum provider
        -Date lastLogin
        -Date createdAt
        +register()
        +login()
        +verifyEmail()
        +resetPassword()
        +updateProfile()
        +deleteAccount()
        +enableTwoFactor()
        +updateBadge()
    }

    class Image {
        -ObjectId _id
        -ObjectId user
        -String title
        -String description
        -String imageUrl
        -String publicId
        -String thumbnailUrl
        -Enum category
        -Enum license
        -Array tags
        -String altText
        -Boolean aiGenerated
        -Number aiCaptionConfidence
        -Number copyrightScore
        -Number imageSize
        -Object dimensions
        -Number likesCount
        -Number commentsCount
        -Number favoritesCount
        -Number viewsCount
        -Enum visibility
        -Boolean commentsAllowed
        -Date createdAt
        +upload()
        +update()
        +delete()
        +generateAIMetadata()
        +checkCopyright()
        +incrementViews()
    }

    class Reel {
        -ObjectId _id
        -ObjectId user
        -String caption
        -String videoUrl
        -String publicId
        -String thumbnailUrl
        -Number duration
        -Enum aspectRatio
        -Enum category
        -Array tags
        -Number likesCount
        -Number commentsCount
        -Number savesCount
        -Number viewsCount
        -Enum visibility
        -Date createdAt
        +upload()
        +delete()
        +incrementViews()
    }

    class Collection {
        -ObjectId _id
        -ObjectId user
        -String name
        -String description
        -Enum visibility
        -Array images
        -String coverImage
        -Number imagesCount
        -Date createdAt
        +create()
        +addImage()
        +removeImage()
        +delete()
    }

    class Comment {
        -ObjectId _id
        -ObjectId user
        -ObjectId image
        -String text
        -ObjectId parentComment
        -Number toxicityScore
        -Boolean isHidden
        -Date createdAt
        +create()
        +delete()
        +moderate()
    }

    class Like {
        -ObjectId _id
        -ObjectId user
        -ObjectId image
        -Date createdAt
        +create()
        +delete()
    }

    class Favorite {
        -ObjectId _id
        -ObjectId user
        -ObjectId image
        -Date createdAt
        +add()
        +remove()
    }

    class Follow {
        -ObjectId _id
        -ObjectId follower
        -ObjectId following
        -Date createdAt
        +follow()
        +unfollow()
    }

    class Message {
        -ObjectId _id
        -ObjectId conversation
        -ObjectId sender
        -String text
        -Boolean isRead
        -Date createdAt
        +send()
        +markAsRead()
    }

    class Conversation {
        -ObjectId _id
        -Array participants
        -ObjectId lastMessage
        -Date updatedAt
        +create()
        +getMessages()
    }

    class Notification {
        -ObjectId _id
        -ObjectId recipient
        -ObjectId sender
        -Enum type
        -ObjectId image
        -Boolean isRead
        -Date createdAt
        +create()
        +markAsRead()
    }

    class Report {
        -ObjectId _id
        -ObjectId reporter
        -ObjectId reportedUser
        -ObjectId reportedImage
        -Enum reason
        -String description
        -Enum status
        -Date createdAt
        +submit()
        +review()
        +resolve()
    }

    class AIAnalysisResult {
        -ObjectId _id
        -ObjectId image
        -String title
        -String description
        -Array tags
        -String category
        -String altText
        -Number confidence
        -Boolean copyrightMatch
        -Array similarImages
        +analyze()
        +checkCopyright()
    }

    class AIChatSession {
        -ObjectId _id
        -ObjectId user
        -Array messages
        -Object context
        -Date createdAt
        +sendMessage()
        +getResponse()
        +clearHistory()
    }

    class CreatorAnalytics {
        -ObjectId _id
        -ObjectId user
        -Date period
        -Number totalViews
        -Number totalLikes
        -Number engagementRate
        -Array topPosts
        -Array bestPostingTimes
        -Array suggestedTopics
        +calculate()
        +generateInsights()
    }

    class PlatformAnalytics {
        -ObjectId _id
        -Date period
        -Number totalUsers
        -Number activeUsers
        -Number totalImages
        -Number totalEngagement
        -Array trendingCategories
        -String aiGeneratedReport
        +generate()
        +exportReport()
    }

    User "1" --> "*" Image : uploads
    User "1" --> "*" Reel : creates
    User "1" --> "*" Collection : owns
    User "1" --> "*" Comment : writes
    User "1" --> "*" Like : gives
    User "1" --> "*" Favorite : saves
    User "1" --> "*" Follow : follows
    User "1" --> "*" Message : sends
    User "1" --> "*" Notification : receives
    User "1" --> "1" CreatorAnalytics : has
    User "1" --> "*" AIChatSession : uses

    Image "1" --> "*" Comment : has
    Image "1" --> "*" Like : has
    Image "1" --> "*" Favorite : has
    Image "1" --> "1" AIAnalysisResult : analyzedBy
    Image "*" --> "1" Collection : belongsTo

    Conversation "1" --> "*" Message : contains
    Conversation "*" --> "2" User : between
```

---

## 3. ACTIVITY DIAGRAM - Image Upload with AI Features

```mermaid
flowchart TD
    A([Start]) --> B[User clicks Upload button]
    B --> C[Display upload interface with drag & drop]
    C --> D{User action}
    D -->|Drag & Drop| E[Receive dropped file]
    D -->|Click| F[Open file selector]
    E --> G[Validate file]
    F --> G
    
    G --> H{File valid?}
    H -->|No| I[Display error message]
    I --> C
    
    H -->|Yes| J[Show image preview]
    J --> K[Display file info]
    K --> L[Compress and optimize image]
    
    L --> M{Generate with AI?}
    M -->|No| N[User enters metadata manually]
    
    M -->|Yes| O[Send image to Gemini AI]
    O --> P1[Generate title]
    O --> P2[Generate description]
    O --> P3[Generate tags]
    O --> P4[Detect category]
    O --> P5[Generate alt text]
    O --> P6[Check copyright]
    
    P1 --> Q[Display AI metadata]
    P2 --> Q
    P3 --> Q
    P4 --> Q
    P5 --> Q
    P6 --> Q
    
    Q --> R{Copyright issue?}
    R -->|Yes| S[Display warning with similar images]
    S --> T{User confirms original?}
    T -->|No| U([Cancel - End])
    T -->|Yes| V[Proceed]
    
    R -->|No| V
    N --> V
    
    V --> W[User reviews/edits metadata]
    W --> X[Set visibility]
    X --> Y[Configure comments]
    Y --> Z[Select license]
    Z --> AA[Add to collection - optional]
    
    AA --> AB{Publish?}
    AB -->|No| AC[Save as draft]
    AC --> AD([End])
    
    AB -->|Yes| AE[Upload to Cloudinary CDN]
    AE --> AF{Upload successful?}
    AF -->|No| AG[Display error - allow retry]
    AG --> AE
    
    AF -->|Yes| AH[Save metadata to MongoDB]
    AH --> AI[Update user post count]
    AI --> AJ[Index for semantic search]
    AJ --> AK[Notify followers]
    AK --> AL[Display success notification]
    AL --> AM[Redirect to image page]
    AM --> AD
```

---

## 4. ACTIVITY DIAGRAM - AI Smart Feed Ranking

```mermaid
flowchart TD
    A([Start]) --> B[User opens home feed]
    B --> C[Fetch user preferences and history]
    
    C --> D1[Analyze user interests]
    C --> D2[Get engagement data]
    C --> D3[Fetch content pool]
    
    D1 --> E[Apply AI ranking algorithm]
    D2 --> E
    D3 --> E
    
    E --> F[Calculate ranking signals]
    
    subgraph "Ranking Signals"
        F --> G1[User interest match score]
        F --> G2[Image similarity score]
        F --> G3[Engagement probability]
        F --> G4[Recency factor]
        F --> G5[Creator relationship score]
        F --> G6[Content quality score]
    end
    
    G1 --> H[Combine scores]
    G2 --> H
    G3 --> H
    G4 --> H
    G5 --> H
    G6 --> H
    
    H --> I[Sort by combined score]
    I --> J[Apply diversity filter]
    J --> K[Filter blocked/reported content]
    K --> L[Paginate for infinite scroll]
    L --> M[Return ranked feed]
    
    M --> N[User scrolls feed]
    N --> O{User interacts?}
    O -->|Yes| P[Update preference model]
    P --> Q[Adjust recommendations]
    Q --> R{More content?}
    O -->|No| R
    
    R -->|Yes| S[Load next batch]
    S --> N
    R -->|No| T([End])
```

---

## 5. SEQUENCE DIAGRAM - User Authentication

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Frontend<br>(Next.js)
    participant NextAuth as NextAuth.js
    participant Backend as Backend API<br>(Express)
    participant DB as MongoDB
    participant JWT as JWT Service
    participant Google as Google OAuth

    rect rgb(240, 248, 255)
        Note over User,JWT: Email/Password Login Flow
        User->>Frontend: Enter email and password
        Frontend->>NextAuth: signIn(credentials)
        NextAuth->>Backend: POST /api/users/login
        Backend->>DB: findOne({ email })
        DB-->>Backend: User document
        
        alt User not found
            Backend-->>NextAuth: 404 User not found
            NextAuth-->>Frontend: Error
            Frontend-->>User: Display "User not found"
        else User found
            Backend->>Backend: bcrypt.compare(password)
            alt Password incorrect
                Backend-->>NextAuth: 401 Invalid password
                NextAuth-->>Frontend: Error
                Frontend-->>User: Display "Invalid password"
            else Password correct
                alt Email not verified
                    Backend-->>NextAuth: 403 Email not verified
                    Frontend-->>User: Display "Please verify email"
                else Account suspended
                    Backend-->>NextAuth: 403 Suspended
                    Frontend-->>User: Display "Account suspended"
                else Account active
                    Backend->>JWT: Generate access token
                    JWT-->>Backend: JWT token (24h expiry)
                    Backend->>DB: Update lastLogin
                    Backend-->>NextAuth: 200 { user, token }
                    NextAuth->>NextAuth: Create session
                    NextAuth-->>Frontend: Session created
                    Frontend-->>User: Redirect to Dashboard
                end
            end
        end
    end

    rect rgb(255, 248, 240)
        Note over User,Google: Google OAuth Login Flow
        User->>Frontend: Click "Login with Google"
        Frontend->>NextAuth: signIn("google")
        NextAuth->>Google: Redirect to OAuth
        Google-->>User: Show consent screen
        User->>Google: Grant permissions
        Google-->>NextAuth: Return auth code
        NextAuth->>Google: Exchange for tokens
        Google-->>NextAuth: access_token, id_token
        NextAuth->>NextAuth: Extract user info
        NextAuth->>Backend: POST /api/users/google-auth
        Backend->>DB: Find or create user
        Backend->>JWT: Generate token
        Backend-->>NextAuth: 200 { user, token }
        NextAuth-->>Frontend: Session created
        Frontend-->>User: Redirect to Dashboard
    end
```

---

## 6. SEQUENCE DIAGRAM - AI Image Analysis & Copyright Check

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Frontend
    participant Backend as Backend API
    participant Cloudinary as Cloudinary
    participant Gemini as Google Gemini AI
    participant Copyright as Copyright Service
    participant DB as MongoDB

    User->>Frontend: Upload image + click "Generate with AI"
    Frontend->>Backend: POST /api/images/ai-analyze (image file)
    
    Backend->>Cloudinary: Upload image (temp)
    Cloudinary-->>Backend: { tempUrl, publicId }
    
    Backend->>Backend: Convert to base64
    
    par AI Analysis (Parallel)
        Backend->>Gemini: analyzeImage(base64)
        Gemini->>Gemini: Gemini Vision processing
        Gemini-->>Backend: { title, description, tags, category, altText, confidence }
    and Copyright Check
        Backend->>Copyright: checkSimilarity(imageHash)
        Copyright->>DB: Search image embeddings
        DB-->>Copyright: Similar images list
        Copyright-->>Backend: { isSimilar, matchScore, similarImages }
    end
    
    Backend->>Backend: Combine AI results
    
    alt Copyright match found (score > 85%)
        Backend-->>Frontend: { metadata, copyrightWarning: true, similarImages }
        Frontend-->>User: Display warning + similar images
        alt User confirms original
            User->>Frontend: Click "I confirm original"
            Frontend->>Backend: POST /api/images/upload (confirmed)
        else User cancels
            User->>Frontend: Cancel
            Frontend->>Backend: DELETE temp image
            Backend->>Cloudinary: Delete temp file
            Frontend-->>User: Upload cancelled
        end
    else No copyright issues
        Backend-->>Frontend: { metadata, copyrightWarning: false }
        Frontend->>Frontend: Populate form with AI data
        Frontend-->>User: Display editable metadata
    end
    
    User->>Frontend: Review, edit, publish
    Frontend->>Backend: POST /api/images/upload (final)
    Backend->>DB: Save image document
    Backend->>DB: Save AIAnalysisResult
    Backend->>DB: Update user.postsCount
    Backend-->>Frontend: 201 { image, message }
    Frontend-->>User: Success! Redirect to image
```

---

## 7. SEQUENCE DIAGRAM - AI Chat Assistant

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Frontend
    participant Context as Chat Context
    participant Backend as Backend API
    participant Gemini as Google Gemini AI
    participant DB as MongoDB

    User->>Frontend: Open AI Chat Assistant
    Frontend->>Context: Initialize chat session
    Context->>Backend: GET /api/ai/chat/session
    Backend->>DB: Get or create session
    DB-->>Backend: Session with history
    Backend-->>Context: { sessionId, history }
    Context-->>Frontend: Chat ready
    Frontend-->>User: Display chat interface

    rect rgb(240, 255, 240)
        Note over User,Gemini: Text Query Flow
        User->>Frontend: "Why is my post not trending?"
        Frontend->>Context: sendMessage(query)
        Context->>Backend: POST /api/ai/chat { message, sessionId }
        Backend->>DB: Get user context (stats, posts)
        DB-->>Backend: User data
        Backend->>DB: Get platform context (trends)
        DB-->>Backend: Platform data
        
        Backend->>Gemini: generateResponse({ query, userContext, platformContext })
        Gemini->>Gemini: Process with system prompt
        Gemini-->>Backend: { response with insights }
        
        Backend->>DB: Save message to history
        Backend-->>Context: { response, suggestions }
        Context-->>Frontend: Display response
        Frontend-->>User: Show AI insights
    end

    rect rgb(255, 240, 255)
        Note over User,Gemini: Image + Query Flow
        User->>Frontend: "Suggest captions" + attach image
        Frontend->>Context: sendMessage(query, image)
        Context->>Backend: POST /api/ai/chat { message, image, sessionId }
        Backend->>Gemini: analyzeAndRespond(image, query)
        Gemini-->>Backend: { captions: ["...", "...", "..."] }
        Backend-->>Context: { captions }
        Context-->>Frontend: Display suggestions
        Frontend-->>User: Show 3 caption options
    end
```

---

## 8. SEQUENCE DIAGRAM - AI Comment Moderation

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Frontend
    participant Backend as Backend API
    participant Perspective as Perspective API
    participant Gemini as Gemini AI
    participant DB as MongoDB
    actor Owner as Content Owner
    actor Admin as Admin

    User->>Frontend: Submit comment on image
    Frontend->>Backend: POST /api/comments { imageId, text }
    
    Backend->>Perspective: analyzeComment(text)
    Perspective->>Perspective: Analyze toxicity, spam, threats
    Perspective-->>Backend: { toxicity: 0.85, spam: 0.15, ... }
    
    Backend->>Backend: Apply moderation rules

    alt Toxicity > 90% (Severe)
        Backend->>DB: Save comment (hidden, autoFlagged)
        Backend->>DB: Create admin notification
        Backend-->>Frontend: 403 "Comment blocked"
        Frontend-->>User: "Comment flagged for review"
        Backend-->>Admin: Notification: Review flagged comment
        
    else Toxicity > 70% (Moderate)
        Backend->>Gemini: classifyIntent(text)
        Gemini-->>Backend: { intent, context }
        alt Legitimate criticism
            Backend->>DB: Save comment (visible, toxicityScore)
            Backend-->>Frontend: 201 Comment posted
            Frontend-->>User: Comment appears
        else Harmful
            Backend->>DB: Save comment (hidden)
            Backend-->>Frontend: 403 "Under review"
            Frontend-->>User: "Comment under review"
        end
        
    else Toxicity < 70% (Safe)
        Backend->>DB: Save comment (visible)
        Backend->>DB: Create notification for owner
        Backend-->>Frontend: 201 Comment posted
        Frontend-->>User: Comment appears instantly
        Backend-->>Owner: New comment notification
    end

    rect rgb(255, 245, 238)
        Note over Owner,Admin: Manual Report Flow
        Owner->>Frontend: Report comment
        Frontend->>Backend: POST /api/reports { commentId, reason }
        Backend->>DB: Create report, flag comment
        Backend-->>Frontend: Report submitted
        Frontend-->>Owner: "Thank you for reporting"
        
        Admin->>Frontend: View moderation queue
        Frontend->>Backend: GET /api/admin/flagged-content
        Backend-->>Frontend: Flagged comments list
        Admin->>Frontend: Take action (remove/approve)
        Frontend->>Backend: POST /api/admin/moderate { action }
        Backend->>DB: Update status, notify reporter
        Backend-->>Frontend: Action completed
    end
```

---

## 9. STATE DIAGRAM - User Account States

```mermaid
stateDiagram-v2
    [*] --> Unregistered

    state Unregistered {
        [*] --> Guest
        Guest: Can view public content
        Guest: Can browse and search
        Guest: Cannot interact or upload
    }

    Unregistered --> Registering: Click Register

    state Registering {
        [*] --> FormFilling
        FormFilling: Enter username, email, password
        FormFilling --> Validating: Submit
        Validating: Check uniqueness, strength
        Validating --> FormFilling: Failed
        Validating --> AccountCreated: Passed
        AccountCreated: Saved to DB, email sent
    }

    Registering --> PendingVerification: Account created

    state PendingVerification {
        PendingVerification: Email not verified
        PendingVerification: Limited features
    }

    PendingVerification --> Active: Verify email
    PendingVerification --> Expired: Link expires (24h)
    Expired --> PendingVerification: Request new link

    state Active {
        [*] --> Newbie
        
        state BadgeProgression {
            Newbie: Posts 0-4
            Newbie --> Rising: Posts > 4
            Rising: Followers < 50
            Rising --> Pro: Followers >= 50
            Pro: Likes < 100
            Pro --> Trendsetter: Likes >= 100
            Trendsetter: Featured placement
        }
        
        state AccountType {
            StandardUser: Basic features
            StandardUser --> PremiumUser: Subscribe
            PremiumUser: Unlimited uploads
            PremiumUser: AI copyright
            PremiumUser: Priority support
            PremiumUser --> StandardUser: Expires
        }
        
        state TwoFactorAuth {
            TwoFADisabled: Standard login
            TwoFADisabled --> TwoFAEnabled: Enable
            TwoFAEnabled: TOTP required
            TwoFAEnabled --> TwoFADisabled: Disable
        }
    }

    Active --> Suspended: Admin bans / Violation
    Active --> SelfDeactivated: User deactivates
    Active --> Deleted: Request deletion

    state Suspended {
        Suspended: Cannot login
        Suspended: Content hidden
    }

    Suspended --> UnderAppeal: User appeals
    UnderAppeal --> Active: Appeal approved
    UnderAppeal --> Suspended: Appeal denied
    UnderAppeal --> PermanentlyBanned: Severe violation

    state SelfDeactivated {
        SelfDeactivated: Account hidden
        SelfDeactivated: Data preserved
    }

    SelfDeactivated --> Active: Reactivate (login)
    SelfDeactivated --> Deleted: No activity 1 year

    state PermanentlyBanned {
        PermanentlyBanned: Cannot appeal
    }

    state Deleted {
        Deleted: Account removed
        Deleted: Data anonymized
    }

    PermanentlyBanned --> [*]
    Deleted --> [*]
```

---

## 10. STATE DIAGRAM - Image Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Uploading

    state Uploading {
        [*] --> FileSelected
        FileSelected: Image chosen
        FileSelected --> Validating: Submit
        
        Validating: Check type, size, dimensions
        Validating --> FileSelected: Invalid
        Validating --> Optimizing: Valid
        
        Optimizing: Compress, thumbnail, responsive
        Optimizing --> AIProcessing: Complete
        
        AIProcessing: AI analyzing
        AIProcessing --> CopyrightCheck: Generate metadata
        AIProcessing --> MetadataReview: Skip AI
        
        CopyrightCheck: Check similarity
        CopyrightCheck --> CopyrightWarning: Match found
        CopyrightCheck --> MetadataReview: No match
        
        CopyrightWarning: Display warning
        CopyrightWarning --> MetadataReview: Confirm original
        CopyrightWarning --> Cancelled: Cancel
        
        MetadataReview: Edit, visibility, comments
        MetadataReview --> CloudUpload: Publish
        
        CloudUpload: Upload to Cloudinary
        CloudUpload --> Failed: Error
        CloudUpload --> Published: Success
    }

    Uploading --> Draft: Save draft
    Draft --> Uploading: Resume
    Draft --> Deleted: Delete draft

    state Published {
        [*] --> Public
        
        Public: Visible to all, searchable
        Private: Owner only, direct link
        FollowersOnly: Followers see
        
        Public --> Private: Change
        Public --> FollowersOnly: Change
        Private --> Public: Change
        Private --> FollowersOnly: Change
        FollowersOnly --> Public: Change
        FollowersOnly --> Private: Change
        
        state Interactions {
            Normal: Standard display
            Normal --> Trending: High engagement
            Trending: Featured, boosted
            Trending --> Normal: Drops
            Normal --> Featured: Admin features
            Featured --> Normal: Period ends
        }
    }

    Published --> Reported: User reports

    state Reported {
        PendingReview: Under investigation
        PendingReview --> Reviewed: Admin reviews
    }

    Reported --> Published: Dismissed
    Reported --> Hidden: Confirmed

    state Hidden {
        Hidden: Removed from feed/search
        Hidden: Policy violation notice
    }

    Hidden --> Published: Appeal success
    Hidden --> Deleted: Admin removes

    Published --> Editing: Owner edits
    Editing --> Published: Save

    Published --> Deleted: Owner deletes

    state Deleted {
        Deleted: Cloudinary cleanup
        Deleted: Removed from collections
    }

    state Failed {
        Failed: Upload error
    }

    Failed --> Uploading: Retry
    Failed --> [*]: Cancel
    Cancelled --> [*]
    Deleted --> [*]
```

---

## 11. STATE DIAGRAM - AI Creator Growth Agent

```mermaid
stateDiagram-v2
    [*] --> Inactive

    state Inactive {
        Inactive: Not using growth features
        Inactive: Dashboard available
    }

    Inactive --> Monitoring: Enable growth agent

    state Monitoring {
        [*] --> CollectingData
        
        CollectingData: Gathering metrics
        CollectingData: Analyzing patterns
        CollectingData: Tracking growth
        CollectingData --> Analyzing: 7 days data
        
        Analyzing: AI processing
        Analyzing: Comparing to successful creators
        Analyzing --> GeneratingInsights: Complete
        
        GeneratingInsights: Creating recommendations
        GeneratingInsights --> Ready: Done
        
        state Ready {
            [*] --> DisplayingInsights
            
            DisplayingInsights: Best posting times
            DisplayingInsights: Trending topics
            DisplayingInsights: Hashtag suggestions
            
            DisplayingInsights --> SuggestingAction: View
            SuggestingAction: Specific recommendation
            SuggestingAction --> TrackingAction: Act
            SuggestingAction --> DisplayingInsights: Dismiss
            
            TrackingAction: Monitor outcome
            TrackingAction --> MeasuringImpact: 48h
            
            MeasuringImpact: Compare before/after
            MeasuringImpact --> UpdatingModel: Calculated
            
            UpdatingModel: Refine recommendations
            UpdatingModel --> DisplayingInsights: Updated
        }
    }

    Monitoring --> Paused: Pause

    state Paused {
        Paused: Agent inactive
        Paused: Data preserved
    }

    Paused --> Monitoring: Resume
    Paused --> Inactive: Disable

    state WeeklyReport {
        ScheduledReport: Sunday 9 AM
        ScheduledReport --> CompilingStats: Trigger
        CompilingStats --> GeneratingReport: Done
        GeneratingReport: AI writing summary
        GeneratingReport --> SendingReport: Ready
        SendingReport: Email + in-app
    }

    Monitoring --> WeeklyReport: Weekly trigger
    WeeklyReport --> Monitoring: Delivered
```

---

## 12. COMPONENT DIAGRAM

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer"]
        subgraph NextJSApp["Next.js Frontend"]
            Pages["Pages/App Router"]
            Components["React Components"]
            Context["Context Providers"]
            Axios["API Client (Axios)"]
        end
        NextAuthClient["NextAuth.js Client"]
    end

    subgraph AuthLayer["Authentication Layer"]
        NextAuth["NextAuth.js"]
        JWTHandler["JWT Handler"]
        SessionMgr["Session Manager"]
    end

    subgraph APILayer["API Layer"]
        Express["Express.js Server"]
        Routes["API Routes"]
        Controllers["Controllers"]
        AuthMiddleware["Auth Middleware"]
        RateLimiter["Rate Limiter"]
        Validator["Request Validator"]
    end

    subgraph BusinessLogic["Business Logic"]
        UserService["User Service"]
        ImageService["Image Service"]
        ReelService["Reel Service"]
        SocialService["Social Service"]
        NotifService["Notification Service"]
        AnalyticsService["Analytics Service"]
    end

    subgraph AIServices["AI Services Layer"]
        AIImageAnalyzer["AI Image Analyzer"]
        AICaptionGen["AI Caption Generator"]
        AITagGen["AI Tag Generator"]
        AIChatAssist["AI Chat Assistant"]
        AIReportGen["AI Report Generator"]
        AIGrowthAgent["AI Growth Agent"]
        AICopyright["Copyright Detector"]
        AIModerator["Content Moderator"]
    end

    subgraph DataAccess["Data Access Layer"]
        Mongoose["Mongoose ODM"]
        UserModel["User Model"]
        ImageModel["Image Model"]
        ReelModel["Reel Model"]
        CollectionModel["Collection Model"]
        CommentModel["Comment Model"]
        NotifModel["Notification Model"]
        MessageModel["Message Model"]
        ReportModel["Report Model"]
    end

    subgraph ExternalServices["External Services"]
        Cloudinary[("Cloudinary CDN")]
        Gemini[("Google Gemini AI")]
        GoogleOAuth[("Google OAuth")]
        Perspective[("Perspective API")]
        SMTP[("SMTP Service")]
    end

    MongoDB[("MongoDB Atlas")]

    Pages --> Components
    Components --> Context
    Components --> Axios
    NextJSApp --> NextAuthClient

    NextAuth --> JWTHandler
    NextAuth --> SessionMgr

    Express --> Routes
    Routes --> Controllers
    Routes --> AuthMiddleware
    Routes --> RateLimiter

    Controllers --> UserService
    Controllers --> ImageService
    Controllers --> ReelService
    Controllers --> SocialService
    Controllers --> NotifService
    Controllers --> AnalyticsService

    ImageService --> AIImageAnalyzer
    ImageService --> AICaptionGen
    ImageService --> AITagGen
    ImageService --> AICopyright
    SocialService --> AIModerator
    AnalyticsService --> AIGrowthAgent
    AnalyticsService --> AIReportGen

    Mongoose --> UserModel
    Mongoose --> ImageModel
    Mongoose --> ReelModel
    Mongoose --> CollectionModel
    Mongoose --> CommentModel
    Mongoose --> NotifModel
    Mongoose --> MessageModel
    Mongoose --> ReportModel

    Mongoose --> MongoDB

    ImageService --> Cloudinary
    ReelService --> Cloudinary
    AIImageAnalyzer --> Gemini
    AICaptionGen --> Gemini
    AIChatAssist --> Gemini
    AIReportGen --> Gemini
    AIModerator --> Perspective
    NextAuth --> GoogleOAuth
    NotifService --> SMTP

    Axios --> Express
    NextAuthClient --> NextAuth
```

---

## 13. DEPLOYMENT DIAGRAM

```mermaid
flowchart TB
    subgraph UserDevices["User Devices"]
        Desktop["Desktop Browser<br>React SPA"]
        Mobile["Mobile Browser<br>Responsive PWA"]
        Tablet["Tablet<br>Responsive App"]
    end

    subgraph Vercel["Vercel Edge Network"]
        subgraph EdgeFunctions["Edge Functions"]
            NextJS["Next.js App"]
            VercelAPI["API Routes"]
            StaticAssets["Static Assets"]
            NextAuthDeploy["NextAuth.js"]
        end
        subgraph Serverless["Serverless"]
            ISR["ISR Pages"]
            SSR["SSR Pages"]
        end
    end

    subgraph Backend["Backend Hosting (Render)"]
        subgraph NodeContainer["Node.js Container"]
            ExpressAPI["Express.js API"]
            MongooseODM["Mongoose ODM"]
            AIClients["AI Service Clients"]
            Multer["Multer Upload"]
        end
        subgraph Workers["Background Workers"]
            NotifWorker["Notification Worker"]
            AnalyticsWorker["Analytics Worker"]
            CleanupWorker["Cleanup Worker"]
        end
    end

    subgraph MongoAtlas["MongoDB Atlas"]
        subgraph Primary["Primary (US-East)"]
            PrimaryDB[("Primary Node")]
        end
        subgraph Secondary["Secondary Regions"]
            SecondaryUS[("US-West")]
            SecondaryEU[("EU-West")]
        end
    end

    subgraph CloudinaryCDN["Cloudinary"]
        subgraph CDN["Global CDN"]
            ImageStore[("Image Storage")]
            VideoStore[("Video Storage")]
            Transform["Transform Engine"]
        end
    end

    subgraph GCP["Google Cloud Platform"]
        subgraph VertexAI["Vertex AI"]
            GeminiPro["Gemini 1.5 Pro"]
            GeminiVision["Gemini Vision"]
        end
        subgraph Identity["Identity Platform"]
            OAuthServer["OAuth 2.0 Server"]
        end
    end

    subgraph Jigsaw["Jigsaw (Google)"]
        PerspectiveAPI["Perspective API<br>Toxicity Model"]
    end

    subgraph Email["Email Service"]
        SendGrid["SendGrid/Resend<br>Transactional Email"]
    end

    Desktop -->|HTTPS| EdgeFunctions
    Mobile -->|HTTPS| EdgeFunctions
    Tablet -->|HTTPS| EdgeFunctions

    EdgeFunctions -->|REST API| NodeContainer
    NodeContainer -->|MongoDB TLS| PrimaryDB

    PrimaryDB -->|Replication| SecondaryUS
    PrimaryDB -->|Replication| SecondaryEU

    NodeContainer -->|REST| CDN
    NodeContainer -->|gRPC/REST| VertexAI
    NodeContainer -->|REST| PerspectiveAPI
    NodeContainer -->|REST| SendGrid

    EdgeFunctions -->|OAuth 2.0| OAuthServer

    Desktop -->|HTTPS Media| CDN
    Mobile -->|HTTPS Media| CDN

    Workers -->|MongoDB| PrimaryDB
    Workers -->|Email| SendGrid
```

---

## 14. DATA FLOW DIAGRAM - Level 0 (Context)

```mermaid
flowchart LR
    User((User))
    Admin((Administrator))
    External((External APIs))

    System[["ProConnect<br>System"]]

    User -->|Registration data<br>Login credentials<br>Content uploads<br>Interactions| System
    System -->|Feed content<br>Notifications<br>Analytics<br>AI suggestions| User

    Admin -->|Moderation actions<br>User management<br>Report resolution| System
    System -->|Platform reports<br>Flagged content<br>User data| Admin

    System -->|Image data<br>AI requests<br>Auth tokens| External
    External -->|AI analysis<br>OAuth tokens<br>Media URLs| System
```

---

## 15. DATA FLOW DIAGRAM - Level 1

```mermaid
flowchart TB
    User((User))
    Admin((Admin))

    subgraph System["ProConnect System"]
        Auth["1.0<br>Authentication"]
        Content["2.0<br>Content Mgmt"]
        Social["3.0<br>Social"]
        AI["4.0<br>AI Engine"]
        Feed["5.0<br>Feed & Discovery"]
        Analytics["6.0<br>Analytics"]
        Messaging["7.0<br>Messaging"]
        AdminPanel["8.0<br>Admin Panel"]
    end

    UserDB[("User DB")]
    ContentDB[("Content DB")]
    InteractionDB[("Interaction DB")]
    External[("External<br>Services")]

    User -->|Credentials| Auth
    Auth -->|Session token| User
    Auth -->|Store/verify| UserDB

    User -->|Upload| Content
    Content -->|Metadata| ContentDB
    Content -->|Media| External

    User -->|Like/Comment/Follow| Social
    Social -->|Store| InteractionDB
    Social -->|Real-time| User

    User -->|Request| Feed
    Feed -->|Fetch| ContentDB
    Feed -->|Rank| AI
    Feed -->|Personalized| User

    User -->|Send| Messaging
    Messaging -->|Receive| User

    User -->|View| Analytics
    Analytics -->|Stats| User

    Content -->|Analyze| AI
    AI -->|API| External
    AI -->|Results| ContentDB

    Social -->|Moderate| AI
    AI -->|Flag| InteractionDB

    Admin -->|Moderate| AdminPanel
    AdminPanel -->|Update| ContentDB
    AdminPanel -->|Ban/Unban| UserDB
    AdminPanel -->|Generate| AI
```

---

## 16. ENTITY RELATIONSHIP DIAGRAM

```mermaid
erDiagram
    USER ||--o{ IMAGE : uploads
    USER ||--o{ REEL : creates
    USER ||--o{ COLLECTION : owns
    USER ||--o{ COMMENT : writes
    USER ||--o{ LIKE : gives
    USER ||--o{ FAVORITE : saves
    USER ||--o{ FOLLOW : follows
    USER ||--o{ FOLLOW : followed_by
    USER ||--o{ MESSAGE : sends
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ REPORT : submits
    USER ||--|| CREATOR_ANALYTICS : has

    IMAGE ||--o{ COMMENT : has
    IMAGE ||--o{ LIKE : has
    IMAGE ||--o{ FAVORITE : has
    IMAGE ||--|| AI_ANALYSIS_RESULT : analyzed_by
    IMAGE }o--|| COLLECTION : belongs_to

    REEL ||--o{ REEL_LIKE : has
    REEL ||--o{ REEL_COMMENT : has
    REEL ||--o{ REEL_SAVE : has

    CONVERSATION ||--o{ MESSAGE : contains
    CONVERSATION }o--|| USER : participant1
    CONVERSATION }o--|| USER : participant2

    USER {
        ObjectId _id PK
        string username UK
        string email UK
        string password
        string fullName
        string profilePicture
        string coverPicture
        string bio
        enum badge
        enum profileVisibility
        enum accountStatus
        boolean isVerified
        boolean isPremium
        enum provider
        date lastLogin
        date createdAt
    }

    IMAGE {
        ObjectId _id PK
        ObjectId user FK
        string title
        string description
        string imageUrl
        string publicId
        enum category
        array tags
        string altText
        boolean aiGenerated
        number likesCount
        number commentsCount
        enum visibility
        date createdAt
    }

    REEL {
        ObjectId _id PK
        ObjectId user FK
        string caption
        string videoUrl
        string thumbnailUrl
        number duration
        enum category
        number likesCount
        number commentsCount
        date createdAt
    }

    COLLECTION {
        ObjectId _id PK
        ObjectId user FK
        string name
        string description
        enum visibility
        array images
        string coverImage
        date createdAt
    }

    COMMENT {
        ObjectId _id PK
        ObjectId user FK
        ObjectId image FK
        string text
        ObjectId parentComment
        number toxicityScore
        date createdAt
    }

    LIKE {
        ObjectId _id PK
        ObjectId user FK
        ObjectId image FK
        date createdAt
    }

    FOLLOW {
        ObjectId _id PK
        ObjectId follower FK
        ObjectId following FK
        date createdAt
    }

    MESSAGE {
        ObjectId _id PK
        ObjectId conversation FK
        ObjectId sender FK
        string text
        boolean isRead
        date createdAt
    }

    NOTIFICATION {
        ObjectId _id PK
        ObjectId recipient FK
        ObjectId sender FK
        enum type
        ObjectId image
        boolean isRead
        date createdAt
    }

    AI_ANALYSIS_RESULT {
        ObjectId _id PK
        ObjectId image FK
        string title
        string description
        array tags
        string category
        number confidence
        boolean copyrightMatch
        date createdAt
    }
```

---

## Quick Reference: How to View Diagrams

### Option 1: GitHub (Recommended)
- Push this file to GitHub - diagrams render automatically

### Option 2: VS Code
1. Install "Markdown Preview Mermaid Support" extension
2. Open preview (Ctrl+Shift+V)

### Option 3: Mermaid Live Editor
1. Go to https://mermaid.live/
2. Paste code between ```mermaid and ```
3. Export as PNG/SVG

### Option 4: Draw.io
1. Go to https://app.diagrams.net/
2. Arrange → Insert → Advanced → Mermaid

---

## Diagrams Summary

| # | Diagram Type | Description |
|---|--------------|-------------|
| 1 | Use Case | Complete system use cases with 5 actors |
| 2 | Class | 15 entity classes with relationships |
| 3 | Activity (Upload) | Full upload with AI & copyright check |
| 4 | Activity (Feed) | AI smart feed ranking algorithm |
| 5 | Sequence (Auth) | Email + Google OAuth login flows |
| 6 | Sequence (AI) | Image analysis + copyright detection |
| 7 | Sequence (Chat) | AI assistant conversation flow |
| 8 | Sequence (Moderation) | Comment moderation with Perspective API |
| 9 | State (User) | User account lifecycle with badges |
| 10 | State (Image) | Image upload to deletion lifecycle |
| 11 | State (Growth) | AI creator growth agent states |
| 12 | Component | System architecture layers |
| 13 | Deployment | Infrastructure deployment |
| 14 | DFD Level 0 | Context diagram |
| 15 | DFD Level 1 | Subsystem data flows |
| 16 | ER Diagram | Database entity relationships |

---

## Feature Coverage

### Implemented ✅
- Multi-provider auth (Email + Google)
- Email verification
- Image upload (drag & drop)
- Image optimization
- Dark/Light theme
- Responsive design
- Masonry layout
- Infinite scroll
- Smart search
- Collections
- Like/Comment/Follow
- Favorites
- Notifications
- Direct messaging
- User dashboard
- Admin panel
- AI captioning & tags
- AI chat assistant
- AI comment moderation
- AI admin reports
- Reels

### Planned 🚀
- Two-factor auth
- AI semantic search
- AI copyright detection
- AI creator growth agent
- AI smart feed ranking
- Keyboard shortcuts
- Social sharing
- Premium subscriptions
