const axios = require('axios');

class ExternalService {
    constructor() {
        this.services = {
            user: process.env.USER_SERVICE_URL || 'http://localhost:4002',
            gig: process.env.GIG_SERVICE_URL || 'http://localhost:4004',
            clan: process.env.CLAN_SERVICE_URL || 'http://localhost:4003'
        };

        // Set default timeout
        this.timeout = 30000; // 30 seconds
    }

    // User Service Integration
    async boostUserProfile(userId, duration = 48) {
        try {
            const response = await axios.post(
                `${this.services.user}/user/${userId}/boost`,
                {
                    duration,
                    type: 'profile',
                    source: 'credit-service'
                },
                {
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-service': 'credit-service'
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('User service boost failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message,
                service: 'user-service'
            };
        }
    }

    async removeUserBoost(userId) {
        try {
            const response = await axios.delete(
                `${this.services.user}/user/${userId}/boost`,
                {
                    timeout: this.timeout,
                    headers: {
                        'x-service': 'credit-service'
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('User service boost removal failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message,
                service: 'user-service'
            };
        }
    }

    // Gig Service Integration
    async boostGig(gigId, duration = 24) {
        try {
            const response = await axios.post(
                `${this.services.gig}/gigs/${gigId}/boost`,
                {
                    duration,
                    type: 'visibility',
                    source: 'credit-service'
                },
                {
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-service': 'credit-service'
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Gig service boost failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message,
                service: 'gig-service'
            };
        }
    }

    async removeGigBoost(gigId) {
        try {
            const response = await axios.delete(
                `${this.services.gig}/gigs/${gigId}/boost`,
                {
                    timeout: this.timeout,
                    headers: {
                        'x-service': 'credit-service'
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Gig service boost removal failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message,
                service: 'gig-service'
            };
        }
    }

    async getGigDetails(gigId) {
        try {
            const response = await axios.get(
                `${this.services.gig}/gigs/${gigId}`,
                {
                    timeout: this.timeout,
                    headers: {
                        'x-service': 'credit-service'
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Gig details fetch failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message,
                service: 'gig-service'
            };
        }
    }

    // Clan Service Integration
    async boostClan(clanId, duration = 48) {
        try {
            const response = await axios.post(
                `${this.services.clan}/clan/${clanId}/boost`,
                {
                    duration,
                    type: 'visibility',
                    source: 'credit-service'
                },
                {
                    timeout: this.timeout,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-service': 'credit-service'
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Clan service boost failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message,
                service: 'clan-service'
            };
        }
    }

    async removeClanBoost(clanId) {
        try {
            const response = await axios.delete(
                `${this.services.clan}/clan/${clanId}/boost`,
                {
                    timeout: this.timeout,
                    headers: {
                        'x-service': 'credit-service'
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Clan service boost removal failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message,
                service: 'clan-service'
            };
        }
    }

    async getClanDetails(clanId) {
        try {
            const response = await axios.get(
                `${this.services.clan}/clan/${clanId}`,
                {
                    timeout: this.timeout,
                    headers: {
                        'x-service': 'credit-service'
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('Clan details fetch failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.error || error.message,
                service: 'clan-service'
            };
        }
    }

    // Health checks for external services
    async healthCheck() {
        const checks = {};

        for (const [serviceName, serviceUrl] of Object.entries(this.services)) {
            try {
                const response = await axios.get(`${serviceUrl}/health`, {
                    timeout: 5000 // 5 seconds for health checks
                });

                checks[serviceName] = {
                    status: 'healthy',
                    url: serviceUrl,
                    responseTime: response.headers['x-response-time'] || 'unknown'
                };
            } catch (error) {
                checks[serviceName] = {
                    status: 'unhealthy',
                    url: serviceUrl,
                    error: error.message
                };
            }
        }

        return checks;
    }

    // Utility method to check if a service is available
    async isServiceAvailable(serviceName) {
        if (!this.services[serviceName]) {
            return false;
        }

        try {
            await axios.get(`${this.services[serviceName]}/health`, {
                timeout: 5000
            });
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Create singleton instance
const externalService = new ExternalService();

module.exports = externalService;
