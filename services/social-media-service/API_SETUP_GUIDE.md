# API Configuration Guide

This guide explains how to set up API credentials for each social media platform supported by the Social Media Service.

## 🔧 Environment Variables Setup

Copy the `.env.example` file to `.env` and fill in the API credentials for the platforms you want to use:

```bash
cp .env.example .env
```

## 📱 Platform API Setup Instructions

### Instagram Graph API

**Required Environment Variables:**
```bash
INSTAGRAM_APP_ID=""
INSTAGRAM_APP_SECRET=""
INSTAGRAM_ACCESS_TOKEN=""
INSTAGRAM_BUSINESS_ACCOUNT_ID=""
```

**Setup Steps:**
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new App → "Business" type
3. Add "Instagram Graph API" product
4. Get App ID and App Secret from App Settings
5. Generate User Access Token (requires Instagram Business/Creator account)
6. Convert to long-lived token (60 days)

**Required Permissions:**
- `instagram_graph_user_profile`
- `instagram_graph_user_media` 
- `pages_show_list`

**API Documentation:** https://developers.facebook.com/docs/instagram-api/

---

### YouTube Data API v3

**Required Environment Variables:**
```bash
YOUTUBE_API_KEY=""
YOUTUBE_CLIENT_ID=""
YOUTUBE_CLIENT_SECRET=""
```

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "YouTube Data API v3"
4. Create credentials:
   - API Key (for public data)
   - OAuth 2.0 Client ID (for authenticated requests)
5. Configure OAuth consent screen

**Quota Limits:**
- 10,000 units/day (default quota)
- Different operations cost different units

**API Documentation:** https://developers.google.com/youtube/v3

---

### Twitter API v2

**Required Environment Variables:**
```bash
TWITTER_API_KEY=""
TWITTER_API_SECRET=""
TWITTER_BEARER_TOKEN=""
TWITTER_ACCESS_TOKEN=""
TWITTER_ACCESS_TOKEN_SECRET=""
```

**Setup Steps:**
1. Apply for Twitter Developer Account at [developer.twitter.com](https://developer.twitter.com/)
2. Create a new App in the Developer Portal
3. Generate Bearer Token for app-only auth
4. Generate Access Token & Secret for user context
5. Set appropriate app permissions

**API Tiers:**
- **Essential** (Free): Basic access, 500K tweets/month
- **Elevated** ($100/month): Enhanced features, 2M tweets/month
- **Academic Research** (Free): For qualifying researchers

**API Documentation:** https://developer.twitter.com/en/docs/twitter-api

---

### LinkedIn API

**Required Environment Variables:**
```bash
LINKEDIN_CLIENT_ID=""
LINKEDIN_CLIENT_SECRET=""
LINKEDIN_ACCESS_TOKEN=""
```

**Setup Steps:**
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. Request access to LinkedIn APIs
4. Generate OAuth 2.0 credentials
5. Complete Partner Program application (for most APIs)

**Important Notes:**
- LinkedIn heavily restricts API access
- Most follower/metrics APIs require Partnership Program approval
- Limited to LinkedIn Marketing Partners for many features

**API Documentation:** https://docs.microsoft.com/en-us/linkedin/

---

### TikTok for Developers

**Required Environment Variables:**
```bash
TIKTOK_CLIENT_KEY=""
TIKTOK_CLIENT_SECRET=""
TIKTOK_ACCESS_TOKEN=""
```

**Setup Steps:**
1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create a new app
3. Apply for API access
4. Complete app review process
5. Generate client credentials

**Available APIs:**
- **Login Kit**: User authentication
- **Share Kit**: Content sharing
- **Research API**: Academic research (application required)

**API Documentation:** https://developers.tiktok.com/doc/

---

### Pinterest API

**Required Environment Variables:**
```bash
PINTEREST_APP_ID=""
PINTEREST_APP_SECRET=""
PINTEREST_ACCESS_TOKEN=""
```

**Setup Steps:**
1. Go to [Pinterest Developers](https://developers.pinterest.com/)
2. Create a new app
3. Get app credentials
4. Generate access tokens
5. Review API guidelines

**API Documentation:** https://developers.pinterest.com/docs/api/v5/

---

### Snapchat Marketing API

**Required Environment Variables:**
```bash
SNAPCHAT_CLIENT_ID=""
SNAPCHAT_CLIENT_SECRET=""
SNAPCHAT_ACCESS_TOKEN=""
```

**Setup Steps:**
1. Apply for [Snapchat Marketing API](https://businesshelp.snapchat.com/s/article/api-apply)
2. Complete business verification
3. Create OAuth app
4. Get approval for API access

**Note:** Primarily for advertising/business metrics, not personal profiles.

**API Documentation:** https://marketingapi.snapchat.com/docs/

---

## 🚀 Feature Flags

Control which features are enabled:

```bash
# Enable real API calls (vs mock data)
ENABLE_REAL_API_CALLS=false

# Enable mock data for testing
ENABLE_MOCK_DATA=true

# Enable webhook signature verification
ENABLE_WEBHOOK_VERIFICATION=false
```

## 🔍 Health Check

Check your configuration status:

```bash
GET /health
```

Response includes:
- Service status
- Configured platforms
- Feature flags status
- Configuration validation

## 📝 Testing Without API Keys

The service works with mock data when API keys are not provided:

1. Set `ENABLE_MOCK_DATA=true`
2. Set `ENABLE_REAL_API_CALLS=false`
3. All endpoints will return realistic mock data

## 🔒 Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all credentials
3. **Rotate tokens regularly** especially short-lived ones
4. **Limit API permissions** to minimum required scope
5. **Monitor API usage** and quotas
6. **Use HTTPS** for all API communications

## 🔧 Rate Limiting

Configure API rate limits:

```bash
API_RATE_LIMIT_REQUESTS=100
API_RATE_LIMIT_WINDOW=60000
```

## 📊 Auto-Sync Configuration

Configure automatic data synchronization:

```bash
AUTO_SYNC_ENABLED=false
SYNC_INTERVAL_HOURS=24
MAX_CONCURRENT_SYNCS=5
```

## 🐛 Troubleshooting

### Common Issues:

1. **"API Key Invalid"**
   - Verify key format and permissions
   - Check if key has expired
   - Ensure proper scopes are granted

2. **"Rate Limit Exceeded"**
   - Check platform-specific rate limits
   - Implement exponential backoff
   - Consider upgrading API tier

3. **"Insufficient Permissions"**
   - Review required scopes for each platform
   - Reauthorize with additional permissions
   - Check if business verification is required

### Debug Mode:

Enable detailed logging:

```bash
LOG_LEVEL=debug
ENABLE_API_LOGGING=true
```

## 📞 Support

For platform-specific API issues:
- **Instagram:** Facebook Developer Support
- **YouTube:** Google Developer Support  
- **Twitter:** Twitter Developer Support
- **LinkedIn:** LinkedIn Developer Support
- **TikTok:** TikTok Developer Community
- **Pinterest:** Pinterest Developer Support
- **Snapchat:** Snapchat Business Support

For service-specific issues, check the application logs and health endpoint.
