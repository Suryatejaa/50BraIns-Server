# Social Media Service

The **Social Media Service** is responsible for linking, verifying, and pulling real-time insights from public social media accounts of users & clans.

## 🎯 Purpose

* **Authenticate influencer metrics** (followers, reach)
* **Boost reputation score** with verified clout
* **Power brand filters** ("Only show IG creators with >10K followers")
* **Give platform trust & credibility** to creators

## 🧱 Database Schema

The service uses two main models:

### SocialMediaAccount
- `id`: Unique identifier
- `userId`: Reference to user in user-service
- `platform`: instagram, youtube, twitter, linkedin, tiktok
- `username`: Platform username/handle
- `profileUrl`: Full URL to profile
- `followers`: Current follower count
- `following`: Current following count
- `posts`: Current post count
- `engagement`: Engagement rate percentage
- `verified`: Platform verification status
- `lastSynced`: Last time stats were updated

### SocialMediaSnapshot
- Historical data snapshots for growth tracking
- Stores followers, following, posts, engagement at point in time
- Includes platform-specific metrics as JSON

## 🧪 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/social-media/link` | Link a social media account |
| `GET` | `/api/social-media/:userId` | Get all linked accounts for user |
| `PUT` | `/api/social-media/sync/:platform/:userId` | Manually refresh stats |
| `DELETE` | `/api/social-media/:accountId` | Remove linked account |
| `GET` | `/api/social-media/analytics/:userId` | Get analytics summary |
| `GET` | `/api/social-media/stats/platform` | Get platform statistics |

## 📊 Example Usage

### Link an Instagram Account
```bash
POST /api/social-media/link
{
  "userId": "user123",
  "platform": "instagram",
  "username": "johndoe",
  "profileUrl": "https://instagram.com/johndoe"
}
```

### Get User Analytics
```bash
GET /api/social-media/analytics/user123
```

Response:
```json
{
  "userId": "user123",
  "totalAccounts": 3,
  "totalFollowers": 125000,
  "totalFollowing": 850,
  "totalPosts": 245,
  "averageEngagement": 5.2,
  "reachScore": 87500,
  "influencerTier": "Macro Influencer",
  "platforms": [
    {
      "platform": "instagram",
      "username": "johndoe",
      "followers": 75000,
      "engagement": 6.5,
      "verified": true,
      "lastSynced": "2025-06-30T10:30:00Z"
    }
  ]
}
```

## 🐇 Events Published

The service publishes the following events via RabbitMQ:

### `social.account.linked`
```json
{
  "userId": "user123",
  "platform": "instagram",
  "username": "johndoe",
  "accountId": "acc123"
}
```

### `social.synced`
```json
{
  "userId": "user123",
  "platform": "instagram",
  "username": "johndoe",
  "accountId": "acc123",
  "currentStats": {
    "followers": 75000,
    "engagement": 6.5
  },
  "previousStats": {
    "followers": 74500,
    "engagement": 6.2
  },
  "growthMetrics": {
    "followersGrowth": 500,
    "followersGrowthPercent": 0.67,
    "engagementGrowth": 0.3
  }
}
```

### `social.engagement.threshold`
```json
{
  "userId": "user123",
  "platform": "instagram",
  "username": "johndoe",
  "accountId": "acc123",
  "threshold": 75000,
  "currentFollowers": 75000,
  "currentEngagement": 6.5
}
```

## 🔌 Platform Integrations

### Currently Supported (MVP with Mock Data)
- Instagram (Graph API ready)
- YouTube (Data API v3 ready)
- Twitter/X (API v2 ready)
- LinkedIn (Basic ready)
- TikTok (Mock data)

### To Enable Real API Integration
1. Set up developer accounts for each platform
2. Add API keys to environment variables
3. Update `platformAPIService.js` to use real credentials

## 🧰 Dependencies

- **Express.js**: Web framework
- **Prisma**: Database ORM
- **axios**: HTTP client for API calls
- **amqplib**: RabbitMQ client for events
- **joi**: Request validation

## 🚀 Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database URL and API keys
```

3. Run database migrations:
```bash
npx prisma migrate dev
```

4. Start the service:
```bash
npm start
```

## 🔥 Influencer Tiers

The service automatically categorizes users based on total followers:

- **Emerging Creator**: < 1,000 followers
- **Nano Influencer**: 1,000 - 9,999 followers
- **Micro Influencer**: 10,000 - 99,999 followers
- **Macro Influencer**: 100,000 - 999,999 followers
- **Mega Influencer**: 1,000,000+ followers

## 🔮 Future Enhancements

- OAuth integration for automatic syncing
- Real-time webhooks from platforms
- Growth tracking charts
- Fraud detection for fake followers
- AI-powered performance insights
- Social media leaderboards
- Multi-account comparisons

## 🔧 Configuration

Environment variables:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=social_media"
PORT=4008
RABBITMQ_URL="amqp://admin:admin123@localhost:5672"

# Optional API Keys (for real data fetching)
INSTAGRAM_ACCESS_TOKEN=""
YOUTUBE_API_KEY=""
TWITTER_BEARER_TOKEN=""
LINKEDIN_ACCESS_TOKEN=""
```
