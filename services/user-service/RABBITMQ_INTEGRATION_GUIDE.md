# RabbitMQ Integration Guide for User Service

## Overview

The user service now has a proper RabbitMQ integration that follows the microservices pattern where each service has its own exchange and topics.

## Architecture

### Exchanges

1. **`brains_events`** - Auth service exchange (shared)
   - Used by auth service to publish user events
   - User service listens to this for cross-service events

2. **`user_events`** - User service exchange (dedicated)
   - Used by user service to publish its own events
   - Other services can listen to this for user-related events

### Routing Keys

#### Auth Service → User Service (via `brains_events`)
- `user.registered` - When a new user registers
- `user.updated` - When user profile is updated
- `user.deleted` - When user is deleted

#### User Service → Other Services (via `user_events`)
- `user.profile.created` - When user profile is created
- `user.profile.updated` - When user profile is updated
- `user.profile.deleted` - When user profile is deleted

## Components

### 1. AuthEventConsumer (`src/services/authEventConsumer.js`)
- Listens to `brains_events` exchange
- Processes auth service events
- Creates user profiles when users register

### 2. RabbitMQService (`src/services/rabbitmqService.js`)
- Manages `user_events` exchange
- Publishes user service events
- Handles user service-specific queue

### 3. EventHandlerService (`src/services/eventHandler.service.js`)
- Processes events and triggers appropriate actions
- Creates user profiles, updates, etc.

### 4. SyncService (`src/services/sync.service.js`)
- Handles user data synchronization
- Creates user profiles and analytics

## Flow

1. **User Registration**:
   ```
   Auth Service → publishes `user.registered` to `brains_events`
   ↓
   User Service → receives event via AuthEventConsumer
   ↓
   EventHandlerService → processes event
   ↓
   SyncService → creates user profile and analytics
   ```

2. **User Profile Updates**:
   ```
   Auth Service → publishes `user.updated` to `brains_events`
   ↓
   User Service → receives event and syncs data
   ```

## Testing

Run the test script to verify RabbitMQ integration:
```bash
node test-rabbitmq-integration.js
```

## Environment Variables

```bash
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
RABBITMQ_EXCHANGE=user_events
RABBITMQ_QUEUE=user_service_queue
NODE_ENV=development
```

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check if RabbitMQ is running in Docker
2. **Exchange Not Found**: Ensure exchanges are created by services
3. **Queue Binding Failed**: Check routing key patterns

### Debug Commands

```bash
# Check RabbitMQ status
docker ps | grep rabbitmq

# View RabbitMQ logs
docker logs <rabbitmq-container-id>

# Test connection
node test-rabbitmq-integration.js
```

## Development Mode

In development mode (`NODE_ENV=development`):
- RabbitMQ connection failures won't crash the service
- Events will be logged but not processed if RabbitMQ is unavailable
- Service continues to run for local development

## Production Mode

In production mode:
- RabbitMQ connection failures trigger reconnection attempts
- Service may fail to start if RabbitMQ is unavailable
- All events are processed and acknowledged
