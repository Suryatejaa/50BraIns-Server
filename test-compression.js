const http = require('http');

// Test compression effectiveness
async function testCompression() {
    console.log('🧪 Testing compression effectiveness...\n');

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 4005,
            path: '/test/large-response',
            method: 'GET',
            headers: {
                'Accept-Encoding': 'gzip'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            let chunks = [];

            res.on('data', (chunk) => {
                chunks.push(chunk);
                data += chunk;
            });

            res.on('end', () => {
                const totalSize = Buffer.concat(chunks).length;
                const originalSize = res.headers['x-data-size'];
                const compressionUsed = res.headers['content-encoding'];

                console.log('📊 Compression Test Results:');
                console.log(`   Original Size: ${originalSize}`);
                console.log(`   Compressed Size: ${totalSize} bytes`);
                console.log(`   Content-Encoding: ${compressionUsed || 'none'}`);
                console.log(`   Response Time: ${res.headers['x-response-time']}`);

                if (originalSize) {
                    const original = parseInt(originalSize.replace(' bytes', ''));
                    const ratio = Math.round((1 - (totalSize / original)) * 100);
                    console.log(`   Compression Ratio: ${ratio}% reduction`);

                    if (ratio >= 60) {
                        console.log('   ✅ Excellent compression! Target achieved.');
                    } else {
                        console.log('   ⚠️  Compression could be better.');
                    }
                }

                resolve();
            });
        });

        req.on('error', (err) => {
            console.error('❌ Error testing compression:', err.message);
            reject(err);
        });

        req.end();
    });
}

// Test without compression for comparison
async function testNoCompression() {
    console.log('\n📊 Testing without compression for comparison...\n');

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 4005,
            path: '/test/no-compression',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let chunks = [];

            res.on('data', (chunk) => {
                chunks.push(chunk);
            });

            res.on('end', () => {
                const totalSize = Buffer.concat(chunks).length;
                console.log('📊 No Compression Test:');
                console.log(`   Response Size: ${totalSize} bytes`);
                console.log(`   Content-Encoding: ${res.headers['content-encoding'] || 'none'}`);
                resolve();
            });
        });

        req.on('error', (err) => {
            console.error('❌ Error testing no compression:', err.message);
            reject(err);
        });

        req.end();
    });
}

async function runTests() {
    try {
        await testCompression();
        await testNoCompression();

        console.log('\n🎯 Summary:');
        console.log('   Our compression middleware is now optimized for:');
        console.log('   • Level 6 compression (balanced speed/ratio)');
        console.log('   • 1KB threshold (compress responses > 1KB)');
        console.log('   • 16KB chunk size (optimal for most responses)');
        console.log('   • Target: 60-80% size reduction for large responses');

        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

runTests();