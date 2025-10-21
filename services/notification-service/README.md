# 📬 Notification Service - The Heartbeat of User Engagement

## 🎯 Purpose

The **Notification Service** is the central communication hub for the 50BraIns platform, responsible for:

- **📱 In-app notifications** stored in the database
- **📧 Email notifications** via SMTP with beautiful templates  
- **🔔 Real-time alerts** for user actions and system events
- **📊 Engagement tracking** and analytics
- **⚙️ User preferences** management

---

## 🏗️ Architecture

```
notification-service/
├── src/
│   ├── controllers/          # REST API controllers
│   │   ├── notificationController.js
│   │   └── adminController.js
│   ├── consumers/            # RabbitMQ event consumers
│   │   └── notificationConsumer.js
│   ├── mailers/              # Email templates
│   │   └── templates/        # Handlebars templates
│   ├── routes/               # Express routes
│   │   ├── notificationRoutes.js
│   │   └── adminRoutes.js
│   └── utils/                # Utilities
│       ├── logger.js
│       ├── rabbitmq.js
│       ├── emailService.js
│       └── errorHandler.js
├── prisma/
│   └── schema.prisma         # Database schema
├── logs/                     # Application logs
├── .env                      # Environment variables
├── package.json
└── index.js                  # Main server file
```

---

## 🗄️ Database Schema

### Core Models:

- **`Notification`** - Main notification records
- **`EmailTemplate`** - Reusable email templates  
- **`NotificationPreference`** - User notification settings
- **`NotificationLog`** - Delivery tracking and analytics

### Key Features:

- ✅ **Comprehensive tracking** (sent, read, opened, clicked)
- ✅ **Priority levels** (LOW, MEDIUM, HIGH, URGENT)
- ✅ **Multiple channels** (IN_APP, EMAIL, PUSH, SMS)
- ✅ **Rich metadata** support for context
- ✅ **Retry logic** with configurable limits
- ✅ **Scheduled notifications** support

---

## 🔗 Integration Points

### Event Consumers (RabbitMQ):

| Event | Source Service | Triggers |
|-------|---------------|----------|
| `GIG_APPLIED` | gig-service | Email + In-app notification |
| `GIG_COMPLETED` | gig-service | Congratulations notification |
| `CLAN_INVITED` | clan-service | Invitation email + notification |
| `CREDITS_BOUGHT` | credit-service | Purchase confirmation |
| `BOOST_EXPIRING` | credit-service | Renewal reminder |
| `REPUTATION_UPDATED` | reputation-service | Level up notification |
| `USER_REGISTERED` | auth-service | Welcome email sequence |

### External APIs:

- **SMTP Service** for email delivery
- **User Service** for user data
- **Redis** for job queues (optional)

---

## 📚 API Endpoints

### User Endpoints:
```http
GET    /notifications/:userId              # Get user notifications
GET    /notifications/unread/:userId       # Get unread notifications  
GET    /notifications/count/:userId        # Get notification counts
PATCH  /notifications/mark-read/:id        # Mark as read
PATCH  /notifications/mark-all-read/:userId # Mark all as read
DELETE /notifications/:id                  # Delete notification
GET    /notifications/preferences/:userId  # Get preferences
PUT    /notifications/preferences/:userId  # Update preferences
```

### Admin Endpoints:
```http
GET    /admin/stats                        # Statistics dashboard
GET    /admin/analytics                    # Advanced analytics
POST   /admin/broadcast                    # Send broadcast
GET    /admin/templates                    # Email templates
POST   /admin/templates                    # Create template
GET    /admin/health-detailed              # System health
```

---

## 🚀 Getting Started

### 1. **Environment Setup**

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/brains_notifications

# SMTP Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@50brains.com
SMTP_PASS=your_app_password

# RabbitMQ
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# Features
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_IN_APP_NOTIFICATIONS=true
```

### 2. **Database Setup**

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed with sample data
npm run prisma:seed
```

### 3. **Start Service**

```bash
# Development
npm run dev

# Production
npm start
```

### 4. **Health Check**

```bash
curl http://localhost:4009/health
```

---

## 📧 Email Templates

The service includes beautiful, responsive email templates:

- **🎯 Gig Applied** - Application confirmation
- **🏆 Clan Invited** - Clan invitation  
- **💰 Credits Purchased** - Purchase confirmation
- **⚡ Boost Expiring** - Renewal reminder
- **🎉 Welcome** - New user onboarding

### Custom Templates:

Templates are written in **Handlebars** and support:
- ✅ Dynamic variables
- ✅ Responsive design
- ✅ Brand styling
- ✅ Multiple languages
- ✅ Preview functionality

---

## 🔧 Configuration

### Email Settings:
```env
SMTP_HOST=smtp.gmail.com        # Email server
SMTP_PORT=587                   # SMTP port
FROM_EMAIL=noreply@50brains.com # Sender address
FROM_NAME=50BraIns Platform     # Sender name
```

### Feature Flags:
```env
ENABLE_EMAIL_NOTIFICATIONS=true    # Email sending
ENABLE_IN_APP_NOTIFICATIONS=true   # Database notifications
ENABLE_PUSH_NOTIFICATIONS=false    # Push notifications (future)
ENABLE_SMS_NOTIFICATIONS=false     # SMS notifications (future)
```

### Rate Limiting:
```env
EMAIL_RATE_LIMIT_PER_HOUR=1000           # Email rate limit
NOTIFICATION_RATE_LIMIT_PER_MINUTE=100   # API rate limit
NOTIFICATION_BATCH_SIZE=100              # Bulk operation size
```

---

## 📊 Monitoring & Analytics

### Real-time Metrics:
- ✅ **Delivery rates** by channel
- ✅ **Read rates** by category  
- ✅ **User engagement** tracking
- ✅ **Performance metrics**
- ✅ **Error tracking**

### Admin Dashboard:
- 📈 **Statistics overview**
- 📊 **Engagement analytics**  
- 📧 **Email performance**
- 🔍 **User activity insights**
- ⚠️ **System health monitoring**

---

## 🧪 Testing

### API Testing:
```bash
# Send test notification
curl -X POST http://localhost:4009/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "title": "Test Notification",
    "message": "This is a test message"
  }'

# Get user notifications
curl http://localhost:4009/notifications/user123
```

### Email Testing:
```bash
# Test email template
curl -X POST http://localhost:4009/admin/templates/{id}/test \
  -H "Content-Type: application/json" \
  -d '{
    "testEmail": "test@example.com",
    "testData": { "userName": "Test User" }
  }'
```

---

## 🔒 Security

- ✅ **Input validation** with Joi schemas
- ✅ **Rate limiting** to prevent abuse
- ✅ **Admin authentication** required
- ✅ **SQL injection** protection via Prisma
- ✅ **XSS protection** in templates
- ✅ **CORS configuration**

---

## 🚀 Deployment

### Docker:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 4009
CMD ["npm", "start"]
```

### Environment Variables:
Ensure all required environment variables are set in production.

### Health Checks:
The service provides comprehensive health checks at `/health` and `/admin/health-detailed`.

---

## 🔮 Future Enhancements

### Phase 2:
- 📱 **Push notifications** (Firebase/APNs)
- 📱 **SMS notifications** (Twilio)
- 🔄 **Notification scheduling**
- 📊 **Advanced analytics**

### Phase 3:
- 🤖 **AI-powered personalization**
- 📈 **A/B testing framework**
- 🌍 **Multi-language support**
- 📱 **In-app notification UI widgets**

---

## 🆘 Support

For issues and questions:
- 📚 Check the API documentation at `/api-docs`
- 🔍 Review logs in the `logs/` directory
- 📊 Monitor health at `/health`
- 🛠️ Contact the development team

---

**The Notification Service is the heartbeat of user engagement on 50BraIns! 💓**
