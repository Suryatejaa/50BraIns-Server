require('dotenv').config();
const config = require('./src/services/configService');

console.log('🔧 Social Media Service Configuration Test\n');

console.log('✅ Config validation:', config.validateConfig());
console.log('📱 Configured platforms:', config.getConfiguredPlatforms());
console.log('🚀 Features enabled:', config.features);
console.log('📊 Server config:', config.server);
console.log('🐰 RabbitMQ config:', config.rabbitmq.url);

console.log('\n📱 Platform Configuration Status:');
console.log('  Instagram:', config.isInstagramConfigured() ? '✅ Configured' : '❌ Not configured');
console.log('  YouTube:', config.isYouTubeConfigured() ? '✅ Configured' : '❌ Not configured');
console.log('  Twitter:', config.isTwitterConfigured() ? '✅ Configured' : '❌ Not configured');
console.log('  LinkedIn:', config.isLinkedInConfigured() ? '✅ Configured' : '❌ Not configured');
console.log('  TikTok:', config.isTikTokConfigured() ? '✅ Configured' : '❌ Not configured');
console.log('  Pinterest:', config.isPinterestConfigured() ? '✅ Configured' : '❌ Not configured');
console.log('  Snapchat:', config.isSnapchatConfigured() ? '✅ Configured' : '❌ Not configured');

console.log('\n🎯 Ready for API integration! Update .env file with your API keys.');
