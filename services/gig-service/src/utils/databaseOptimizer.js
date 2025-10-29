// Database optimization utilities
const { Transform } = require('stream');

class DatabaseOptimizer {
    /**
     * Create optimized query with reduced field selection
     */
    static optimizeApplicationQuery(baseQuery) {
        return {
            ...baseQuery,
            select: {
                // Only essential fields for list views
                id: true,
                gigId: true,
                applicantType: true,
                quotedPrice: true,
                status: true,
                appliedAt: true,
                respondedAt: true,
                gig: {
                    select: {
                        id: true,
                        title: true,
                        budgetMin: true,
                        budgetMax: true,
                        status: true,
                        deadline: true
                    }
                }
            }
        };
    }

    /**
     * Create optimized work history query
     */
    static optimizeWorkHistoryQuery(baseQuery) {
        return {
            ...baseQuery,
            select: {
                // Core fields only
                id: true,
                applicationId: true,
                gigId: true,
                applicationStatus: true,
                submissionStatus: true,
                paymentStatus: true,
                paymentAmount: true,
                lastActivityAt: true,
                createdAt: true
            },
            orderBy: { lastActivityAt: 'desc' } // More efficient than appliedAt
        };
    }

    /**
     * Optimize count queries by avoiding complex joins
     */
    static optimizeCountQuery(where) {
        // Strip out complex nested conditions for count queries
        const { gig, ...simpleWhere } = where;
        return simpleWhere;
    }

    /**
     * Create streaming JSON response for large datasets
     */
    static createStreamingResponse(res, data, pagination = null) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');

        let first = true;
        res.write('{"success":true,"data":[');

        for (const item of data) {
            if (!first) res.write(',');
            res.write(JSON.stringify(item));
            first = false;
        }

        res.write(']');

        if (pagination) {
            res.write(',"pagination":' + JSON.stringify(pagination));
        }

        res.write('}');
        res.end();
    }

    /**
     * Add database performance monitoring
     */
    static createPerformanceMonitor() {
        return (target, propertyName, descriptor) => {
            const method = descriptor.value;
            descriptor.value = async function (...args) {
                const start = process.hrtime.bigint();
                try {
                    const result = await method.apply(this, args);
                    const end = process.hrtime.bigint();
                    const duration = Number(end - start) / 1000000; // Convert to ms

                    if (duration > 500) { // Log slow queries
                        console.warn(`🐌 Slow query detected - ${propertyName}: ${duration.toFixed(2)}ms`);
                    }

                    return result;
                } catch (error) {
                    const end = process.hrtime.bigint();
                    const duration = Number(end - start) / 1000000;
                    console.error(`❌ Query failed - ${propertyName}: ${duration.toFixed(2)}ms`, error.message);
                    throw error;
                }
            };
        };
    }
}

module.exports = DatabaseOptimizer;