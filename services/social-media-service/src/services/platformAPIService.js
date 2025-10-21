const axios = require('axios');

class PlatformAPIService {
    constructor() {
        this.apis = {
            instagram: {
                baseUrl: 'https://graph.instagram.com',
                requiresAuth: true
            },
            youtube: {
                baseUrl: 'https://www.googleapis.com/youtube/v3',
                requiresAuth: true
            },
            twitter: {
                baseUrl: 'https://api.twitter.com/2',
                requiresAuth: true
            },
            linkedin: {
                baseUrl: 'https://api.linkedin.com/v2',
                requiresAuth: true
            },
            tiktok: {
                baseUrl: 'https://open-api.tiktok.com',
                requiresAuth: true
            },
            pinterest: {
                baseUrl: 'https://api.pinterest.com/v5',
                requiresAuth: true
            },
            snapchat: {
                baseUrl: 'https://adsapi.snapchat.com',
                requiresAuth: true
            }
        };
    }

    // Instagram Graph API integration
    async fetchInstagramStats(username, accessToken = null) {
        const token = accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;

        if (!token) {
            // For MVP, return mock data if no token
            return this.getMockData('instagram');
        }

        try {
            // Get user ID first
            const userResponse = await axios.get(`${this.apis.instagram.baseUrl}/me`, {
                params: {
                    fields: 'id,username',
                    access_token: token
                }
            });

            // Get account info
            const accountResponse = await axios.get(`${this.apis.instagram.baseUrl}/${userResponse.data.id}`, {
                params: {
                    fields: 'account_type,media_count,followers_count,follows_count',
                    access_token: token
                }
            });

            return {
                followers: accountResponse.data.followers_count,
                following: accountResponse.data.follows_count,
                posts: accountResponse.data.media_count,
                engagement: await this.calculateInstagramEngagement(userResponse.data.id, token)
            };
        } catch (error) {
            console.error('Instagram API error:', error.response?.data || error.message);
            return this.getMockData('instagram');
        }
    }

    // YouTube Data API integration
    async fetchYouTubeStats(channelId, apiKey = null) {
        const key = apiKey || process.env.YOUTUBE_API_KEY;

        if (!key) {
            return this.getMockData('youtube');
        }

        try {
            const response = await axios.get(`${this.apis.youtube.baseUrl}/channels`, {
                params: {
                    part: 'statistics,snippet',
                    id: channelId,
                    key: key
                }
            });

            const stats = response.data.items[0]?.statistics;
            if (!stats) throw new Error('Channel not found');

            return {
                followers: parseInt(stats.subscriberCount || 0),
                following: 0, // YouTube doesn't have following
                posts: parseInt(stats.videoCount || 0),
                engagement: await this.calculateYouTubeEngagement(channelId, key),
                platformMetrics: {
                    totalViews: parseInt(stats.viewCount || 0),
                    subscribers: parseInt(stats.subscriberCount || 0)
                }
            };
        } catch (error) {
            console.error('YouTube API error:', error.response?.data || error.message);
            return this.getMockData('youtube');
        }
    }

    // Twitter API v2 integration
    async fetchTwitterStats(username, bearerToken = null) {
        const token = bearerToken || process.env.TWITTER_BEARER_TOKEN;

        if (!token) {
            return this.getMockData('twitter');
        }

        try {
            const response = await axios.get(`${this.apis.twitter.baseUrl}/users/by/username/${username}`, {
                params: {
                    'user.fields': 'public_metrics,verified'
                },
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const metrics = response.data.data.public_metrics;

            return {
                followers: metrics.followers_count,
                following: metrics.following_count,
                posts: metrics.tweet_count,
                engagement: await this.calculateTwitterEngagement(username, token),
                platformMetrics: {
                    likes: metrics.like_count,
                    verified: response.data.data.verified
                }
            };
        } catch (error) {
            console.error('Twitter API error:', error.response?.data || error.message);
            return this.getMockData('twitter');
        }
    }

    // LinkedIn API integration
    async fetchLinkedInStats(profileId, accessToken = null) {
        const token = accessToken || process.env.LINKEDIN_ACCESS_TOKEN;

        if (!token) {
            return this.getMockData('linkedin');
        }

        try {
            // LinkedIn API calls would go here
            // Note: LinkedIn has limited API access for follower counts
            return this.getMockData('linkedin');
        } catch (error) {
            console.error('LinkedIn API error:', error.response?.data || error.message);
            return this.getMockData('linkedin');
        }
    }

    // TikTok API integration
    async fetchTikTokStats(username, accessToken = null) {
        const token = accessToken || process.env.TIKTOK_ACCESS_TOKEN;

        if (!token) {
            return this.getMockData('tiktok');
        }

        try {
            // TikTok API calls would go here
            return this.getMockData('tiktok');
        } catch (error) {
            console.error('TikTok API error:', error.response?.data || error.message);
            return this.getMockData('tiktok');
        }
    }

    // Calculate engagement rates (simplified for MVP)
    async calculateInstagramEngagement(userId, accessToken) {
        try {
            // Get recent media
            const mediaResponse = await axios.get(`${this.apis.instagram.baseUrl}/${userId}/media`, {
                params: {
                    fields: 'like_count,comments_count',
                    limit: 12,
                    access_token: accessToken
                }
            });

            const media = mediaResponse.data.data;
            if (!media.length) return 0;

            const totalEngagement = media.reduce((sum, post) =>
                sum + (post.like_count || 0) + (post.comments_count || 0), 0);

            // Simple engagement rate calculation
            return (totalEngagement / media.length) / 1000; // Normalize
        } catch (error) {
            return Math.random() * 5 + 1; // Mock engagement rate
        }
    }

    async calculateYouTubeEngagement(channelId, apiKey) {
        // For MVP, return mock engagement
        return Math.random() * 10 + 2;
    }

    async calculateTwitterEngagement(username, bearerToken) {
        // For MVP, return mock engagement
        return Math.random() * 3 + 0.5;
    }

    // Check if real API calls are enabled
    shouldUseRealAPI() {
        return process.env.ENABLE_REAL_API_CALLS === 'true';
    }

    // Get API rate limits from environment
    getRateLimits() {
        return {
            requests: parseInt(process.env.API_RATE_LIMIT_REQUESTS) || 100,
            window: parseInt(process.env.API_RATE_LIMIT_WINDOW) || 60000
        };
    }

    // Mock data for testing/MVP
    getMockData(platform) {
        const mockData = {
            instagram: {
                followers: Math.floor(Math.random() * 50000) + 1000,
                following: Math.floor(Math.random() * 2000) + 100,
                posts: Math.floor(Math.random() * 500) + 50,
                engagement: Math.random() * 10 + 1,
                platformMetrics: {
                    reels: Math.floor(Math.random() * 100),
                    stories: Math.floor(Math.random() * 200),
                    avgLikes: Math.floor(Math.random() * 1000) + 50
                }
            },
            youtube: {
                followers: Math.floor(Math.random() * 100000) + 500,
                following: 0,
                posts: Math.floor(Math.random() * 200) + 10,
                engagement: Math.random() * 15 + 2,
                platformMetrics: {
                    subscribers: Math.floor(Math.random() * 100000) + 500,
                    videos: Math.floor(Math.random() * 200) + 10,
                    totalViews: Math.floor(Math.random() * 1000000) + 10000
                }
            },
            twitter: {
                followers: Math.floor(Math.random() * 20000) + 200,
                following: Math.floor(Math.random() * 1000) + 50,
                posts: Math.floor(Math.random() * 2000) + 100,
                engagement: Math.random() * 5 + 0.5,
                platformMetrics: {
                    tweets: Math.floor(Math.random() * 2000) + 100,
                    likes: Math.floor(Math.random() * 10000) + 500,
                    retweets: Math.floor(Math.random() * 1000) + 50
                }
            },
            linkedin: {
                followers: Math.floor(Math.random() * 10000) + 500,
                following: Math.floor(Math.random() * 1000) + 100,
                posts: Math.floor(Math.random() * 100) + 20,
                engagement: Math.random() * 8 + 1,
                platformMetrics: {
                    connections: Math.floor(Math.random() * 500) + 100,
                    posts: Math.floor(Math.random() * 100) + 20
                }
            },
            tiktok: {
                followers: Math.floor(Math.random() * 100000) + 1000,
                following: Math.floor(Math.random() * 500) + 50,
                posts: Math.floor(Math.random() * 200) + 30,
                engagement: Math.random() * 20 + 5,
                platformMetrics: {
                    likes: Math.floor(Math.random() * 500000) + 10000,
                    views: Math.floor(Math.random() * 1000000) + 50000
                }
            }
        };

        return mockData[platform] || mockData.instagram;
    }

    // Validate platform credentials
    async validateCredentials(platform, credentials) {
        try {
            switch (platform) {
                case 'instagram':
                    return await this.validateInstagramToken(credentials.accessToken);
                case 'youtube':
                    return await this.validateYouTubeKey(credentials.apiKey);
                case 'twitter':
                    return await this.validateTwitterToken(credentials.bearerToken);
                default:
                    return false;
            }
        } catch (error) {
            return false;
        }
    }

    async validateInstagramToken(accessToken) {
        const token = accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
        if (!token) return false;

        try {
            await axios.get(`${this.apis.instagram.baseUrl}/me`, {
                params: { access_token: token }
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    async validateYouTubeKey(apiKey) {
        const key = apiKey || process.env.YOUTUBE_API_KEY;
        if (!key) return false;

        try {
            await axios.get(`${this.apis.youtube.baseUrl}/search`, {
                params: { part: 'snippet', q: 'test', key: key, maxResults: 1 }
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    async validateTwitterToken(bearerToken) {
        const token = bearerToken || process.env.TWITTER_BEARER_TOKEN;
        if (!token) return false;

        try {
            await axios.get(`${this.apis.twitter.baseUrl}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = new PlatformAPIService();
