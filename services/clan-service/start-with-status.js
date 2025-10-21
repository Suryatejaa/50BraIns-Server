/**
 * Startup script demonstrating new message status functionality
 * Run with: node start-with-status.js
 */

const { WebSocketService } = require('./src/services/websocket.service');
const messageService = require('./src/services/message.service');
const logger = require('./src/utils/logger');

async function startClanService() {
    console.log('🚀 Starting Clan Service with Message Status Features...\n');

    try {
        // Create HTTP server
        const http = require('http');
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Clan Service with Message Status - Running!\n');
        });

        // Initialize WebSocket service
        const wsService = new WebSocketService();
        wsService.initialize(server);

        // Start server
        const PORT = process.env.PORT || 4003;
        server.listen(PORT, () => {
            console.log(`✅ Clan Service started on port ${PORT}`);
            console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}/ws`);
            console.log(`🌐 HTTP endpoint: http://localhost:${PORT}`);
        });

        // Log connection statistics every 10 seconds
        setInterval(() => {
            const stats = wsService.getStats();
            console.log('📊 Connection Stats:', {
                total: stats.totalConnections,
                active: stats.activeConnections,
                clans: stats.clans.length,
                users: stats.users.length
            });
        }, 10000);

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down gracefully...');
            wsService.close();
            server.close(() => {
                console.log('✅ Server closed');
                process.exit(0);
            });
        });

        console.log('\n🎯 New Features Available:');
        console.log('   • Message delivery status tracking');
        console.log('   • Read receipts with timestamps');
        console.log('   • Soft message deletion');
        console.log('   • Real-time status updates');
        console.log('   • Bulk operations support');
        console.log('   • Comprehensive message statistics');

        console.log('\n🔧 Test the functionality:');
        console.log('   1. Open test-websocket.html in browser');
        console.log('   2. Connect to a clan chat');
        console.log('   3. Send messages and watch status updates');
        console.log('   4. Check delivery confirmations and read receipts');
        console.log('   5. Try deleting messages');

        console.log('\n📚 Documentation: MESSAGE_STATUS_FEATURES.md');
        console.log('🧪 Test Script: test-message-status.js');

    } catch (error) {
        console.error('❌ Failed to start service:', error);
        process.exit(1);
    }
}

// Start the service
startClanService().catch(console.error);
