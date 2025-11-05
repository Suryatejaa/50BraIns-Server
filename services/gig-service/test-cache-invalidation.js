/**
 * Cache Testing Utility for Gig Service
 * Use this to verify cache invalidation is working correctly
 */

const gigCacheService = require('../src/services/gigCacheService');

class CacheTestUtility {
    constructor() {
        this.testResults = [];
    }

    /**
     * Test cache invalidation for a specific operation
     */
    async testCacheInvalidation(operationName, cacheKeys, testFn) {
        console.log(`\n🧪 Testing cache invalidation for: ${operationName}`);

        try {
            // Check if keys exist before operation
            const beforeKeys = await this.checkCacheKeys(cacheKeys);
            console.log('📊 Cache state before operation:', beforeKeys);

            // Execute the test function (should trigger cache invalidation)
            await testFn();

            // Wait a moment for cache operations to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if keys were invalidated
            const afterKeys = await this.checkCacheKeys(cacheKeys);
            console.log('📊 Cache state after operation:', afterKeys);

            // Analyze results
            const invalidated = this.analyzeInvalidation(beforeKeys, afterKeys);

            this.testResults.push({
                operation: operationName,
                success: invalidated.length > 0,
                invalidatedKeys: invalidated,
                timestamp: new Date().toISOString()
            });

            console.log(`✅ Test completed. Invalidated keys: ${invalidated.length}`);
            return invalidated.length > 0;

        } catch (error) {
            console.error(`❌ Test failed for ${operationName}:`, error.message);
            this.testResults.push({
                operation: operationName,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            return false;
        }
    }

    /**
     * Check if cache keys exist
     */
    async checkCacheKeys(keys) {
        const results = {};

        for (const key of keys) {
            try {
                if (gigCacheService.cacheManager && gigCacheService.cacheManager.redis) {
                    const exists = await gigCacheService.cacheManager.redis.exists(key);
                    results[key] = exists > 0;
                } else {
                    results[key] = 'cache_disabled';
                }
            } catch (error) {
                results[key] = 'error';
            }
        }

        return results;
    }

    /**
     * Analyze which keys were invalidated
     */
    analyzeInvalidation(before, after) {
        const invalidated = [];

        for (const key in before) {
            if (before[key] === true && after[key] === false) {
                invalidated.push(key);
            }
        }

        return invalidated;
    }

    /**
     * Test comprehensive cache invalidation scenarios
     */
    async runComprehensiveTests() {
        console.log('🚀 Starting comprehensive cache invalidation tests...\n');

        // Test 1: Gig cache invalidation
        await this.testCacheInvalidation(
            'Gig Cache Invalidation',
            ['gig:test-gig-id', 'user_gigs:test-user-id:posted', 'search:test'],
            async () => {
                await gigCacheService.invalidateComprehensive({
                    gigId: 'test-gig-id',
                    postedById: 'test-user-id',
                    includeSearch: true
                });
            }
        );

        // Test 2: Application cache invalidation
        await this.testCacheInvalidation(
            'Application Cache Invalidation',
            ['application:test-app-id', 'user_applications:test-user-id:all'],
            async () => {
                await gigCacheService.invalidateApplication('test-app-id', 'test-gig-id', 'test-user-id');
            }
        );

        // Test 3: Pattern invalidation
        await this.testCacheInvalidation(
            'Pattern Invalidation',
            ['user_gigs:test-user:posted', 'user_gigs:test-user:draft'],
            async () => {
                await gigCacheService.invalidatePattern('user_gigs:test-user:*');
            }
        );

        // Test 4: Stats invalidation
        await this.testCacheInvalidation(
            'Stats Cache Invalidation',
            ['stats:daily', 'gig_stats:test-user'],
            async () => {
                await gigCacheService.invalidateStats();
            }
        );

        // Test 5: Search cache invalidation
        await this.testCacheInvalidation(
            'Search Cache Invalidation',
            ['search:category:tech', 'featured_gigs'],
            async () => {
                await gigCacheService.clearSearchCaches();
            }
        );

        this.printTestSummary();
    }

    /**
     * Print test summary
     */
    printTestSummary() {
        console.log('\n📋 TEST SUMMARY');
        console.log('================');

        const total = this.testResults.length;
        const passed = this.testResults.filter(r => r.success).length;
        const failed = total - passed;

        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

        console.log('\nDetailed Results:');
        this.testResults.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${index + 1}. ${status} ${result.operation}`);
            if (result.invalidatedKeys) {
                console.log(`   Invalidated: ${result.invalidatedKeys.length} keys`);
            }
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });
    }

    /**
     * Test cache health and connectivity
     */
    async testCacheHealth() {
        console.log('\n🔍 Testing cache health...');

        try {
            const isEnabled = gigCacheService.isEnabled();
            console.log(`Cache Enabled: ${isEnabled}`);

            if (gigCacheService.cacheManager) {
                const health = await gigCacheService.getHealthStatus();
                console.log('Cache Health:', health);

                const metrics = gigCacheService.getMetrics();
                console.log('Cache Metrics:', metrics);
            }

            return true;
        } catch (error) {
            console.error('❌ Cache health check failed:', error.message);
            return false;
        }
    }

    /**
     * Monitor cache invalidation in real-time
     */
    async monitorCacheInvalidation(duration = 30000) {
        console.log(`\n👀 Monitoring cache invalidation for ${duration}ms...`);
        console.log('Perform operations in the application to see cache invalidation in action.\n');

        const originalInvalidatePattern = gigCacheService.invalidatePattern.bind(gigCacheService);
        const originalInvalidateGig = gigCacheService.invalidateGig.bind(gigCacheService);
        const originalInvalidateApplication = gigCacheService.invalidateApplication.bind(gigCacheService);

        // Intercept invalidation calls
        gigCacheService.invalidatePattern = async (pattern) => {
            console.log(`🗑️  Pattern invalidated: ${pattern}`);
            return await originalInvalidatePattern(pattern);
        };

        gigCacheService.invalidateGig = async (gigId, postedById) => {
            console.log(`🗑️  Gig cache invalidated: ${gigId} (by: ${postedById})`);
            return await originalInvalidateGig(gigId, postedById);
        };

        gigCacheService.invalidateApplication = async (appId, gigId, applicantId) => {
            console.log(`🗑️  Application cache invalidated: ${appId} (gig: ${gigId}, user: ${applicantId})`);
            return await originalInvalidateApplication(appId, gigId, applicantId);
        };

        // Restore original methods after monitoring period
        setTimeout(() => {
            gigCacheService.invalidatePattern = originalInvalidatePattern;
            gigCacheService.invalidateGig = originalInvalidateGig;
            gigCacheService.invalidateApplication = originalInvalidateApplication;
            console.log('\n✅ Cache monitoring completed.');
        }, duration);
    }
}

// Export for use in tests
module.exports = CacheTestUtility;

// CLI usage
if (require.main === module) {
    const tester = new CacheTestUtility();

    async function main() {
        console.log('🔧 Cache Invalidation Test Utility');
        console.log('===================================\n');

        // Check cache health first
        const healthOk = await tester.testCacheHealth();
        if (!healthOk) {
            console.log('❌ Cache is not healthy. Please check Redis connection.');
            process.exit(1);
        }

        // Run comprehensive tests
        await tester.runComprehensiveTests();

        // Optionally monitor in real-time
        const args = process.argv.slice(2);
        if (args.includes('--monitor')) {
            await tester.monitorCacheInvalidation(60000);
        }

        console.log('\n✅ Cache testing completed.');
    }

    main().catch(console.error);
}