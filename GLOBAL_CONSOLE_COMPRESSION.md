# Global Console Compression for Production

This document describes the global console compression utility that reduces console.log output in production environments while preserving important startup logs and all error logs.

## Overview

The `globalConsoleLogger.js` utility provides intelligent console.log compression for production environments. It:

- ✅ **Preserves startup logs** - All logs with startup keywords (🔧, 🚀, ✅, "Starting", "running", etc.)
- ✅ **Compresses method logs** - User actions, OTP generation, JWT secrets, etc. are compressed to single lines
- ✅ **Always shows errors** - `console.error()` output is never suppressed
- ✅ **Environment aware** - Only compresses in `NODE_ENV=production`
- ✅ **Service identification** - Logs include service name and timestamp

## How It Works

### Startup Phase vs. Runtime Phase

1. **Startup Phase** (until `console.markStartupEnd()` is called):
   - All startup-related logs are shown normally
   - Logs with keywords like 🔧, 🚀, ✅, "Starting", "Database", "Port:", etc. are always preserved

2. **Runtime Phase** (after startup ends):
   - Method logs are compressed in production
   - Normal logs continue as usual in development

### Example Output

**Before (Development or all logs in production):**
```
🔧 Starting Auth Service...
✅ Database connected successfully  
🚀 Auth Service running on port 4001
User logged in successfully: john@example.com
OTP generated and stored for user registration: jane@example.com 123456
JWT Secret: super-secret-key-12345
Password changed for user: user123
```

**After (Production with compression):**
```
🔧 Starting Auth Service...
✅ Database connected successfully  
🚀 Auth Service running on port 4001
🔄 [Auth Service] Production logging enabled - method logs compressed
[15:30:45][INFO][Auth Service] User logged in successfully: john@example.com
[15:30:46][INFO][Auth Service] OTP generated and stored for user registration: jane@example...
[15:30:47][INFO][Auth Service] JWT Secret: super-secret-key-12345
[15:30:48][INFO][Auth Service] Password changed for user: user123
```

## Implementation

### 1. Setup in Service Index Files

Add this at the very top of each service's `src/index.js` file:

```javascript
// Setup global console compression (must be early in startup)
const { setupGlobalConsoleCompression } = require('../../../utils/globalConsoleLogger');
setupGlobalConsoleCompression('service-name');
```

### 2. Mark Startup End

In the `app.listen()` callback, add:

```javascript
app.listen(PORT, () => {
    console.log('🚀 Service started successfully');
    logger.info(`Service running on port ${PORT}`);
    
    // Mark end of startup phase for console compression
    console.markStartupEnd('Service Display Name', PORT);
});
```

## Configuration

### Startup Keywords (Always Preserved)
```javascript
const STARTUP_KEYWORDS = [
    '🔧', '🚀', '✅', '❌', '⚠️', '📡', '💾', '🔌', '🌐', '📊', '👋',
    'Starting', 'started', 'running', 'connected', 'listening',
    'initialization', 'Service', 'Gateway', 'Server', 'Port:',
    'Environment:', 'Health:', 'Time:', 'RabbitMQ', 'Database',
    'Redis', 'HTTP server', 'WebSocket', 'API Documentation'
];
```

### Method Log Keywords (Compressed in Production)
```javascript
const METHOD_LOG_KEYWORDS = [
    'User logged in successfully',
    'Password changed for user',
    'Username updated for user',
    'Email updated for user',
    'OTP generated and stored',
    'JWT Secret:',
    'Data from userData:',
    'Registering user with data:',
    'User registered:',
    'Refresh Token Debug:',
    'No refresh token found',
    'Published event to',
    'Event publish failed',
    'Received event:',
    'Handling event:',
    'Processing event:',
    'Event processed successfully',
    'Notification processed',
    'Score updated',
    'Cache invalidated',
    'Sync completed'
];
```

## API Reference

### Main Functions

```javascript
// Setup compression (call once at startup)
const compression = setupGlobalConsoleCompression(serviceName, options);

// Mark end of startup phase
console.markStartupEnd(serviceDisplayName, port);

// Reset for testing
console.resetStartupPhase();

// Restore original console
restoreOriginalConsole();
```

### Utility Functions

```javascript
// Check if in production mode
console.isProductionMode() // returns boolean

// Get service information
console.getServiceInfo() // returns { serviceName, servicePort, isStartupPhase, startupEndMarked }

// Access original console methods
compression.original.log('This bypasses compression');
compression.original.error('Direct error logging');
```

## Services Updated

All services have been updated with the global console compression:

### Core Services
- ✅ **auth-service** (Port 4001)
- ✅ **user-service** (Port 4002)
- ✅ **clan-service** (Port 4003)
- ✅ **gig-service** (Port 4004)
- ✅ **notification-service** (Port 4009)

### Supporting Services  
- ✅ **api-gateway** (Port 3000)
- ✅ **websocket-gateway** (Port 4000)
- ✅ **work-history-service** (Port 4007)
- ✅ **reputation-service** (Port 4008)
- ✅ **credit-service** (Port 4006)
- ✅ **social-media-service** (Port 4005)

## Testing

Run the test script to see compression in action:

```bash
node test-console-compression.js
```

This will show:
1. Normal startup logs (always preserved)
2. Compressed method logs in production mode  
3. Uncompressed logs in development mode
4. Error logs (always preserved)

## Benefits

### Production Benefits
- **Reduced Log Volume**: Method logs are compressed to single lines with timestamps
- **Better Signal-to-Noise**: Important startup and error logs remain prominent
- **Service Identification**: Each log shows which service generated it
- **Preserved Debugging**: All information is still available, just compressed

### Development Benefits
- **Full Logging**: All logs show normally during development
- **Easy Toggle**: Compression only activates in production environment
- **No Code Changes**: Existing console.log statements work unchanged

## Environment Variables

The compression behavior is controlled by:

```bash
# Enable compression (any value other than 'production' disables compression)
NODE_ENV=production

# Optional: Override service detection
SERVICE_NAME=custom-service-name
```

## Best Practices

1. **Use startup keywords** in critical logs: 🔧, 🚀, ✅, "Starting", "connected"
2. **Call markStartupEnd()** as soon as HTTP server starts listening
3. **Use logger.error()** for important errors that should never be compressed
4. **Test in production mode** to verify compression works as expected
5. **Keep startup logs informative** since they're always preserved

## Troubleshooting

### Logs Not Compressing
- Verify `NODE_ENV=production` is set
- Check that `markStartupEnd()` was called
- Ensure logs don't contain startup keywords

### Important Logs Being Compressed
- Add startup keywords (🔧, 🚀, etc.) to preserve them
- Use `console.error()` for critical errors
- Call `compression.original.log()` to bypass compression

### Service Name Not Showing
- Check the serviceName parameter in `setupGlobalConsoleCompression()`
- Verify package.json name field if auto-detection is used

## Future Enhancements

Potential improvements for the compression utility:

1. **Log Levels**: Support different compression levels (minimal, moderate, full)
2. **Custom Keywords**: Allow services to define their own preservation keywords
3. **Log Sampling**: Sample and show every Nth compressed log for monitoring
4. **Remote Logging**: Send compressed logs to centralized logging service
5. **Performance Metrics**: Track compression ratios and performance impact