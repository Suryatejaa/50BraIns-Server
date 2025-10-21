I'll create comprehensive API documentation for both Influencer and Crew roles. Let me search through the codebase to find all relevant routes and endpoints for these roles. I'll create comprehensive API documentation for both Influencer and Crew roles. Let me search for all relevant APIs across the entire codebase. I'll create comprehensive API documentation for both Influencer and Crew roles separately. Let me search for all relevant APIs across the entire codebase. I'll create comprehensive API documentation for both Influencer and Crew roles separately. Let me search for all relevant APIs across the entire codebase. I'll create comprehensive API documentation for both **Influencer** and **Crew** roles separately, covering all APIs they can access across the entire 50BraIns ecosystem.

# 🌟 **INFLUENCER API DOCUMENTATION - 50BraIns Platform**

Complete API guide for Influencers across all microservices.

## 📡 **API GATEWAY (Port 3000)**
Base URL: `http://localhost:3000`

### **AUTHENTICATION**
All protected endpoints require JWT authentication:
```typescript
Headers: {
  'Authorization': 'Bearer <ACCESS_TOKEN>'
}
```

---

## 🔐 **1. AUTH SERVICE APIs**

### **POST /api/auth/register** (Public)
Influencer registration with content creator fields

```json
// Request Body
{
  "firstName": "Jane",
  "lastName": "Creator",
  "email": "jane@influencer.com",
  "password": "CreatorPass123!",
  "roles": "INFLUENCER",
  "phone": "9876543210",
  "location": "Mumbai, India",
  "bio": "Fashion and lifestyle content creator passionate about sustainable living",
  "website": "https://janecreator.com",
  "instagramHandle": "janecreator",
  "youtubeHandle": "JaneCreatorVlogs",
  "twitterHandle": "jane_creator",
  "linkedinHandle": "jane-creator",
  "contentCategories": ["fashion", "lifestyle", "sustainability", "travel"],
  "primaryNiche": "sustainable fashion",
  "primaryPlatform": "instagram",
  "estimatedFollowers": 25000
}

// Response
{
  "success": true,
  "message": "Influencer registered successfully",
  "data": {
    "userId": "influencer_456",
    "email": "jane@influencer.com",
    "roles": "INFLUENCER",
    "firstName": "Jane",
    "lastName": "Creator",
    "primaryNiche": "sustainable fashion",
    "isVerified": false,
    "requiresEmailVerification": true
  }
}
```

### **POST /api/auth/login** (Public)
Influencer authentication

```json
// Request Body
{
  "email": "jane@influencer.com",
  "password": "CreatorPass123!"
}

// Response
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "influencer_456",
      "email": "jane@influencer.com",
      "roles": "INFLUENCER",
      "firstName": "Jane",
      "lastName": "Creator",
      "primaryNiche": "sustainable fashion",
      "isVerified": false
    }
  }
}
```

### **GET /api/auth/profile** (Protected)
Get influencer profile

```json
// Response
{
  "success": true,
  "data": {
    "id": "influencer_456",
    "email": "jane@influencer.com",
    "roles": "INFLUENCER",
    "firstName": "Jane",
    "lastName": "Creator",
    "primaryNiche": "sustainable fashion",
    "contentCategories": ["fashion", "lifestyle", "sustainability"],
    "estimatedFollowers": 25000,
    "isVerified": false,
    "createdAt": "2025-01-01T10:00:00Z"
  }
}
```

---

## 👤 **2. USER SERVICE APIs**

### **GET /api/user/profile** (Protected)
Get influencer's own profile

```json
// Response
{
  "success": true,
  "data": {
    "id": "influencer_456",
    "email": "jane@influencer.com",
    "roles": "INFLUENCER",
    "firstName": "Jane",
    "lastName": "Creator",
    "bio": "Fashion and lifestyle content creator",
    "location": "Mumbai, India",
    "website": "https://janecreator.com",
    "profilePicture": "https://cdn.50brains.com/profiles/jane_456.jpg",
    "coverImage": "https://cdn.50brains.com/covers/jane_456.jpg",
    "instagramHandle": "janecreator",
    "youtubeHandle": "JaneCreatorVlogs",
    "contentCategories": ["fashion", "lifestyle", "sustainability"],
    "primaryNiche": "sustainable fashion",
    "primaryPlatform": "instagram",
    "estimatedFollowers": 25000,
    "profileViews": 1250,
    "isVerified": false,
    "analytics": {
      "profileScore": 88,
      "completionPercentage": 95
    }
  }
}
```

### **PUT /api/user/profile** (Protected)
Update influencer profile

```json
// Request Body
{
  "bio": "Updated bio: Sustainable fashion advocate and content creator",
  "website": "https://newsustainablefashion.com",
  "location": "Delhi, India",
  "phone": "9876543211"
}

// Response
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "influencer_456",
    "bio": "Updated bio: Sustainable fashion advocate and content creator",
    "website": "https://newsustainablefashion.com",
    "location": "Delhi, India",
    "updatedAt": "2025-01-01T12:00:00Z"
  }
}
```

### **PUT /api/user/social** (Protected)
Update social media handles

```json
// Request Body
{
  "instagramHandle": "jane_sustainable",
  "youtubeHandle": "SustainableJane",
  "twitterHandle": "jane_eco",
  "linkedinHandle": "jane-sustainable-creator"
}

// Response
{
  "success": true,
  "message": "Social handles updated successfully",
  "data": {
    "instagramHandle": "jane_sustainable",
    "youtubeHandle": "SustainableJane",
    "twitterHandle": "jane_eco",
    "linkedinHandle": "jane-sustainable-creator",
    "updatedAt": "2025-01-01T12:00:00Z"
  }
}
```

### **PUT /api/user/roles-info** (Protected)
Update influencer-specific information

```json
// Request Body
{
  "contentCategories": ["fashion", "lifestyle", "sustainability", "beauty"],
  "primaryNiche": "sustainable beauty",
  "primaryPlatform": "youtube",
  "estimatedFollowers": 30000
}

// Response
{
  "success": true,
  "message": "Influencer information updated successfully",
  "data": {
    "contentCategories": ["fashion", "lifestyle", "sustainability", "beauty"],
    "primaryNiche": "sustainable beauty",
    "primaryPlatform": "youtube",
    "estimatedFollowers": 30000,
    "updatedAt": "2025-01-01T12:00:00Z"
  }
}
```

### **GET /api/search/brands** (Protected)
Search for brands to collaborate with

```json
// Query Parameters: ?industry=Fashion&budget=high&verified=true&limit=20

// Response
{
  "success": true,
  "data": {
    "brands": [
      {
        "id": "brand_789",
        "firstName": "Sarah",
        "lastName": "Brand",
        "companyName": "EcoFashion Co",
        "industry": "Fashion",
        "roles": "BRAND",
        "isVerified": true,
        "location": "Mumbai",
        "targetAudience": ["Young Adults", "Eco-conscious"],
        "marketingBudget": "50k-100k",
        "analytics": {
          "profileScore": 92,
          "activeGigs": 5,
          "completedGigs": 25
        }
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

### **GET /api/analytics/trending-influencers** (Public)
Get trending influencers (for inspiration/networking)

```json
// Response
{
  "success": true,
  "data": {
    "influencers": [
      {
        "id": "influencer_789",
        "firstName": "Top",
        "lastName": "Creator",
        "primaryNiche": "fashion",
        "primaryPlatform": "instagram",
        "estimatedFollowers": 100000,
        "profileViews": 15000,
        "trendingScore": 95,
        "isVerified": true
      }
    ],
    "timeframe": "last_7_days"
  }
}
```

---

## 💼 **3. GIG SERVICE APIs**

### **GET /api/gig** (Public)
Browse available gigs

```json
// Query Parameters: ?category=fashion&budget_min=5000&status=ACTIVE&page=1&limit=20

// Response
{
  "success": true,
  "data": {
    "gigs": [
      {
        "id": "gig_123",
        "title": "Sustainable Fashion Campaign",
        "description": "Looking for eco-conscious fashion influencers",
        "category": "Fashion",
        "budget": 15000,
        "budgetType": "FIXED",
        "status": "ACTIVE",
        "deadline": "2025-02-15T00:00:00Z",
        "applicationDeadline": "2025-01-30T00:00:00Z",
        "requirements": [
          "Fashion-focused content",
          "Minimum 20K followers",
          "Sustainability focus preferred"
        ],
        "deliverables": [
          "3 Instagram posts",
          "5 Instagram stories",
          "1 YouTube video"
        ],
        "preferredPlatforms": ["Instagram", "YouTube"],
        "targetAudience": ["Young Adults", "Fashion Enthusiasts"],
        "postedBy": {
          "id": "brand_789",
          "companyName": "EcoFashion Co",
          "isVerified": true
        },
        "applicationsCount": 12,
        "viewsCount": 256,
        "createdAt": "2025-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

### **GET /api/gig/:gigId** (Public)
Get detailed gig information

```json
// Response
{
  "success": true,
  "data": {
    "id": "gig_123",
    "title": "Sustainable Fashion Campaign",
    "description": "We're looking for passionate fashion influencers who care about sustainability...",
    "category": "Fashion",
    "subcategory": "Sustainable Fashion",
    "budget": 15000,
    "budgetType": "FIXED",
    "status": "ACTIVE",
    "deadline": "2025-02-15T00:00:00Z",
    "applicationDeadline": "2025-01-30T00:00:00Z",
    "maxApplications": 50,
    "requirements": [
      "Fashion-focused content creator",
      "Minimum 20K followers on Instagram",
      "Previous fashion/lifestyle campaigns",
      "Sustainability focus preferred"
    ],
    "deliverables": [
      "3 high-quality Instagram posts",
      "5 Instagram stories",
      "1 YouTube video (3-5 minutes)",
      "Story highlights"
    ],
    "preferredPlatforms": ["Instagram", "YouTube"],
    "targetAudience": ["Young Adults", "Fashion Enthusiasts"],
    "campaignObjectives": ["Brand Awareness", "Product Launch"],
    "brandGuidelines": {
      "toneOfVoice": "Authentic, inspiring, eco-conscious",
      "hashtags": ["#EcoFashion", "#SustainableStyle"],
      "mentions": "@ecofashionco"
    },
    "postedBy": {
      "id": "brand_789",
      "firstName": "Sarah",
      "lastName": "Brand",
      "companyName": "EcoFashion Co",
      "industry": "Fashion",
      "isVerified": true,
      "profilePicture": "https://cdn.50brains.com/profiles/brand_789.jpg"
    },
    "applicationsCount": 12,
    "viewsCount": 256,
    "isApplicationOpen": true,
    "hasApplied": false,
    "createdAt": "2025-01-01T10:00:00Z"
  }
}
```

### **POST /api/gig/:gigId/apply** (Protected)
Apply to a gig

```json
// Request Body
{
  "proposal": "I'm excited about this sustainable fashion campaign! As a content creator passionate about eco-conscious living, I believe I'm a perfect fit. My audience of 25K followers actively engages with sustainability content, and my recent sustainable fashion posts averaged 2.5K likes with 150+ comments. I can deliver authentic, inspiring content that aligns with your brand values.",
  "quotedPrice": 12000,
  "portfolioLinks": [
    "https://instagram.com/p/sustainable-fashion-post1",
    "https://youtube.com/watch?v=eco-fashion-haul",
    "https://instagram.com/p/thrift-flip-tutorial"
  ],
  "estimatedDelivery": "7 days",
  "additionalNotes": "I have existing sustainable fashion pieces and can showcase your products alongside my personal eco-friendly wardrobe.",
  "contentStrategy": "Mix of styling videos, educational posts about sustainable fashion, and authentic product integration"
}

// Response
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "applicationId": "app_789",
    "gigId": "gig_123",
    "status": "PENDING",
    "quotedPrice": 12000,
    "submittedAt": "2025-01-05T14:30:00Z",
    "estimatedResponse": "3-5 business days"
  }
}
```

### **GET /api/my/applications** (Protected)
Get influencer's gig applications

```json
// Query Parameters: ?status=PENDING&page=1&limit=10

// Response
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "app_789",
        "status": "PENDING",
        "quotedPrice": 12000,
        "submittedAt": "2025-01-05T14:30:00Z",
        "gig": {
          "id": "gig_123",
          "title": "Sustainable Fashion Campaign",
          "budget": 15000,
          "deadline": "2025-02-15T00:00:00Z",
          "status": "ACTIVE",
          "brand": {
            "companyName": "EcoFashion Co",
            "isVerified": true
          }
        }
      },
      {
        "id": "app_790",
        "status": "ACCEPTED",
        "quotedPrice": 8000,
        "finalPrice": 8000,
        "submittedAt": "2024-12-20T10:00:00Z",
        "acceptedAt": "2024-12-22T15:30:00Z",
        "gig": {
          "id": "gig_124",
          "title": "Beauty Product Launch",
          "budget": 10000,
          "deadline": "2025-01-31T00:00:00Z",
          "status": "IN_PROGRESS",
          "brand": {
            "companyName": "Natural Beauty Co",
            "isVerified": true
          }
        }
      }
    ],
    "pagination": {
      "total": 8,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    },
    "stats": {
      "totalApplications": 8,
      "pendingApplications": 3,
      "acceptedApplications": 2,
      "rejectedApplications": 3,
      "successRate": 25
    }
  }
}
```

### **POST /api/gig/:gigId/submit** (Protected)
Submit work for accepted gig

```json
// Request Body
{
  "deliverables": [
    {
      "type": "Instagram Post",
      "url": "https://instagram.com/p/campaign-post-1",
      "description": "Main campaign post featuring the sustainable dress collection",
      "completedAt": "2025-01-25T10:00:00Z"
    },
    {
      "type": "Instagram Stories",
      "urls": [
        "https://instagram.com/stories/highlights/behind-scenes",
        "https://instagram.com/stories/highlights/styling-tips"
      ],
      "description": "Behind-the-scenes content and styling tips",
      "completedAt": "2025-01-25T12:00:00Z"
    },
    {
      "type": "YouTube Video",
      "url": "https://youtube.com/watch?v=sustainable-fashion-haul",
      "description": "10-minute sustainable fashion haul and styling video",
      "completedAt": "2025-01-26T16:00:00Z"
    }
  ],
  "campaignNotes": "The campaign performed exceptionally well! The main post received 3.2K likes and 180 comments with very positive feedback about the brand. The YouTube video has 15K views so far with great engagement.",
  "metrics": {
    "totalReach": 45000,
    "totalEngagement": 3800,
    "avgEngagementRate": 8.4,
    "comments": 180,
    "shares": 25,
    "saves": 340
  },
  "additionalFiles": [
    "https://drive.google.com/file/d/analytics-report",
    "https://drive.google.com/file/d/raw-footage"
  ]
}

// Response
{
  "success": true,
  "message": "Work submission completed successfully",
  "data": {
    "submissionId": "sub_456",
    "gigId": "gig_123",
    "status": "PENDING_REVIEW",
    "submittedAt": "2025-01-26T18:00:00Z",
    "reviewDeadline": "2025-01-31T18:00:00Z",
    "totalDeliverables": 3,
    "estimatedPayout": 12000
  }
}
```

---

## 💳 **4. CREDIT SERVICE APIs**

### **GET /api/credit/wallet** (Protected)
Get influencer's credit wallet

```json
// Response
{
  "success": true,
  "data": {
    "walletId": "wallet_influencer_456",
    "balance": 1500,
    "totalEarned": 35000,
    "totalSpent": 500,
    "currency": "INR",
    "lastUpdated": "2025-01-01T12:00:00Z",
    "transactions": {
      "recent": [
        {
          "id": "txn_789",
          "type": "EARNED",
          "amount": 12000,
          "description": "Payment for Beauty Campaign",
          "date": "2025-01-01T10:00:00Z"
        }
      ]
    }
  }
}
```

### **POST /api/credit/boost/profile** (Protected)
Boost influencer profile visibility

```json
// Request Body
{
  "duration": 72
}

// Response
{
  "success": true,
  "message": "Profile boosted successfully",
  "data": {
    "boostId": "boost_inf_456",
    "creditsSpent": 100,
    "remainingBalance": 1400,
    "boostUntil": "2025-01-04T12:00:00Z",
    "expectedBenefits": {
      "increaseInProfileViews": "3x",
      "higherSearchRanking": true,
      "featuredInDiscovery": true
    }
  }
}
```

### **GET /api/credit/transactions** (Protected)
Get transaction history

```json
// Response
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_789",
        "type": "EARNED",
        "amount": 12000,
        "description": "Payment for Beauty Campaign - Gig #gig_124",
        "status": "COMPLETED",
        "date": "2025-01-01T10:00:00Z",
        "gigId": "gig_124"
      },
      {
        "id": "txn_790",
        "type": "SPENT",
        "amount": 100,
        "description": "Profile boost - 72 hours",
        "status": "COMPLETED",
        "date": "2025-01-01T12:00:00Z"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 10
    }
  }
}
```

---

## 🏆 **5. REPUTATION SERVICE APIs**

### **GET /api/reputation/:userId** (Protected)
Get influencer reputation score

```json
// Response
{
  "success": true,
  "data": {
    "userId": "influencer_456",
    "overallScore": 890,
    "tier": "GOLD",
    "rank": 125,
    "scores": {
      "contentQuality": 92,
      "deliveryTime": 88,
      "communication": 94,
      "professionalism": 89,
      "engagement": 91
    },
    "badges": [
      {
        "id": "reliable_creator",
        "name": "Reliable Creator",
        "description": "Always delivers on time",
        "earnedAt": "2024-12-15T10:00:00Z"
      },
      {
        "id": "engagement_expert",
        "name": "Engagement Expert",
        "description": "Consistently high engagement rates",
        "earnedAt": "2024-11-20T10:00:00Z"
      }
    ],
    "recentActivity": [
      {
        "type": "GIG_COMPLETED",
        "score": +25,
        "description": "Successfully completed beauty campaign",
        "date": "2025-01-01T10:00:00Z"
      },
      {
        "type": "POSITIVE_REVIEW",
        "score": +15,
        "description": "5-star review from EcoFashion Co",
        "date": "2024-12-28T14:30:00Z"
      }
    ],
    "stats": {
      "totalGigs": 12,
      "completedGigs": 11,
      "avgRating": 4.8,
      "totalEarnings": 85000,
      "repeatClients": 4
    }
  }
}
```

### **GET /api/reputation/leaderboard/influencers** (Public)
Get influencer leaderboard

```json
// Query Parameters: ?category=Fashion&location=Mumbai&limit=20

// Response
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "userId": "influencer_top1",
        "firstName": "Top",
        "lastName": "Influencer",
        "primaryNiche": "Fashion",
        "overallScore": 980,
        "tier": "PLATINUM",
        "completedGigs": 45,
        "avgRating": 4.9
      },
      {
        "rank": 125,
        "userId": "influencer_456",
        "firstName": "Jane",
        "lastName": "Creator",
        "primaryNiche": "sustainable fashion",
        "overallScore": 890,
        "tier": "GOLD",
        "completedGigs": 11,
        "avgRating": 4.8
      }
    ],
    "userRank": {
      "currentUser": "influencer_456",
      "rank": 125,
      "score": 890,
      "category": "Fashion"
    }
  }
}
```

---

## 📊 **6. SOCIAL MEDIA SERVICE APIs**

### **POST /api/social-media/link** (Protected)
Connect social media accounts

```json
// Request Body
{
  "platform": "INSTAGRAM",
  "accountHandle": "jane_sustainable",
  "accessToken": "instagram_access_token_here",
  "accountId": "17841405309211844"
}

// Response
{
  "success": true,
  "message": "Instagram account connected successfully",
  "data": {
    "connectionId": "conn_789",
    "platform": "INSTAGRAM",
    "accountHandle": "jane_sustainable",
    "isVerified": true,
    "followerCount": 25000,
    "connectedAt": "2025-01-01T10:00:00Z"
  }
}
```

### **GET /api/social-media/analytics/:userId** (Protected)
Get social media analytics

```json
// Response
{
  "success": true,
  "data": {
    "userId": "influencer_456",
    "totalAccounts": 3,
    "totalFollowers": 47000,
    "totalFollowing": 1250,
    "totalPosts": 445,
    "averageEngagement": 6.8,
    "reachScore": 85,
    "influencerTier": "Micro Influencer",
    "platforms": [
      {
        "platform": "INSTAGRAM",
        "accountHandle": "jane_sustainable",
        "followers": 25000,
        "following": 800,
        "posts": 320,
        "engagement": 7.2,
        "isVerified": false,
        "connectedAt": "2025-01-01T10:00:00Z",
        "lastSyncAt": "2025-01-01T12:00:00Z"
      },
      {
        "platform": "YOUTUBE",
        "accountHandle": "SustainableJane",
        "followers": 15000,
        "following": 200,
        "posts": 85,
        "engagement": 8.5,
        "isVerified": false,
        "connectedAt": "2024-12-15T10:00:00Z",
        "lastSyncAt": "2025-01-01T12:00:00Z"
      },
      {
        "platform": "TWITTER",
        "accountHandle": "jane_eco",
        "followers": 7000,
        "following": 250,
        "posts": 40,
        "engagement": 4.2,
        "isVerified": false,
        "connectedAt": "2024-11-20T10:00:00Z",
        "lastSyncAt": "2025-01-01T12:00:00Z"
      }
    ],
    "insights": {
      "topPerformingPlatform": "YOUTUBE",
      "growthRate": {
        "daily": 2.3,
        "weekly": 16.1,
        "monthly": 68.5
      },
      "audienceDemographics": {
        "ageGroups": {
          "18-24": 35,
          "25-34": 45,
          "35-44": 20
        },
        "gender": {
          "female": 78,
          "male": 22
        },
        "topLocations": ["Mumbai", "Delhi", "Bangalore"]
      }
    }
  }
}
```

### **PUT /api/social-media/sync/:platform/:userId** (Protected)
Manually sync social media data

```json
// Response
{
  "success": true,
  "message": "Instagram data synced successfully",
  "data": {
    "platform": "INSTAGRAM",
    "syncedAt": "2025-01-01T14:00:00Z",
    "changes": {
      "followerCount": {
        "previous": 24890,
        "current": 25000,
        "change": +110
      },
      "posts": {
        "previous": 318,
        "current": 320,
        "change": +2
      },
      "engagement": {
        "previous": 7.0,
        "current": 7.2,
        "change": +0.2
      }
    }
  }
}
```

---

## 🏗️ **7. WORK HISTORY SERVICE APIs**

### **GET /api/work-history/user/:userId/summary** (Protected)
Get influencer work summary

```json
// Response
{
  "success": true,
  "data": {
    "workSummary": {
      "totalProjects": 12,
      "completedProjects": 11,
      "ongoingProjects": 1,
      "totalEarnings": 85000,
      "averageRating": 4.8,
      "totalRatings": 11,
      "onTimeDeliveryRate": 91,
      "projectsThisMonth": 2,
      "projectsThisYear": 12,
      "repeatClientRate": 36
    },
    "collaborationHistory": [
      {
        "id": "collab_789",
        "gigId": "gig_124",
        "brandId": "brand_789",
        "projectTitle": "Beauty Product Launch Campaign",
        "status": "COMPLETED",
        "budget": 8000,
        "startDate": "2024-12-20T00:00:00Z",
        "endDate": "2025-01-01T00:00:00Z",
        "rating": 5,
        "feedback": "Exceptional work! Jane delivered high-quality content that exceeded our expectations.",
        "deliverables": [
          {
            "type": "Instagram Posts",
            "count": 3,
            "performance": {
              "avgLikes": 2800,
              "avgComments": 145,
              "avgShares": 25
            }
          }
        ],
        "brand": {
          "companyName": "Natural Beauty Co",
          "industry": "Beauty"
        }
      }
    ],
    "topCategories": [
      {
        "category": "Fashion",
        "projectCount": 6,
        "earnings": 45000
      },
      {
        "category": "Beauty",
        "projectCount": 4,
        "earnings": 30000
      },
      {
        "category": "Lifestyle",
        "projectCount": 2,
        "earnings": 10000
      }
    ]
  }
}
```

### **GET /api/portfolio/user/:userId** (Public)
Get influencer portfolio

```json
// Response
{
  "success": true,
  "data": {
    "portfolioItems": [
      {
        "id": "portfolio_456",
        "title": "Sustainable Fashion Campaign - EcoFashion Co",
        "description": "Multi-platform campaign promoting sustainable fashion choices",
        "category": "Fashion",
        "tags": ["sustainability", "fashion", "lifestyle"],
        "mediaUrls": [
          "https://instagram.com/p/campaign-post-1",
          "https://youtube.com/watch?v=sustainable-fashion-haul"
        ],
        "results": {
          "totalReach": 45000,
          "totalEngagement": 3800,
          "engagementRate": 8.4,
          "brandMentions": 25
        },
        "clientTestimonial": "Jane's authentic approach to sustainable fashion perfectly aligned with our brand values.",
        "createdAt": "2025-01-26T18:00:00Z",
        "isPublic": true,
        "isFeatured": true
      }
    ],
    "showcase": {
      "featuredWork": [
        {
          "title": "Best Fashion Campaign 2024",
          "mediaUrl": "https://instagram.com/p/best-campaign",
          "performance": {
            "reach": 50000,
            "engagement": 9.2
          }
        }
      ],
      "clientLogos": [
        "https://cdn.50brains.com/brands/ecofashion-logo.png",
        "https://cdn.50brains.com/brands/naturalbeauty-logo.png"
      ]
    }
  }
}
```

### **GET /api/achievements/user/:userId** (Public)
Get influencer achievements

```json
// Response
{
  "success": true,
  "data": {
    "achievements": [
      {
        "id": "achieve_456",
        "title": "Fashion Content Expert",
        "description": "Completed 5+ successful fashion campaigns",
        "badge": "https://cdn.50brains.com/badges/fashion-expert.png",
        "earnedAt": "2024-12-01T10:00:00Z",
        "category": "EXPERTISE",
        "rarity": "RARE"
      },
      {
        "id": "achieve_457",
        "title": "Engagement Master",
        "description": "Achieved 8%+ engagement rate across 10 campaigns",
        "badge": "https://cdn.50brains.com/badges/engagement-master.png",
        "earnedAt": "2024-11-15T10:00:00Z",
        "category": "PERFORMANCE",
        "rarity": "EPIC"
      }
    ],
    "stats": {
      "totalAchievements": 8,
      "rareAchievements": 3,
      "epicAchievements": 2,
      "legendaryAchievements": 0
    }
  }
}
```

---

## 🏰 **8. CLAN SERVICE APIs**

### **GET /api/clan/search** (Public)
Search for clans to join

```json
// Query Parameters: ?category=Content Creation&skills=video editing&location=Mumbai&verified=true

// Response
{
  "success": true,
  "data": {
    "clans": [
      {
        "id": "clan_789",
        "name": "Mumbai Content Creators",
        "description": "Elite group of content creators and influencers in Mumbai",
        "primaryCategory": "Content Creation",
        "memberCount": 15,
        "skills": ["content creation", "photography", "video editing", "social media"],
        "location": "Mumbai",
        "isVerified": true,
        "isRecruiting": true,
        "rating": 4.7,
        "completedProjects": 28,
        "requirements": {
          "minFollowers": 10000,
          "minRating": 4.0,
          "experience": "intermediate"
        },
        "benefits": [
          "Collaborative projects",
          "Skill sharing",
          "Higher-paying gigs",
          "Shared equipment access"
        ]
      }
    ]
  }
}
```

### **GET /api/clan/:clanId** (Public)
Get detailed clan information

```json
// Response
{
  "success": true,
  "data": {
    "id": "clan_789",
    "name": "Mumbai Content Creators",
    "description": "Elite group of content creators and influencers specializing in lifestyle and fashion content",
    "primaryCategory": "Content Creation",
    "skills": ["content creation", "photography", "video editing", "social media"],
    "memberCount": 15,
    "isVerified": true,
    "isRecruiting": true,
    "location": "Mumbai",
    "rating": 4.7,
    "foundedAt": "2024-03-15T10:00:00Z",
    "members": [
      {
        "id": "influencer_456",
        "firstName": "Jane",
        "lastName": "Creator",
        "role": "MEMBER",
        "specialties": ["sustainable fashion", "lifestyle"],
        "joinedAt": "2024-06-20T10:00:00Z"
      }
    ],
    "portfolio": [
      {
        "title": "Fashion Week Campaign",
        "description": "Multi-creator campaign for Fashion Week Mumbai",
        "results": {
          "totalReach": 500000,
          "totalEngagement": 45000,
          "participatingCreators": 8
        }
      }
    ],
    "stats": {
      "totalProjects": 28,
      "successRate": 96,
      "avgProjectValue": 25000,
      "clientSatisfaction": 4.8
    },
    "requirements": {
      "minFollowers": 10000,
      "minRating": 4.0,
      "experienceLevel": "intermediate",
      "portfolio": "required"
    }
  }
}
```

### **POST /api/clan/:clanId/join** (Protected)
Request to join a clan

```json
// Request Body
{
  "message": "Hi! I'm a sustainable fashion content creator with 25K followers and 4.8 rating. I'd love to collaborate with your team on fashion and lifestyle campaigns. My content aligns well with your values and I bring expertise in sustainability messaging.",
  "portfolioUrls": [
    "https://instagram.com/jane_sustainable",
    "https://youtube.com/channel/SustainableJane"
  ],
  "skills": ["content creation", "sustainable fashion", "lifestyle photography"],
  "availability": "part-time",
  "expectedContribution": "2-3 projects per month"
}

// Response
{
  "success": true,
  "message": "Join request submitted successfully",
  "data": {
    "requestId": "req_456",
    "clanId": "clan_789",
    "status": "PENDING",
    "submittedAt": "2025-01-01T10:00:00Z",
    "estimatedResponse": "3-5 business days"
  }
}
```

---

## 🔔 **9. NOTIFICATION SERVICE APIs**

### **GET /api/notifications/:userId** (Protected)
Get influencer notifications

```json
// Response
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_456",
        "type": "APPLICATION_ACCEPTED",
        "title": "Application Accepted!",
        "message": "Congratulations! Your application for 'Sustainable Fashion Campaign' has been accepted.",
        "data": {
          "gigId": "gig_123",
          "applicationId": "app_789",
          "brandName": "EcoFashion Co",
          "finalBudget": 12000
        },
        "isRead": false,
        "priority": "HIGH",
        "createdAt": "2025-01-06T10:00:00Z"
      },
      {
        "id": "notif_457",
        "type": "NEW_GIG_MATCH",
        "title": "New Gig Match",
        "message": "A new fashion gig matches your profile and interests",
        "data": {
          "gigId": "gig_125",
          "gigTitle": "Summer Fashion Collection",
          "brandName": "Fashion Forward",
          "budget": 18000
        },
        "isRead": false,
        "priority": "MEDIUM",
        "createdAt": "2025-01-05T14:30:00Z"
      },
      {
        "id": "notif_458",
        "type": "PAYMENT_RECEIVED",
        "title": "Payment Received",
        "message": "Payment of ₹8,000 received for Beauty Campaign",
        "data": {
          "amount": 8000,
          "gigId": "gig_124",
          "transactionId": "txn_789"
        },
        "isRead": true,
        "priority": "MEDIUM",
        "createdAt": "2025-01-01T10:00:00Z"
      }
    ],
    "unreadCount": 2,
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 20
    }
  }
}
```

### **GET /api/notifications/preferences/:userId** (Protected)
Get notification preferences

```json
// Response
{
  "success": true,
  "data": {
    "preferences": {
      "email": {
        "gigMatches": true,
        "applicationUpdates": true,
        "paymentNotifications": true,
        "weeklyDigest": true,
        "promotionalEmails": false
      },
      "push": {
        "gigMatches": true,
        "applicationUpdates": true,
        "paymentNotifications": true,
        "chatMessages": true,
        "systemAlerts": true
      },
      "inApp": {
        "all": true
      }
    },
    "frequency": {
      "immediate": ["applicationUpdates", "paymentNotifications"],
      "daily": ["gigMatches"],
      "weekly": ["weeklyDigest"]
    }
  }
}
```

---

## 📊 **10. ANALYTICS SERVICE APIs**

### **GET /api/analytics/user-insights/:userId** (Protected)
Get detailed influencer analytics

```json
// Response
{
  "success": true,
  "data": {
    "overview": {
      "profileViews": 1250,
      "searchAppearances": 450,
      "gigViews": 2800,
      "applicationRate": 18,
      "successRate": 25
    },
    "performance": {
      "avgEngagementRate": 7.2,
      "avgDeliveryTime": 5.2,
      "clientSatisfactionScore": 4.8,
      "repeatClientRate": 36
    },
    "earnings": {
      "totalEarnings": 85000,
      "avgGigValue": 7700,
      "monthlyEarnings": 12000,
      "projectedYearlyEarnings": 144000
    },
    "growth": {
      "followerGrowth": {
        "weekly": 2.3,
        "monthly": 8.7,
        "quarterly": 24.5
      },
      "engagementGrowth": {
        "weekly": 0.5,
        "monthly": 1.8,
        "quarterly": 5.2
      }
    },
    "insights": [
      "Your engagement rate is 35% higher than similar influencers",
      "Fashion content performs 2.1x better than other categories",
      "Sunday posts get 45% more engagement",
      "Video content receives 3x more engagement than photos"
    ],
    "recommendations": [
      "Consider increasing video content production",
      "Fashion brands in Mumbai are actively seeking creators like you",
      "Your sustainability focus is trending - leverage this niche"
    ]
  }
}
```

### **GET /api/analytics/dashboard** (Protected)
Get influencer dashboard analytics

```json
// Response
{
  "success": true,
  "data": {
    "summary": {
      "totalEarnings": 85000,
      "activeGigs": 1,
      "pendingApplications": 3,
      "profileViews": 1250,
      "newFollowers": 110
    },
    "recentActivity": [
      {
        "type": "APPLICATION_ACCEPTED",
        "description": "Application accepted for Sustainable Fashion Campaign",
        "date": "2025-01-06T10:00:00Z"
      },
      {
        "type": "PAYMENT_RECEIVED",
        "description": "Payment received for Beauty Campaign - ₹8,000",
        "date": "2025-01-01T10:00:00Z"
      }
    ],
    "upcomingDeadlines": [
      {
        "gigId": "gig_123",
        "title": "Sustainable Fashion Campaign",
        "deadline": "2025-02-15T00:00:00Z",
        "daysLeft": 20,
        "status": "IN_PROGRESS"
      }
    ],
    "performanceMetrics": {
      "avgRating": 4.8,
      "deliverySuccess": 91,
      "responseTime": "2.5 hours"
    }
  }
}
```

---

## 📋 **COMMON ROUTES BETWEEN ALL ROLES**

### **Health Check (Public)**
```json
// GET /api/health
{
  "success": true,
  "service": "API Gateway",
  "timestamp": "2025-01-01T10:00:00Z",
  "uptime": 86400,
  "services": {
    "auth": "healthy",
    "user": "healthy",
    "gig": "healthy",
    "credit": "healthy"
  }
}
```

### **File Upload (Protected)**
```json
// POST /api/upload
// Multipart form-data with file
{
  "success": true,
  "data": {
    "fileId": "file_456",
    "url": "https://cdn.50brains.com/uploads/portfolio_456.jpg",
    "filename": "campaign-photo.jpg",
    "size": 2457600,
    "type": "image/jpeg",
    "uploadedAt": "2025-01-01T10:00:00Z"
  }
}
```

---

## 🔐 **AUTHENTICATION & AUTHORIZATION**

### **Influencer Route Protection**
- All `/api/my/*` routes require Influencer authentication
- Gig application endpoints require Influencer role
- Portfolio and work submission endpoints require authentication
- Credit earning endpoints require valid influencer account

### **Public Influencer Routes**
- Influencer search and discovery
- Public influencer profiles
- Trending influencer endpoints
- Public portfolio viewing

---

# 🔧 **CREW API DOCUMENTATION - 50BraIns Platform**

Complete API guide for Crew members across all microservices.

## 📡 **API GATEWAY (Port 3000)**
Base URL: `http://localhost:3000`

### **AUTHENTICATION**
All protected endpoints require JWT authentication:
```typescript
Headers: {
  'Authorization': 'Bearer <ACCESS_TOKEN>'
}
```

---

## 🔐 **1. AUTH SERVICE APIs**

### **POST /api/auth/register** (Public)
Crew registration with technical skills and equipment

```json
// Request Body
{
  "firstName": "Alex",
  "lastName": "Rodriguez",
  "email": "alex@crewpro.com",
  "password": "CrewPass123!",
  "roles": "CREW",
  "phone": "9567890123",
  "location": "Goa, India",
  "bio": "Professional video editor and motion graphics designer with 5+ years experience in commercial and social media content",
  "website": "https://alexrodriguez.portfolio.com",
  "instagramHandle": "alex_edits",
  "youtubeHandle": "AlexEditingTutorials",
  "linkedinHandle": "alex-rodriguez-editor",
  "crewSkills": [
    "video editing",
    "motion graphics",
    "color grading",
    "sound design",
    "after effects",
    "premiere pro",
    "davinci resolve"
  ],
  "experienceLevel": "advanced",
  "equipmentOwned": [
    "Professional Camera Setup",
    "DJI Drone",
    "Professional Audio Equipment",
    "Lighting Kit",
    "High-end Editing Workstation"
  ],
  "portfolioUrl": "https://alexrodriguez.portfolio.com",
  "hourlyRate": 2500,
  "availability": "freelance",
  "workStyle": "hybrid",
  "specializations": [
    "music videos",
    "commercial ads",
    "social media content",
    "documentary editing"
  ]
}

// Response
{
  "success": true,
  "message": "Crew member registered successfully",
  "data": {
    "userId": "crew_789",
    "email": "alex@crewpro.com",
    "roles": "CREW",
    "firstName": "Alex",
    "lastName": "Rodriguez",
    "experienceLevel": "advanced",
    "hourlyRate": 2500,
    "isVerified": false,
    "requiresEmailVerification": true
  }
}
```

### **POST /api/auth/login** (Public)
Crew authentication

```json
// Request Body
{
  "email": "alex@crewpro.com",
  "password": "CrewPass123!"
}

// Response
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "crew_789",
      "email": "alex@crewpro.com",
      "roles": "CREW",
      "firstName": "Alex",
      "lastName": "Rodriguez",
      "experienceLevel": "advanced",
      "specializations": ["music videos", "commercial ads"],
      "isVerified": false
    }
  }
}
```

### **GET /api/auth/profile** (Protected)
Get crew profile

```json
// Response
{
  "success": true,
  "data": {
    "id": "crew_789",
    "email": "alex@crewpro.com",
    "roles": "CREW",
    "firstName": "Alex",
    "lastName": "Rodriguez",
    "experienceLevel": "advanced",
    "crewSkills": ["video editing", "motion graphics", "color grading"],
    "hourlyRate": 2500,
    "availability": "freelance",
    "isVerified": false,
    "createdAt": "2025-01-01T10:00:00Z"
  }
}
```

---

## 👤 **2. USER SERVICE APIs**

### **GET /api/user/profile** (Protected)
Get crew member's own profile

```json
// Response
{
  "success": true,
  "data": {
    "id": "crew_789",
    "email": "alex@crewpro.com",
    "roles": "CREW",
    "firstName": "Alex",
    "lastName": "Rodriguez",
    "bio": "Professional video editor and motion graphics designer",
    "location": "Goa, India",
    "website": "https://alexrodriguez.portfolio.com",
    "profilePicture": "https://cdn.50brains.com/profiles/alex_789.jpg",
    "coverImage": "https://cdn.50brains.com/covers/alex_789.jpg",
    "instagramHandle": "alex_edits",
    "youtubeHandle": "AlexEditingTutorials",
    "linkedinHandle": "alex-rodriguez-editor",
    "crewSkills": [
      "video editing",
      "motion graphics", 
      "color grading",
      "sound design",
      "after effects",
      "premiere pro"
    ],
    "experienceLevel": "advanced",
    "equipmentOwned": [
      "Professional Camera Setup",
      "DJI Drone",
      "Professional Audio Equipment",
      "Lighting Kit"
    ],
    "portfolioUrl": "https://alexrodriguez.portfolio.com",
    "hourlyRate": 2500,
    "availability": "freelance",
    "workStyle": "hybrid",
    "specializations": ["music videos", "commercial ads", "social media content"],
    "profileViews": 890,
    "isVerified": false,
    "analytics": {
      "profileScore": 92,
      "completionPercentage": 98
    }
  }
}
```

### **PUT /api/user/profile** (Protected)
Update crew profile

```json
// Request Body
{
  "bio": "Senior video editor and motion graphics designer specializing in high-end commercial content",
  "website": "https://alexrodriguez-pro.com",
  "location": "Mumbai, India",
  "phone": "9567890124"
}

// Response
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "crew_789",
    "bio": "Senior video editor and motion graphics designer specializing in high-end commercial content",
    "website": "https://alexrodriguez-pro.com",
    "location": "Mumbai, India",
    "updatedAt": "2025-01-01T12:00:00Z"
  }
}
```

### **PUT /api/user/roles-info** (Protected)
Update crew-specific information

```json
// Request Body
{
  "crewSkills": [
    "video editing",
    "motion graphics",
    "color grading",
    "sound design",
    "3D animation",
    "after effects",
    "premiere pro",
    "davinci resolve"
  ],
  "experienceLevel": "expert",
  "equipmentOwned": [
    "RED Digital Cinema Camera",
    "DJI Inspire 2 Drone",
    "Professional Audio Recording Setup",
    "Cinema-grade Lighting Kit",
    "High-end Editing Workstation"
  ],
  "hourlyRate": 3500,
  "availability": "full-time",
  "workStyle": "on-location",
  "specializations": [
    "music videos",
    "commercial ads",
    "documentary production",
    "event videography"
  ]
}

// Response
{
  "success": true,
  "message": "Crew information updated successfully",
  "data": {
    "crewSkills": [
      "video editing",
      "motion graphics",
      "color grading",
      "sound design",
      "3D animation"
    ],
    "experienceLevel": "expert",
    "hourlyRate": 3500,
    "availability": "full-time",
    "workStyle": "on-location",
    "updatedAt": "2025-01-01T12:00:00Z"
  }
}
```

### **GET /api/search/influencers** (Protected)
Search for influencers to collaborate with

```json
// Query Parameters: ?niche=Fashion&platform=instagram&location=Mumbai&followers_min=20000

// Response
{
  "success": true,
  "data": {
    "influencers": [
      {
        "id": "influencer_456",
        "firstName": "Jane",
        "lastName": "Creator",
        "primaryNiche": "sustainable fashion",
        "primaryPlatform": "instagram",
        "estimatedFollowers": 25000,
        "location": "Mumbai",
        "isVerified": false,
        "contentCategories": ["fashion", "lifestyle", "sustainability"],
        "engagementRate": 7.2,
        "analytics": {
          "profileScore": 88,
          "avgGigBudget": 12000,
          "completedGigs": 11
        }
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 20,
      "totalPages": 2
    }
  }
}
```

### **GET /api/search/brands** (Protected)
Search for brands hiring crew services

```json
// Query Parameters: ?industry=Entertainment&budget=high&location=Mumbai&verified=true

// Response
{
  "success": true,
  "data": {
    "brands": [
      {
        "id": "brand_789",
        "firstName": "Sarah",
        "lastName": "Producer",
        "companyName": "Mumbai Media House",
        "industry": "Entertainment",
        "roles": "BRAND",
        "isVerified": true,
        "location": "Mumbai",
        "targetAudience": ["Young Adults", "Entertainment Enthusiasts"],
        "marketingBudget": "500k-1M",
        "activeGigs": 8,
        "avgCrewBudget": 45000,
        "analytics": {
          "profileScore": 95,
          "completedProjects": 45,
          "crewSatisfactionRate": 4.9
        }
      }
    ],
    "pagination": {
      "total": 12,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

## 💼 **3. GIG SERVICE APIs**

### **GET /api/gig** (Public)
Browse gigs needing crew services

```json
// Query Parameters: ?roleRequired=video-editor&budget_min=15000&location=Mumbai&deadline_after=2025-02-01

// Response
{
  "success": true,
  "data": {
    "gigs": [
      {
        "id": "gig_456",
        "title": "Music Video Production - Post Production",
        "description": "Seeking experienced video editor for high-end music video post-production",
        "category": "Video Production",
        "subcategory": "Music Video",
        "roleRequired": "video-editor",
        "budget": 45000,
        "budgetType": "FIXED",
        "status": "ACTIVE",
        "deadline": "2025-02-20T00:00:00Z",
        "applicationDeadline": "2025-02-01T00:00:00Z",
        "requirements": [
          "5+ years video editing experience",
          "Proficiency in Premiere Pro and After Effects",
          "Music video editing portfolio",
          "Color grading experience"
        ],
        "deliverables": [
          "Final edited music video (4K)",
          "Social media cut versions",
          "Behind-the-scenes edit",
          "Raw footage organization"
        ],
        "techSpecs": {
          "software": ["Premiere Pro", "After Effects", "DaVinci Resolve"],
          "deliveryFormat": "4K ProRes",
          "audioSpecs": "48kHz/24-bit"
        },
        "workStyle": "remote",
        "postedBy": {
          "id": "brand_890",
          "companyName": "Rhythm Records",
          "isVerified": true,
          "industry": "Music"
        },
        "applicationsCount": 8,
        "viewsCount": 145,
        "createdAt": "2025-01-15T10:00:00Z"
      },
      {
        "id": "gig_457",
        "title": "Commercial Shoot - Camera Operator",
        "description": "Need skilled camera operator for luxury brand commercial",
        "category": "Photography",
        "subcategory": "Commercial",
        "roleRequired": "camera-operator",
        "budget": 25000,
        "budgetType": "DAILY",
        "status": "ACTIVE",
        "deadline": "2025-02-10T00:00:00Z",
        "applicationDeadline": "2025-01-28T00:00:00Z",
        "requirements": [
          "Professional camera operation experience",
          "Own RED/ARRI camera setup",
          "Commercial shooting portfolio",
          "Available for 3-day shoot"
        ],
        "deliverables": [
          "Professional camera operation",
          "Raw footage delivery",
          "On-set technical support"
        ],
        "workStyle": "on-location",
        "location": "Mumbai",
        "shootDates": ["2025-02-05", "2025-02-06", "2025-02-07"],
        "postedBy": {
          "id": "brand_891",
          "companyName": "Luxury Brands Co",
          "isVerified": true,
          "industry": "Fashion"
        },
        "applicationsCount": 5,
        "viewsCount": 89,
        "createdAt": "2025-01-18T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 35,
      "page": 1,
      "limit": 20,
      "totalPages": 2
    }
  }
}
```

### **GET /api/gig/:gigId** (Public)
Get detailed gig information

```json
// Response
{
  "success": true,
  "data": {
    "id": "gig_456",
    "title": "Music Video Production - Post Production",
    "description": "We're seeking an experienced video editor for a high-end music video post-production project. This is for an upcoming single release by a major artist, requiring cinematic quality editing with creative storytelling...",
    "category": "Video Production",
    "subcategory": "Music Video",
    "roleRequired": "video-editor",
    "budget": 45000,
    "budgetType": "FIXED",
    "status": "ACTIVE",
    "deadline": "2025-02-20T00:00:00Z",
    "applicationDeadline": "2025-02-01T00:00:00Z",
    "maxApplications": 15,
    "requirements": [
      "Minimum 5 years professional video editing experience",
      "Advanced proficiency in Premiere Pro and After Effects",
      "Strong music video editing portfolio",
      "Color grading and motion graphics experience",
      "Ability to work with 4K footage",
      "Understanding of music video storytelling"
    ],
    "deliverables": [
      "Final edited music video in 4K resolution",
      "Instagram/TikTok optimized versions (1:1, 9:16)",
      "YouTube optimized version",
      "Behind-the-scenes edit (optional)",
      "Raw footage organization and archival"
    ],
    "techSpecs": {
      "software": ["Premiere Pro", "After Effects", "DaVinci Resolve"],
      "deliveryFormat": "4K ProRes 422 HQ",
      "audioSpecs": "48kHz/24-bit WAV",
      "projectTimeline": "2 weeks",
      "revisionsIncluded": 3
    },
    "workStyle": "remote",
    "equipmentRequired": [
      "High-performance editing workstation",
      "Calibrated monitor",
      "Professional audio monitoring"
    ],
    "projectDetails": {
      "artistName": "Rising Star Music",
      "songGenre": "Pop/Electronic",
      "videoStyle": "Cinematic/Narrative",
      "footage": "~500GB RAW footage",
      "additionalAssets": "Motion graphics elements provided"
    },
    "postedBy": {
      "id": "brand_890",
      "firstName": "Michael",
      "lastName": "Producer",
      "companyName": "I'll create comprehensive API documentation for both Influencer and Crew roles. Let me search through the codebase to find all role-specific APIs for these user types. Summarized conversation historyBased on the comprehensive search results, I now have a complete understanding of all the Influencer and Crew-specific APIs across the entire 50BraIns platform. Let me create the detailed documentation for both user types:

# 🎭 Complete Influencer API Documentation - 50BraIns Platform

Here's the comprehensive list of **ALL Influencer APIs** across the entire 50BraIns ecosystem with JSON request/response examples:

## 📡 **API GATEWAY (Port 3000)**
Base URL: `http://localhost:3000`

### **AUTHENTICATION**
All protected endpoints require JWT authentication:
```typescript
Headers: {
  'Authorization': 'Bearer <ACCESS_TOKEN>'
}
```

---

## 🔐 **1. AUTH SERVICE APIs**

### **POST /api/auth/register** (Public)
Influencer registration with content creator specific fields

```json
// Request Body
{
  "firstName": "Alex",
  "lastName": "Creator",
  "email": "alex.creator@example.com",
  "password": "TestPass123!",
  "roles": "INFLUENCER",
  "phone": "9876543210",
  "location": "Mumbai, India",
  "bio": "Fashion and lifestyle content creator with 50K+ followers",
  "contentCategories": ["fashion", "lifestyle", "travel", "food"],
  "primaryNiche": "fashion",
  "primaryPlatform": "instagram",
  "estimatedFollowers": 50000,
  "instagramHandle": "alexcreator",
  "youtubeHandle": "AlexCreatorOfficial",
  "twitterHandle": "alexcreator",
  "linkedinHandle": "alex-creator",
  "website": "https://alexcreator.com"
}

// Response
{
  "success": true,
  "message": "Influencer registered successfully",
  "data": {
    "userId": "influencer_456",
    "email": "alex.creator@example.com",
    "roles": "INFLUENCER",
    "primaryNiche": "fashion",
    "primaryPlatform": "instagram",
    "isVerified": false,
    "requiresDocumentVerification": false
  }
}
```

### **POST /api/auth/login** (Public)
Influencer authentication

```json
// Request Body
{
  "email": "alex.creator@example.com",
  "password": "TestPass123!"
}

// Response
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "influencer_456",
      "email": "alex.creator@example.com",
      "roles": "INFLUENCER",
      "firstName": "Alex",
      "lastName": "Creator",
      "primaryNiche": "fashion",
      "primaryPlatform": "instagram",
      "isVerified": false
    }
  }
}
```

### **GET /api/auth/profile** (Protected)
Get influencer profile

```json
// Response
{
  "success": true,
  "data": {
    "id": "influencer_456",
    "email": "alex.creator@example.com",
    "roles": "INFLUENCER",
    "firstName": "Alex",
    "lastName": "Creator",
    "bio": "Fashion and lifestyle content creator",
    "contentCategories": ["fashion", "lifestyle", "travel"],
    "primaryNiche": "fashion",
    "primaryPlatform": "instagram",
    "estimatedFollowers": 50000,
    "instagramHandle": "alexcreator",
    "isVerified": false,
    "createdAt": "2025-01-01T10:00:00Z"
  }
}
```

---

## 👤 **2. USER SERVICE APIs**

### **GET /api/user/profile** (Protected)
Get influencer's own profile

```json
// Response
{
  "success": true,
  "data": {
    "id": "influencer_456",
    "email": "alex.creator@example.com",
    "roles": "INFLUENCER",
    "firstName": "Alex",
    "lastName": "Creator",
    "bio": "Fashion and lifestyle content creator",
    "location": "Mumbai, India",
    "contentCategories": ["fashion", "lifestyle", "travel"],
    "primaryNiche": "fashion",
    "primaryPlatform": "instagram",
    "estimatedFollowers": 50000,
    "instagramHandle": "alexcreator",
    "youtubeHandle": "AlexCreatorOfficial",
    "website": "https://alexcreator.com",
    "profileViews": 1250,
    "isVerified": true,
    "analytics": {
      "profileScore": 92,
      "completionPercentage": 95,
      "engagementRate": 4.8
    }
  }
}
```

### **PUT /api/user/profile** (Protected)
Update influencer profile

```json
// Request Body
{
  "bio": "Updated fashion and lifestyle content creator",
  "contentCategories": ["fashion", "lifestyle", "beauty", "travel"],
  "primaryNiche": "beauty",
  "estimatedFollowers": 75000,
  "location": "Delhi, India"
}

// Response
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "influencer_456",
    "bio": "Updated fashion and lifestyle content creator",
    "contentCategories": ["fashion", "lifestyle", "beauty", "travel"],
    "primaryNiche": "beauty",
    "estimatedFollowers": 75000,
    "location": "Delhi, India",
    "updatedAt": "2025-01-01T12:00:00Z"
  }
}
```

### **PUT /api/user/roles-info** (Protected)
Update influencer-specific information

```json
// Request Body
{
  "contentCategories": ["fashion", "lifestyle", "beauty", "tech"],
  "primaryNiche": "tech",
  "primaryPlatform": "youtube",
  "estimatedFollowers": 100000
}

// Response
{
  "success": true,
  "message": "Influencer information updated successfully",
  "data": {
    "contentCategories": ["fashion", "lifestyle", "beauty", "tech"],
    "primaryNiche": "tech",
    "primaryPlatform": "youtube",
    "estimatedFollowers": 100000,
    "updatedAt": "2025-01-01T12:00:00Z"
  }
}
```

### **GET /api/search/influencers** (Protected)
Search for other influencers

```json
// Query Parameters: ?q=fashion&primaryNiche=lifestyle&location=Mumbai&followersMin=10000&limit=10

// Response
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "influencer_789",
        "username": "fashionista_jane",
        "firstName": "Jane",
        "lastName": "Smith",
        "bio": "Fashion influencer and style blogger",
        "primaryNiche": "fashion",
        "primaryPlatform": "instagram",
        "estimatedFollowers": 25000,
        "location": "Mumbai, India",
        "isVerified": true,
        "profileViews": 890,
        "analytics": {
          "profileScore": 88,
          "engagementRate": 5.2
        }
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 10,
      "pages": 15
    }
  }
}
```

### **GET /api/public/influencers/:userId** (Public)
Get public influencer profile

```json
// Response
{
  "success": true,
  "data": {
    "influencer": {
      "id": "influencer_456",
      "firstName": "Alex",
      "lastName": "Creator",
      "bio": "Fashion and lifestyle content creator",
      "primaryNiche": "fashion",
      "primaryPlatform": "instagram",
      "estimatedFollowers": 50000,
      "contentCategories": ["fashion", "lifestyle", "travel"],
      "location": "Mumbai, India",
      "instagramHandle": "alexcreator",
      "youtubeHandle": "AlexCreatorOfficial",
      "website": "https://alexcreator.com",
      "isVerified": true,
      "profileViews": 1250,
      "memberSince": "2024-01-01",
      "stats": {
        "totalGigs": 15,
        "completedGigs": 12,
        "avgRating": 4.9,
        "responseRate": 98
      }
    }
  }
}
```

---

## 💼 **3. GIG SERVICE APIs**

### **GET /api/gig** (Public/Protected)
Browse available gigs

```json
// Query Parameters: ?category=Fashion&budget_min=5000&location=Mumbai&page=1&limit=10

// Response
{
  "success": true,
  "data": {
    "gigs": [
      {
        "id": "gig_123",
        "title": "Fashion Brand Product Launch",
        "description": "Looking for fashion influencers for new clothing line launch",
        "category": "Fashion",
        "budget": 25000,
        "budgetType": "FIXED",
        "brandName": "TrendyWear Co",
        "requirements": [
          "Fashion-focused content",
          "Minimum 20K followers",
          "Instagram presence required"
        ],
        "deliverables": [
          "2 Instagram posts",
          "1 Reel video",
          "Story coverage"
        ],
        "deadline": "2025-02-15T00:00:00Z",
        "applicationDeadline": "2025-01-30T00:00:00Z",
        "location": "Mumbai, India",
        "applicationsCount": 45,
        "status": "OPEN",
        "postedAt": "2025-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 125,
      "page": 1,
      "limit": 10,
      "pages": 13
    }
  }
}
```

### **POST /api/gig/:gigId/apply** (Protected - Influencer Only)
Apply to a gig

```json
// Request Body
{
  "proposal": "I'm excited to collaborate on this fashion campaign. My aesthetic aligns perfectly with your brand values...",
  "quotedPrice": 22000,
  "estimatedTime": "3 days",
  "portfolio": [
    "https://instagram.com/p/fashion-post-1",
    "https://instagram.com/p/fashion-post-2"
  ],
  "applicantType": "user"
}

// Response
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "applicationId": "app_789",
    "gigId": "gig_123",
    "status": "PENDING",
    "quotedPrice": 22000,
    "appliedAt": "2025-01-05T14:30:00Z",
    "estimatedResponseTime": "2-3 business days"
  }
}
```

### **GET /api/my/applications** (Protected - Influencer Only)
Get influencer's gig applications

```json
// Query Parameters: ?status=PENDING&page=1&limit=10

// Response
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "app_789",
        "gig": {
          "id": "gig_123",
          "title": "Fashion Brand Product Launch",
          "brandName": "TrendyWear Co",
          "budget": 25000,
          "category": "Fashion"
        },
        "status": "PENDING",
        "quotedPrice": 22000,
        "appliedAt": "2025-01-05T14:30:00Z",
        "lastUpdated": "2025-01-05T14:30:00Z"
      },
      {
        "id": "app_790",
        "gig": {
          "id": "gig_124",
          "title": "Tech Product Review",
          "brandName": "TechCorp",
          "budget": 15000,
          "category": "Technology"
        },
        "status": "ACCEPTED",
        "finalBudget": 15000,
        "appliedAt": "2025-01-03T10:00:00Z",
        "acceptedAt": "2025-01-04T16:20:00Z"
      }
    ],
    "pagination": {
      "total": 8,
      "page": 1,
      "limit": 10
    },
    "stats": {
      "totalApplications": 8,
      "pendingApplications": 3,
      "acceptedApplications": 3,
      "rejectedApplications": 2,
      "acceptanceRate": 37.5
    }
  }
}
```

### **POST /api/gig/:id/submit** (Protected - Influencer Only)
Submit work for accepted gig

```json
// Request Body
{
  "title": "Fashion Campaign Deliverables",
  "description": "Completed all deliverables for the fashion campaign including posts and reel",
  "deliverables": [
    "https://instagram.com/p/campaign-post-1",
    "https://instagram.com/reel/campaign-reel-1"
  ],
  "notes": "Campaign exceeded expectations with 20% higher engagement than average"
}

// Response
{
  "success": true,
  "message": "Work submitted successfully",
  "data": {
    "submissionId": "sub_456",
    "gigId": "gig_123",
    "status": "PENDING_REVIEW",
    "submittedAt": "2025-01-20T17:00:00Z",
    "expectedReviewTime": "2-3 business days"
  }
}
```

---

## 🏆 **4. REPUTATION SERVICE APIs**

### **GET /api/reputation/user/:userId** (Protected)
Get influencer reputation score

```json
// Response
{
  "success": true,
  "data": {
    "userId": "influencer_456",
    "overallScore": 920,
    "tier": "PLATINUM",
    "rank": 15,
    "scores": {
      "contentQuality": 95,
      "reliability": 88,
      "communication": 92,
      "creativity": 90,
      "professionalism": 89
    },
    "badges": [
      {
        "id": "top_performer",
        "name": "Top Performer",
        "description": "Consistently delivers exceptional content",
        "earnedAt": "2024-12-01T10:00:00Z"
      },
      {
        "id": "fashion_expert",
        "name": "Fashion Expert",
        "description": "Recognized expertise in fashion content",
        "earnedAt": "2024-11-15T10:00:00Z"
      }
    ],
    "recentActivity": [
      {
        "type": "GIG_COMPLETED",
        "score": +25,
        "description": "Completed fashion campaign with exceptional results",
        "date": "2025-01-20T10:00:00Z"
      },
      {
        "type": "POSITIVE_REVIEW",
        "score": +10,
        "description": "Received 5-star review from brand partner",
        "date": "2025-01-18T14:30:00Z"
      }
    ]
  }
}
```

---

## 📊 **5. SOCIAL MEDIA SERVICE APIs**

### **POST /api/social-media/link** (Protected)
Link social media accounts

```json
// Request Body
{
  "platform": "INSTAGRAM",
  "username": "alexcreator",
  "accessToken": "instagram_access_token_here",
  "profileUrl": "https://instagram.com/alexcreator"
}

// Response
{
  "success": true,
  "message": "Instagram account linked successfully",
  "data": {
    "accountId": "social_acc_789",
    "platform": "INSTAGRAM",
    "username": "alexcreator",
    "connectedAt": "2025-01-01T10:00:00Z",
    "isActive": true,
    "verified": false
  }
}
```

### **GET /api/social-media/analytics/:userId** (Protected)
Get influencer's social media analytics

```json
// Response
{
  "success": true,
  "data": {
    "userId": "influencer_456",
    "totalAccounts": 3,
    "totalFollowers": 125000,
    "totalFollowing": 850,
    "totalPosts": 245,
    "averageEngagement": 4.8,
    "platforms": [
      {
        "platform": "INSTAGRAM",
        "username": "alexcreator",
        "followers": 75000,
        "following": 500,
        "posts": 180,
        "engagement": 5.2,
        "verified": true,
        "lastSynced": "2025-01-01T10:00:00Z"
      },
      {
        "platform": "YOUTUBE",
        "username": "AlexCreatorOfficial",
        "followers": 45000,
        "following": 250,
        "posts": 50,
        "engagement": 4.1,
        "verified": false,
        "lastSynced": "2025-01-01T09:30:00Z"
      },
      {
        "platform": "TIKTOK",
        "username": "alexcreator_official",
        "followers": 5000,
        "following": 100,
        "posts": 15,
        "engagement": 6.8,
        "verified": false,
        "lastSynced": "2025-01-01T09:00:00Z"
      }
    ],
    "reachScore": 850,
    "influencerTier": "Gold Creator"
  }
}
```

---

## 📈 **6. WORK HISTORY SERVICE APIs**

### **GET /api/work-history/user/:userId** (Protected)
Get influencer's work history

```json
// Response
{
  "success": true,
  "data": {
    "workHistory": [
      {
        "id": "work_123",
        "gigId": "gig_123",
        "brandId": "brand_456",
        "projectTitle": "Fashion Campaign 2024",
        "category": "Fashion",
        "status": "COMPLETED",
        "budget": 25000,
        "startDate": "2024-12-01T00:00:00Z",
        "endDate": "2024-12-15T00:00:00Z",
        "rating": 5,
        "brandFeedback": "Exceptional work! Alex delivered beyond expectations.",
        "deliverables": [
          {
            "type": "Instagram Post",
            "url": "https://instagram.com/p/campaign-post",
            "metrics": {
              "reach": 85000,
              "engagement": 4800,
              "engagementRate": 5.6
            }
          }
        ],
        "brand": {
          "companyName": "TrendyWear Co",
          "industry": "Fashion"
        }
      }
    ],
    "stats": {
      "totalProjects": 12,
      "completedProjects": 11,
      "avgRating": 4.9,
      "totalEarnings": 180000,
      "repeatClients": 4,
      "successRate": 91.7
    }
  }
}
```

### **GET /api/portfolio/user/:userId** (Public)
Get influencer's portfolio

```json
// Response
{
  "success": true,
  "data": {
    "portfolioItems": [
      {
        "id": "portfolio_456",
        "type": "Instagram Campaign",
        "title": "Fashion Campaign Success Story",
        "description": "Successful fashion campaign that increased brand awareness by 40%",
        "mediaUrls": [
          "https://example.com/campaign-video.mp4",
          "https://example.com/results-image.jpg"
        ],
        "metrics": {
          "reach": 85000,
          "engagement": 4800,
          "conversions": 120,
          "brandMentions": 45
        },
        "isPublic": true,
        "featured": true,
        "workContext": {
          "category": "Fashion",
          "completedAt": "2024-12-15T00:00:00Z",
          "clientRating": 5
        }
      }
    ],
    "pagination": {
      "total": 15,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

---

## 🏰 **7. CLAN SERVICE APIs**

### **GET /api/clan/search** (Public)
Search for clans to join

```json
// Query Parameters: ?category=Fashion&skills=ContentCreation&location=Mumbai&verified=true

// Response
{
  "success": true,
  "data": {
    "clans": [
      {
        "id": "clan_123",
        "name": "Mumbai Fashion Creators",
        "description": "Elite fashion content creators in Mumbai",
        "primaryCategory": "Fashion",
        "memberCount": 25,
        "skills": ["Content Creation", "Photography", "Styling"],
        "location": "Mumbai",
        "isVerified": true,
        "rating": 4.8,
        "completedProjects": 45,
        "requirements": {
          "minFollowers": 10000,
          "primaryNiche": ["fashion", "lifestyle"],
          "experience": "intermediate"
        }
      }
    ]
  }
}
```

### **POST /api/clan/:clanId/join** (Protected)
Request to join a clan

```json
// Request Body
{
  "applicationMessage": "I'm a fashion content creator with 75K followers and would love to collaborate with like-minded creators.",
  "portfolio": [
    {
      "title": "Fashion Week Coverage",
      "url": "https://instagram.com/p/fashion-week-post",
      "metrics": {
        "reach": 45000,
        "engagement": 3200
      }
    }
  ]
}

// Response
{
  "success": true,
  "message": "Clan application submitted successfully",
  "data": {
    "applicationId": "clan_app_456",
    "clanId": "clan_123",
    "status": "PENDING",
    "appliedAt": "2025-01-01T10:00:00Z",
    "expectedResponseTime": "3-5 business days"
  }
}
```

---

## 💳 **8. CREDIT SERVICE APIs**

### **POST /api/credit/boost/profile** (Protected)
Boost influencer profile visibility

```json
// Request Body
{
  "boostType": "PROFILE_BOOST",
  "duration": 7,
  "targetAudience": "fashion_brands"
}

// Response
{
  "success": true,
  "message": "Profile boost activated successfully",
  "data": {
    "boostId": "boost_789",
    "creditsUsed": 100,
    "startDate": "2025-01-01T10:00:00Z",
    "endDate": "2025-01-08T10:00:00Z",
    "expectedReach": "3x visibility increase"
  }
}
```

---

## 🔔 **9. NOTIFICATION SERVICE APIs**

### **GET /api/notifications** (Protected)
Get influencer notifications

```json
// Response
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_123",
        "type": "GIG_MATCH",
        "title": "New Gig Match",
        "message": "A fashion gig matching your profile is available",
        "data": {
          "gigId": "gig_456",
          "gigTitle": "Summer Collection Launch",
          "brandName": "FashionBrand Co"
        },
        "isRead": false,
        "createdAt": "2025-01-05T10:00:00Z"
      },
      {
        "id": "notif_124",
        "type": "APPLICATION_ACCEPTED",
        "title": "Application Accepted",
        "message": "Your application for Tech Product Review has been accepted",
        "data": {
          "gigId": "gig_124",
          "applicationId": "app_790",
          "finalBudget": 15000
        },
        "isRead": false,
        "createdAt": "2025-01-04T16:20:00Z"
      }
    ],
    "unreadCount": 2
  }
}
```

---

# 🛠️ Complete Crew API Documentation - 50BraIns Platform

Here's the comprehensive list of **ALL Crew APIs** across the entire 50BraIns ecosystem with JSON request/response examples:

## 🔐 **1. AUTH SERVICE APIs**

### **POST /api/auth/register** (Public)
Crew member registration with creative professional specific fields

```json
// Request Body
{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "email": "sarah.photographer@example.com",
  "password": "CrewPass123!",
  "roles": "CREW",
  "phone": "9876543210",
  "location": "Pune, India",
  "bio": "Professional photographer and video editor specializing in lifestyle and product photography",
  "crewSkills": [
    "photography",
    "video editing",
    "color grading",
    "product photography",
    "lifestyle shoots"
  ],
  "experienceLevel": "advanced",
  "equipmentOwned": [
    "Professional DSLR Camera",
    "Drone",
    "Professional Lighting Kit",
    "Audio Equipment",
    "Editing Software Suite"
  ],
  "portfolioUrl": "https://sarahphotography.portfolio.com",
  "hourlyRate": 2500,
  "availability": "freelance",
  "workStyle": "hybrid",
  "specializations": [
    "product photography",
    "lifestyle shoots",
    "social media content",
    "commercial videos"
  ],
  "instagramHandle": "sarah_captures",
  "website": "https://sarahphotography.com"
}

// Response
{
  "success": true,
  "message": "Crew member registered successfully",
  "data": {
    "userId": "crew_789",
    "email": "sarah.photographer@example.com",
    "roles": "CREW",
    "experienceLevel": "advanced",
    "specializations": ["product photography", "lifestyle shoots"],
    "hourlyRate": 2500,
    "isVerified": false,
    "requiresPortfolioReview": true
  }
}
```

---

## 👤 **2. USER SERVICE APIs**

### **GET /api/user/profile** (Protected)
Get crew member's own profile

```json
// Response
{
  "success": true,
  "data": {
    "id": "crew_789",
    "email": "sarah.photographer@example.com",
    "roles": "CREW",
    "firstName": "Sarah",
    "lastName": "Johnson",
    "bio": "Professional photographer and video editor",
    "location": "Pune, India",
    "crewSkills": [
      "photography",
      "video editing",
      "color grading",
      "product photography"
    ],
    "experienceLevel": "advanced",
    "equipmentOwned": [
      "Professional DSLR Camera",
      "Drone",
      "Professional Lighting Kit"
    ],
    "portfolioUrl": "https://sarahphotography.portfolio.com",
    "hourlyRate": 2500,
    "availability": "freelance",
    "workStyle": "hybrid",
    "specializations": ["product photography", "lifestyle shoots"],
    "instagramHandle": "sarah_captures",
    "website": "https://sarahphotography.com",
    "profileViews": 580,
    "isVerified": true,
    "analytics": {
      "profileScore": 88,
      "completionPercentage": 92,
      "responseRate": 95
    }
  }
}
```

### **PUT /api/user/roles-info** (Protected)
Update crew-specific information

```json
// Request Body
{
  "crewSkills": [
    "photography",
    "video editing",
    "motion graphics",
    "drone photography",
    "commercial video production"
  ],
  "experienceLevel": "expert",
  "hourlyRate": 3500,
  "availability": "part-time",
  "specializations": [
    "commercial video production",
    "drone photography",
    "motion graphics"
  ]
}

// Response
{
  "success": true,
  "message": "Crew information updated successfully",
  "data": {
    "crewSkills": [
      "photography",
      "video editing",
      "motion graphics",
      "drone photography",
      "commercial video production"
    ],
    "experienceLevel": "expert",
    "hourlyRate": 3500,
    "availability": "part-time",
    "specializations": [
      "commercial video production",
      "drone photography",
      "motion graphics"
    ],
    "updatedAt": "2025-01-01T12:00:00Z"
  }
}
```

### **GET /api/search/crew** (Protected)
Search for crew members

```json
// Query Parameters: ?q=photographer&skills=photography&experience=advanced&location=Pune&availability=freelance&limit=10

// Response
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "crew_456",
        "firstName": "Mike",
        "lastName": "Editor",
        "bio": "Professional video editor and motion graphics artist",
        "crewSkills": ["video editing", "motion graphics", "color grading"],
        "experienceLevel": "expert",
        "hourlyRate": 4000,
        "availability": "freelance",
        "workStyle": "remote",
        "location": "Pune, India",
        "portfolioUrl": "https://mikeedits.com",
        "isVerified": true,
        "rating": 4.9,
        "completedProjects": 35
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 10,
      "pages": 3
    }
  }
}
```

### **GET /api/public/crew/:userId** (Public)
Get public crew member profile

```json
// Response
{
  "success": true,
  "data": {
    "crew": {
      "id": "crew_789",
      "firstName": "Sarah",
      "lastName": "Johnson",
      "bio": "Professional photographer and video editor",
      "crewSkills": ["photography", "video editing", "color grading"],
      "experienceLevel": "advanced",
      "specializations": ["product photography", "lifestyle shoots"],
      "location": "Pune, India",
      "portfolioUrl": "https://sarahphotography.portfolio.com",
      "hourlyRate": 2500,
      "availability": "freelance",
      "workStyle": "hybrid",
      "instagramHandle": "sarah_captures",
      "website": "https://sarahphotography.com",
      "isVerified": true,
      "profileViews": 580,
      "memberSince": "2024-01-01",
      "stats": {
        "totalProjects": 28,
        "completedProjects": 26,
        "avgRating": 4.8,
        "responseRate": 95,
        "onTimeDelivery": 92
      }
    }
  }
}
```

---

## 💼 **3. GIG SERVICE APIs**

### **GET /api/gig** (Public/Protected)
Browse gigs that need crew services

```json
// Query Parameters: ?category=Photography&skills=product_photography&budget_min=2000&location=Pune

// Response
{
  "success": true,
  "data": {
    "gigs": [
      {
        "id": "gig_crew_123",
        "title": "Product Photography for E-commerce",
        "description": "Need professional photographer for product catalog shoot",
        "category": "Photography",
        "skillsRequired": ["product photography", "lighting", "post-processing"],
        "budget": 15000,
        "budgetType": "FIXED",
        "clientType": "BRAND",
        "clientName": "FashionBrand Co",
        "requirements": [
          "Professional camera equipment",
          "Studio lighting setup",
          "Product photography experience"
        ],
        "deliverables": [
          "50 edited product photos",
          "High-resolution files",
          "Web-optimized versions"
        ],
        "deadline": "2025-02-10T00:00:00Z",
        "location": "Pune, India",
        "workStyle": "on-location",
        "applicationsCount": 12,
        "status": "OPEN",
        "postedAt": "2025-01-01T10:00:00Z"
      }
    ]
  }
}
```

### **POST /api/gig/:gigId/apply** (Protected - Crew Only)
Apply to a crew gig

```json
// Request Body
{
  "proposal": "I'm a professional photographer with 5+ years of product photography experience. I have all the necessary equipment and can deliver high-quality results within your timeline.",
  "quotedPrice": 14000,
  "estimatedTime": "5 days",
  "portfolio": [
    "https://sarahphotography.com/ecommerce-portfolio",
    "https://sarahphotography.com/product-catalog"
  ],
  "applicantType": "user"
}

// Response
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "applicationId": "crew_app_456",
    "gigId": "gig_crew_123",
    "status": "PENDING",
    "quotedPrice": 14000,
    "appliedAt": "2025-01-02T10:30:00Z"
  }
}
```

### **GET /api/my/applications** (Protected - Crew Only)
Get crew member's gig applications

```json
// Response
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "crew_app_456",
        "gig": {
          "id": "gig_crew_123",
          "title": "Product Photography for E-commerce",
          "clientName": "FashionBrand Co",
          "budget": 15000,
          "category": "Photography"
        },
        "status": "ACCEPTED",
        "quotedPrice": 14000,
        "finalBudget": 14000,
        "appliedAt": "2025-01-02T10:30:00Z",
        "acceptedAt": "2025-01-03T14:20:00Z"
      }
    ],
    "stats": {
      "totalApplications": 15,
      "pendingApplications": 3,
      "acceptedApplications": 8,
      "rejectedApplications": 4,
      "acceptanceRate": 53.3
    }
  }
}
```

---

## 🏆 **4. REPUTATION SERVICE APIs**

### **GET /api/reputation/user/:userId** (Protected)
Get crew member reputation score

```json
// Response
{
  "success": true,
  "data": {
    "userId": "crew_789",
    "overallScore": 880,
    "tier": "GOLD",
    "rank": 8,
    "scores": {
      "technicalSkills": 92,
      "creativity": 88,
      "reliability": 90,
      "communication": 85,
      "timelyDelivery": 94
    },
    "badges": [
      {
        "id": "technical_expert",
        "name": "Technical Expert",
        "description": "Recognized for exceptional technical skills",
        "earnedAt": "2024-11-20T10:00:00Z"
      },
      {
        "id": "reliable_partner",
        "name": "Reliable Partner",
        "description": "Consistently delivers on time",
        "earnedAt": "2024-10-15T10:00:00Z"
      }
    ],
    "recentActivity": [
      {
        "type": "PROJECT_COMPLETED",
        "score": +20,
        "description": "Completed product photography project with excellent results",
        "date": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

## 📈 **5. WORK HISTORY SERVICE APIs**

### **GET /api/work-history/user/:userId** (Protected)
Get crew member's work history

```json
// Response
{
  "success": true,
  "data": {
    "workHistory": [
      {
        "id": "crew_work_123",
        "gigId": "gig_crew_123",
        "clientId": "brand_456",
        "projectTitle": "Product Photography Catalog",
        "category": "Photography",
        "status": "COMPLETED",
        "budget": 14000,
        "startDate": "2025-01-05T00:00:00Z",
        "endDate": "2025-01-10T00:00:00Z",
        "rating": 5,
        "clientFeedback": "Exceptional work! Sarah delivered high-quality photos that exceeded our expectations.",
        "deliverables": [
          {
            "type": "Product Photos",
            "count": 52,
            "description": "High-resolution product catalog photos",
            "deliveredAt": "2025-01-10T16:00:00Z"
          }
        ],
        "client": {
          "name": "FashionBrand Co",
          "type": "BRAND",
          "industry": "Fashion"
        }
      }
    ],
    "stats": {
      "totalProjects": 26,
      "completedProjects": 24,
      "avgRating": 4.8,
      "totalEarnings": 245000,
      "repeatClients": 8,
      "onTimeDelivery": 92,
      "clientSatisfaction": 96
    }
  }
}
```

### **GET /api/portfolio/user/:userId** (Public)
Get crew member's portfolio

```json
// Response
{
  "success": true,
  "data": {
    "portfolioItems": [
      {
        "id": "crew_portfolio_789",
        "type": "Photography Project",
        "title": "E-commerce Product Catalog Success",
        "description": "Complete product photography catalog for fashion brand featuring 50+ products",
        "skills": ["product photography", "lighting", "post-processing"],
        "mediaUrls": [
          "https://sarahphotography.com/portfolio/ecommerce-catalog.jpg",
          "https://sarahphotography.com/portfolio/before-after.jpg"
        ],
        "results": {
          "photosDelivered": 52,
          "clientSatisfaction": 5,
          "projectDuration": "5 days",
          "repeatBooking": true
        },
        "isPublic": true,
        "featured": true,
        "workContext": {
          "category": "Photography",
          "completedAt": "2025-01-10T00:00:00Z",
          "clientRating": 5
        }
      }
    ],
    "pagination": {
      "total": 18,
      "limit": 20,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

---

## 🏰 **6. CLAN SERVICE APIs**

### **GET /api/clan/search** (Public)
Search for creative clans to join

```json
// Query Parameters: ?category=Photography&skills=ProductPhotography&location=Pune&verified=true

// Response
{
  "success": true,
  "data": {
    "clans": [
      {
        "id": "clan_photo_456",
        "name": "Pune Creative Collective",
        "description": "Professional photographers and videographers in Pune",
        "primaryCategory": "Photography",
        "memberCount": 18,
        "skills": ["Product Photography", "Event Photography", "Video Production"],
        "location": "Pune",
        "isVerified": true,
        "rating": 4.7,
        "completedProjects": 65,
        "requirements": {
          "experienceLevel": "intermediate",
          "equipment": "Professional camera required",
          "portfolio": "Minimum 10 professional projects"
        }
      }
    ]
  }
}
```

---

## 💳 **7. CREDIT SERVICE APIs**

### **POST /api/credit/boost/profile** (Protected)
Boost crew profile visibility

```json
// Request Body
{
  "boostType": "SKILL_BOOST",
  "duration": 14,
  "targetSkills": ["photography", "video editing"]
}

// Response
{
  "success": true,
  "message": "Profile boost activated successfully",
  "data": {
    "boostId": "boost_crew_123",
    "creditsUsed": 150,
    "startDate": "2025-01-01T10:00:00Z",
    "endDate": "2025-01-15T10:00:00Z",
    "expectedReach": "Featured in skill-based searches"
  }
}
```

---

## 🔔 **8. NOTIFICATION SERVICE APIs**

### **GET /api/notifications** (Protected)
Get crew member notifications

```json
// Response
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "crew_notif_123",
        "type": "GIG_OPPORTUNITY",
        "title": "New Photography Gig",
        "message": "A product photography gig matching your skills is available",
        "data": {
          "gigId": "gig_crew_456",
          "gigTitle": "Fashion Product Shoot",
          "clientName": "StyleBrand Co",
          "budget": 18000,
          "location": "Pune"
        },
        "isRead": false,
        "createdAt": "2025-01-06T09:00:00Z"
      },
      {
        "id": "crew_notif_124",
        "type": "APPLICATION_ACCEPTED",
        "title": "Application Accepted",
        "message": "Your application for Product Photography has been accepted",
        "data": {
          "gigId": "gig_crew_123",
          "applicationId": "crew_app_456",
          "finalBudget": 14000,
          "startDate": "2025-01-05T00:00:00Z"
        },
        "isRead": false,
        "createdAt": "2025-01-03T14:20:00Z"
      },
      {
        "id": "crew_notif_125",
        "type": "SKILL_VERIFICATION",
        "title": "Skill Verified",
        "message": "Your product photography skill has been verified",
        "data": {
          "skill": "product photography",
          "verifiedBy": "Portfolio Review",
          "credibilityScore": "+10"
        },
        "isRead": true,
        "createdAt": "2025-01-01T16:30:00Z"
      }
    ],
    "unreadCount": 2
  }
}
```

---

## 📋 **COMMON ROUTES FOR ALL ROLES**

### **Analytics Routes (Public)**
```json
// GET /api/analytics/trending-influencers
// GET /api/analytics/popular-brands  
// GET /api/analytics/search-trends
{
  "success": true,
  "data": {
    "trendingUsers": [...],
    "insights": {...},
    "period": "7d"
  }
}
```

### **Health Check (Public)**
```json
// GET /api/health
{
  "success": true,
  "service": "API Gateway",
  "timestamp": "2025-01-01T10:00:00Z",
  "uptime": 86400,
  "services": {
    "auth": "healthy",
    "user": "healthy",
    "social-media": "healthy"
  }
}
```

---

## 🔐 **AUTHENTICATION & AUTHORIZATION**

### **Route Protection Summary**

**Influencer-Specific Protected Routes:**
- All `/api/my/*` - Influencer's gig applications and submissions
- All `/api/user/roles-info` with INFLUENCER data
- Social media account linking and analytics
- Portfolio and work history management

**Crew-Specific Protected Routes:**
- All crew job applications and project submissions
- Crew skills and equipment management
- Technical portfolio and client work history
- Hourly rate and availability settings

**Public Routes Available to All:**
- User search and discovery
- Public profiles and portfolios
- Reputation leaderboards
- Analytics and trends
- Clan discovery

---

This comprehensive documentation covers **ALL Influencer and Crew specific endpoints** across the entire 50BraIns platform ecosystem, providing detailed JSON request/response examples for every API interaction these user types can perform.