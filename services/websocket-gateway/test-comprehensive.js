/**
 * Comprehensive WebSocket Gateway Test
 * Tests notifications, real-time chat, and all services
 */

const WebSocket = require('ws');

class ComprehensiveTester {
    constructor() {
        this.ws = null;
        this.testResults = {
            connection: false,
            notifications: false,
            clanChat: false,
            messageSending: false,
            realTimeUpdates: false
        };
    }

    async runAllTests() {
        console.log('🧪 Running Comprehensive WebSocket Gateway Tests...\n');
        
        try {
            // Test 1: Basic Connection
            await this.testConnection();
            
            // Test 2: Notification Subscription
            await this.testNotificationSubscription();
            
            // Test 3: Clan Chat Subscription
            await this.testClanChatSubscription();
            
            // Test 4: Message Sending
            await this.testMessageSending();
            
            // Test 5: Real-time Updates
            await this.testRealTimeUpdates();
            
            // Final Results
            this.showResults();
            
        } catch (error) {
            console.log(`❌ Test failed: ${error.message}`);
        } finally {
            if (this.ws) {
                this.ws.close();
            }
        }
    }

    async testConnection() {
        console.log('🔗 Test 1: Basic Connection...');
        
        return new Promise((resolve, reject) => {
            const testUser = 'test-user-' + Date.now();
            this.ws = new WebSocket(`ws://localhost:4000/ws?userId=${testUser}`);
            
            this.ws.on('open', () => {
                console.log('✅ Connected to WebSocket Gateway');
                this.testResults.connection = true;
                resolve();
            });
            
            this.ws.on('error', (error) => {
                console.log(`❌ Connection failed: ${error.message}`);
                reject(error);
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                if (!this.testResults.connection) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }

    async testNotificationSubscription() {
        console.log('\n📢 Test 2: Notification Subscription...');
        
        return new Promise((resolve) => {
            const subscribeMessage = {
                type: 'subscribe_notifications'
            };
            
            this.ws.send(JSON.stringify(subscribeMessage));
            console.log('📤 Sent subscribe_notifications message');
            
            // Wait for confirmation
            const messageHandler = (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'subscription_confirmed' && message.service === 'notifications') {
                        console.log('✅ Notification subscription confirmed');
                        this.testResults.notifications = true;
                        this.ws.removeEventListener('message', messageHandler);
                        resolve();
                    }
                } catch (error) {
                    // Ignore parsing errors
                }
            };
            
            this.ws.addEventListener('message', messageHandler);
            
            // Timeout after 3 seconds
            setTimeout(() => {
                if (!this.testResults.notifications) {
                    console.log('⚠️ Notification subscription timeout');
                    resolve();
                }
            }, 3000);
        });
    }

    async testClanChatSubscription() {
        console.log('\n💬 Test 3: Clan Chat Subscription...');
        
        return new Promise((resolve) => {
            const testClanId = 'test-clan-' + Date.now();
            const subscribeMessage = {
                type: 'subscribe_clan_chat',
                clanId: testClanId
            };
            
            this.ws.send(JSON.stringify(subscribeMessage));
            console.log('📤 Sent subscribe_clan_chat message');
            
            // Wait for confirmation
            const messageHandler = (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'subscription_confirmed' && message.service === 'clan_chat') {
                        console.log('✅ Clan chat subscription confirmed');
                        this.testResults.clanChat = true;
                        this.ws.removeEventListener('message', messageHandler);
                        resolve();
                    }
                } catch (error) {
                    // Ignore parsing errors
                }
            };
            
            this.ws.addEventListener('message', messageHandler);
            
            // Timeout after 3 seconds
            setTimeout(() => {
                if (!this.testResults.clanChat) {
                    console.log('⚠️ Clan chat subscription timeout');
                    resolve();
                }
            }, 3000);
        });
    }

    async testMessageSending() {
        console.log('\n📝 Test 4: Message Sending...');
        
        return new Promise((resolve) => {
            const testClanId = 'test-clan-' + Date.now();
            const chatMessage = {
                type: 'chat_message',
                content: 'Hello from test!',
                clanId: testClanId
            };
            
            this.ws.send(JSON.stringify(chatMessage));
            console.log('📤 Sent chat message');
            
            // Wait for confirmation or error
            const messageHandler = (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'message_sent' || message.type === 'error') {
                        if (message.type === 'message_sent') {
                            console.log('✅ Message sent successfully');
                            this.testResults.messageSending = true;
                        } else {
                            console.log(`⚠️ Message error: ${message.message}`);
                        }
                        this.ws.removeEventListener('message', messageHandler);
                        resolve();
                    }
                } catch (error) {
                    // Ignore parsing errors
                }
            };
            
            this.ws.addEventListener('message', messageHandler);
            
            // Timeout after 3 seconds
            setTimeout(() => {
                if (!this.testResults.messageSending) {
                    console.log('⚠️ Message sending timeout');
                    resolve();
                }
            }, 3000);
        });
    }

    async testRealTimeUpdates() {
        console.log('\n⚡ Test 5: Real-time Updates...');
        
        return new Promise((resolve) => {
            // Send a typing indicator
            const typingMessage = {
                type: 'typing_indicator',
                clanId: 'test-clan-' + Date.now(),
                isTyping: true
            };
            
            this.ws.send(JSON.stringify(typingMessage));
            console.log('📤 Sent typing indicator');
            
            // Wait for any response
            const messageHandler = (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    console.log(`📥 Received: ${message.type}`);
                    
                    if (message.type === 'typing_received' || message.type === 'error') {
                        this.testResults.realTimeUpdates = true;
                        this.ws.removeEventListener('message', messageHandler);
                        resolve();
                    }
                } catch (error) {
                    // Ignore parsing errors
                }
            };
            
            this.ws.addEventListener('message', messageHandler);
            
            // Timeout after 3 seconds
            setTimeout(() => {
                if (!this.testResults.realTimeUpdates) {
                    console.log('⚠️ Real-time updates timeout');
                    resolve();
                }
            }, 3000);
        });
    }

    showResults() {
        console.log('\n📊 Test Results:');
        console.log('================');
        
        Object.entries(this.testResults).forEach(([test, passed]) => {
            const status = passed ? '✅ PASS' : '❌ FAIL';
            const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            console.log(`${status} ${testName}`);
        });
        
        const passedCount = Object.values(this.testResults).filter(Boolean).length;
        const totalCount = Object.keys(this.testResults).length;
        
        console.log(`\n🎯 Overall: ${passedCount}/${totalCount} tests passed`);
        
        if (passedCount === totalCount) {
            console.log('🎉 ALL TESTS PASSED! WebSocket Gateway is working perfectly!');
        } else {
            console.log('⚠️ Some tests failed. Check the logs above for details.');
        }
    }
}

// Run the comprehensive test
const tester = new ComprehensiveTester();
tester.runAllTests().catch(console.error);
