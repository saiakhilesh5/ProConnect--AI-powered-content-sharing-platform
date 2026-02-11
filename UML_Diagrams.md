# ProConnect UML Diagrams

## How to View
- **GitHub**: Renders automatically
- **VS Code**: Install "Markdown Preview Mermaid Support"
- **Online**: https://mermaid.live/

---

## 1. USE CASE DIAGRAM

```mermaid
flowchart LR
    Guest((Guest))
    User((User))
    Admin((Admin))

    subgraph Auth[Authentication]
        A1[Register]
        A2[Login]
        A3[Google OAuth]
        A4[Verify Email]
    end

    subgraph Content[Content Management]
        C1[Upload Image]
        C2[Upload Reel]
        C3[Edit/Delete]
        C4[Set Visibility]
    end

    subgraph AI[AI Features]
        AI1[Auto Caption]
        AI2[Generate Tags]
        AI3[Chat Assistant]
        AI4[Comment Moderation]
        AI5[Copyright Check]
    end

    subgraph Social[Social]
        S1[Like/Comment]
        S2[Follow]
        S3[Favorites]
        S4[Collections]
        S5[Messaging]
    end

    subgraph Discovery[Discovery]
        D1[Search]
        D2[Trending]
        D3[Feed]
        D4[Profiles]
    end

    subgraph AdminPanel[Admin Panel]
        AP1[Manage Users]
        AP2[Ban/Unban]
        AP3[View Reports]
        AP4[AI Reports]
    end

    Guest --> A1 & A2 & A3
    Guest --> D1 & D2 & D4

    User --> A4 & Content & AI & Social & Discovery

    Admin --> AdminPanel
```

---

## 2. CLASS DIAGRAM

```mermaid
classDiagram
    direction LR
    
    class User {
        +String username
        +String email
        +String profilePicture
        +Boolean isVerified
        +Boolean isPremium
        +Number followersCount
        +register()
        +login()
        +updateProfile()
    }

    class Image {
        +String title
        +String imageUrl
        +Array tags
        +String category
        +Number likesCount
        +upload()
        +generateAIMetadata()
    }

    class Reel {
        +String caption
        +String videoUrl
        +Number duration
        +Number viewsCount
        +upload()
    }

    class Collection {
        +String name
        +Array images
        +create()
        +addImage()
    }

    class Comment {
        +String text
        +Number toxicityScore
        +create()
        +moderate()
    }

    class Notification {
        +String type
        +Boolean isRead
        +markAsRead()
    }

    class Message {
        +String text
        +Boolean isRead
        +send()
    }

    User "1" --> "*" Image
    User "1" --> "*" Reel
    User "1" --> "*" Collection
    User "1" --> "*" Comment
    User "1" --> "*" Notification
    Image "1" --> "*" Comment
    Image "*" --> "1" Collection
```

---

## 3. ACTIVITY DIAGRAM - Image Upload

```mermaid
flowchart LR
    A([Start]) --> B[Select Image]
    B --> C{Valid?}
    C -->|No| B
    C -->|Yes| D[Preview]
    D --> E{Use AI?}
    E -->|Yes| F[Generate Metadata]
    E -->|No| G[Manual Entry]
    F --> H[Review]
    G --> H
    H --> I{Copyright OK?}
    I -->|No| J([Cancel])
    I -->|Yes| K[Upload to CDN]
    K --> L[Save to DB]
    L --> M([Success])
```

---

## 4. ACTIVITY DIAGRAM - AI Feed Ranking

```mermaid
flowchart LR
    A([Start]) --> B[Fetch Preferences]
    B --> C[Get Content Pool]
    C --> D[Apply AI Ranking]
    D --> E[Interest Score]
    D --> F[Engagement Score]
    D --> G[Recency Score]
    E & F & G --> H[Sort & Filter]
    H --> I[Return Feed]
    I --> J{User Scrolls?}
    J -->|Yes| K[Load More]
    K --> J
    J -->|No| L([End])
```

---

## 5. SEQUENCE DIAGRAM - User Login

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as MongoDB

    U->>F: Enter credentials
    F->>B: POST /login
    B->>DB: Find user
    DB-->>B: User data
    
    alt Invalid
        B-->>F: 401 Error
        F-->>U: Show error
    else Valid
        B->>B: Generate JWT
        B-->>F: 200 + Token
        F-->>U: Redirect Dashboard
    end
```

---

## 6. SEQUENCE DIAGRAM - AI Image Analysis

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant AI as Gemini AI
    participant C as Cloudinary

    U->>F: Upload + Generate AI
    F->>B: POST /analyze
    B->>C: Upload temp
    C-->>B: Image URL
    
    par Parallel
        B->>AI: Analyze image
        AI-->>B: Title, Tags, Category
    end
    
    B-->>F: AI Metadata
    F-->>U: Show suggestions
    U->>F: Confirm & Publish
    F->>B: Save image
    B-->>F: Success
```

---

## 7. SEQUENCE DIAGRAM - AI Chat

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant AI as Gemini AI

    U->>F: Open Chat
    F->>B: Get session
    B-->>F: Chat history
    
    U->>F: "Why not trending?"
    F->>B: POST /chat
    B->>B: Get user context
    B->>AI: Generate response
    AI-->>B: Insights
    B-->>F: Response
    F-->>U: Display answer
```

---

## 8. SEQUENCE DIAGRAM - Comment Moderation

```mermaid
sequenceDiagram
    participant U as User
    participant B as Backend
    participant P as Perspective API
    participant DB as MongoDB

    U->>B: Post comment
    B->>P: Analyze toxicity
    P-->>B: Score
    
    alt Score > 90%
        B->>DB: Save hidden
        B-->>U: Blocked
    else Score > 70%
        B->>DB: Save flagged
        B-->>U: Under review
    else Safe
        B->>DB: Save visible
        B-->>U: Posted
    end
```

---

## 9. STATE DIAGRAM - User Account

```mermaid
stateDiagram-v2
    direction LR
    
    [*] --> Guest
    Guest --> Registered: Register
    Registered --> Verified: Email verified
    Registered --> Expired: Link expired
    Expired --> Registered: Resend
    
    Verified --> Active
    
    state Active {
        direction LR
        Newbie --> Rising: 5+ posts
        Rising --> Pro: 50+ followers
        Pro --> Trendsetter: 100+ likes
    }
    
    Active --> Suspended: Banned
    Suspended --> Active: Unbanned
    Suspended --> Banned: Severe
    Active --> Deleted: Delete account
    Banned --> [*]
    Deleted --> [*]
```

---

## 10. STATE DIAGRAM - Image Lifecycle

```mermaid
stateDiagram-v2
    direction LR
    
    [*] --> Uploading
    
    state Uploading {
        direction LR
        Selected --> Validating
        Validating --> Optimizing
        Optimizing --> AIAnalysis
        AIAnalysis --> Review
    }
    
    Uploading --> Draft: Save
    Draft --> Uploading: Edit
    Uploading --> Published: Publish
    
    state Published {
        direction LR
        Public --> Private
        Private --> Public
        Public --> Trending
        Trending --> Public
    }
    
    Published --> Reported: Report
    Reported --> Published: Dismissed
    Reported --> Hidden: Confirmed
    Hidden --> Published: Appeal
    Published --> Deleted: Delete
    Hidden --> Deleted: Remove
    Deleted --> [*]
```

---

## 11. STATE DIAGRAM - AI Growth Agent

```mermaid
stateDiagram-v2
    direction LR
    
    [*] --> Inactive
    Inactive --> Active: Enable
    
    state Active {
        direction LR
        Collecting --> Analyzing
        Analyzing --> Insights
        Insights --> Suggesting
        Suggesting --> Tracking
        Tracking --> Measuring
        Measuring --> Collecting
    }
    
    Active --> Paused: Pause
    Paused --> Active: Resume
    Paused --> Inactive: Disable
```

---

## 12. COMPONENT DIAGRAM

```mermaid
flowchart TB
    subgraph Client[Client Layer]
        NextJS[Next.js App]
        React[React Components]
        Context[Context Providers]
    end

    subgraph API[API Layer]
        Express[Express Server]
        Routes[Routes]
        Controllers[Controllers]
        Middleware[Middleware]
    end

    subgraph Services[Services]
        UserSvc[User Service]
        ImageSvc[Image Service]
        AISvc[AI Service]
        NotifSvc[Notification]
    end

    subgraph External[External]
        MongoDB[(MongoDB)]
        Cloudinary[(Cloudinary)]
        Gemini[Gemini AI]
        Perspective[Perspective API]
    end

    Client --> API
    API --> Services
    Services --> External
```

---

## 13. DEPLOYMENT DIAGRAM

```mermaid
flowchart LR
    subgraph Users[Users]
        Desktop[Desktop]
        Mobile[Mobile]
    end

    subgraph Vercel[Vercel]
        NextApp[Next.js App]
        Static[Static Assets]
    end

    subgraph Backend[Render]
        Express[Express API]
        Workers[Workers]
    end

    subgraph Data[Data Layer]
        MongoDB[(MongoDB Atlas)]
        Cloudinary[(Cloudinary CDN)]
    end

    subgraph AI[AI Services]
        Gemini[Google Gemini]
        Perspective[Perspective API]
    end

    Users --> Vercel
    Vercel --> Backend
    Backend --> Data
    Backend --> AI
    Users --> Cloudinary
```

---

## 14. DATA FLOW DIAGRAM - Level 0

```mermaid
flowchart LR
    User((User))
    Admin((Admin))
    External((APIs))
    
    System[ProConnect]
    
    User -->|Uploads, Actions| System
    System -->|Content, Notifications| User
    
    Admin -->|Moderation| System
    System -->|Reports| Admin
    
    System <-->|AI, Media| External
```

---

## 15. DATA FLOW DIAGRAM - Level 1

```mermaid
flowchart LR
    User((User))
    
    Auth[1.0 Auth]
    Content[2.0 Content]
    Social[3.0 Social]
    AI[4.0 AI]
    Feed[5.0 Feed]
    
    DB[(Database)]
    APIs((External))
    
    User --> Auth --> DB
    User --> Content --> DB
    User --> Social --> DB
    Content --> AI --> APIs
    Feed --> AI
    Feed --> User
```

---

## 16. ER DIAGRAM

```mermaid
erDiagram
    USER ||--o{ IMAGE : uploads
    USER ||--o{ REEL : creates
    USER ||--o{ COLLECTION : owns
    USER ||--o{ COMMENT : writes
    USER ||--o{ LIKE : gives
    USER ||--o{ FOLLOW : follows
    USER ||--o{ MESSAGE : sends
    USER ||--o{ NOTIFICATION : receives
    
    IMAGE ||--o{ COMMENT : has
    IMAGE ||--o{ LIKE : has
    IMAGE }o--|| COLLECTION : in
    
    CONVERSATION ||--o{ MESSAGE : contains

    USER {
        string username
        string email
        string password
        boolean isVerified
        boolean isPremium
    }

    IMAGE {
        string title
        string imageUrl
        string category
        array tags
        number likesCount
    }

    REEL {
        string caption
        string videoUrl
        number duration
    }

    COMMENT {
        string text
        number toxicityScore
    }
```

---

## Features Covered

| Category | Features |
|----------|----------|
| **Auth** | Email, Google OAuth, Email Verification |
| **Content** | Image Upload, Reels, Collections, Visibility |
| **AI** | Captioning, Tags, Chat, Moderation, Copyright |
| **Social** | Like, Comment, Follow, Favorites, Messaging |
| **Discovery** | Search, Trending, Feed, Profiles |
| **Analytics** | Dashboard, Stats, Growth Agent |
| **Admin** | User Management, Reports, Moderation |
