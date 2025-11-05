# Gig Service API Documentation - Complete Workflow

## 🎯 Overview
The Gig Service now supports the complete gig lifecycle with application management, work submission, and review processes, all integrated with RabbitMQ event publishing.

## 📊 Gig Workflow States
```
DRAFT → OPEN → IN_REVIEW → ASSIGNED → IN_PROGRESS → SUBMITTED → COMPLETED
                    ↓
                CANCELLED / EXPIRED
```

## 🚀 API Endpoints

### **Gig Management**

#### Create Gig
```http
POST /gigs
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Video Editor Needed for YouTube Channel",
  "description": "Looking for a skilled video editor...",
  "budget": 5000,
  "budgetType": "fixed",
  "roleRequired": "video-editor",
  "skillsRequired": ["After Effects", "Premiere Pro"],
  "category": "video-editing",
  "deadline": "2025-07-15T10:00:00Z",
  "urgency": "normal"
}
```

**Events Published:**
- `gig_created` - When a new gig is posted

#### Get Gigs (Public Feed)
```http
GET /gigs?category=video-editing&roleRequired=editor&page=1&limit=20
```

#### Get Gig Details
```http
GET /gigs/:gigId
```

#### Update Gig Status
```http
PUT /gigs/:gigId/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "IN_PROGRESS"
}
```

**Events Published:**
- `gig_status_updated` - When gig status changes

### **Application Management**

#### Apply to Gig
```http
POST /gigs/:gigId/apply
Authorization: Bearer <token>
Content-Type: application/json

{
  "applicantType": "user",
  "proposal": "I have 5 years of experience in video editing...",
  "quotedPrice": 4500,
  "estimatedTime": "5 days",
  "portfolio": ["https://youtube.com/my-portfolio"]
}
```

**Events Published:**
- `application_submitted` - When user applies to gig

#### Get Applications for Gig (Gig Owner Only)
```http
GET /gigs/:gigId/applications
Authorization: Bearer <token>
```

#### Accept Application
```http
POST /applications/:applicationId/accept
Authorization: Bearer <token>
```

**Events Published:**
- `application_accepted` - When application is approved
- `gig_assigned` - When gig is assigned to applicant

#### Reject Application
```http
POST /applications/:applicationId/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Portfolio doesn't match our requirements"
}
```

**Events Published:**
- `application_rejected` - When application is rejected

### **Work Submission & Review**

#### Submit Work (Assigned User Only)
```http
POST /gigs/:gigId/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Completed Video Edit - YouTube Channel Intro",
  "description": "I've completed the video editing as requested...",
  "deliverables": [
    "https://drive.google.com/file/d/final-video.mp4",
    "https://drive.google.com/file/d/project-files.zip"
  ],
  "notes": "Please review and let me know if any changes needed"
}
```

**Events Published:**
- `work_submitted` - When work is submitted for review

#### Get Submissions for Gig (Gig Owner Only)
```http
GET /gigs/:gigId/submissions
Authorization: Bearer <token>
```

#### Review Submission
```http
POST /submissions/:submissionId/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "APPROVED",
  "feedback": "Excellent work! Exactly what we needed.",
  "rating": 5
}
```

**Possible statuses:**
- `APPROVED` - Accept the work (completes gig)
- `REJECTED` - Reject the work
- `REVISION` - Request changes (back to IN_PROGRESS)

**Events Published:**
- `submission_reviewed` - When submission is reviewed
- `gig_completed` - When work is approved (if status=APPROVED)

### **User Dashboard**

#### Get My Posted Gigs
```http
GET /my/posted
Authorization: Bearer <token>
```

#### Get My Applications
```http
GET /my/applications
Authorization: Bearer <token>
```

## 📡 RabbitMQ Events Published

### Gig Lifecycle Events
```javascript
// Gig Created
{
  "type": "gig_created",
  "gigId": "gig_123",
  "gigTitle": "Video Editor Needed",
  "postedById": "user_456",
  "category": "video-editing",
  "budget": 5000,
  "timestamp": "2025-06-29T14:30:00Z"
}

// Application Submitted
{
  "type": "application_submitted",
  "gigId": "gig_123",
  "applicationId": "app_789",
  "applicantId": "user_999",
  "applicantType": "user",
  "gigOwnerId": "user_456",
  "quotedPrice": 4500
}

// Application Accepted
{
  "type": "application_accepted",
  "gigId": "gig_123",
  "applicationId": "app_789",
  "applicantId": "user_999",
  "gigOwnerId": "user_456"
}

// Work Submitted
{
  "type": "work_submitted",
  "gigId": "gig_123",
  "submissionId": "sub_111",
  "submittedById": "user_999",
  "gigOwnerId": "user_456",
  "submissionTitle": "Completed Video Edit"
}

// Submission Reviewed
{
  "type": "submission_reviewed",
  "gigId": "gig_123",
  "submissionId": "sub_111",
  "reviewStatus": "APPROVED",
  "rating": 5,
  "gigCompleted": true,
  "submittedById": "user_999",
  "gigOwnerId": "user_456"
}
```

## 🔄 Complete Workflow Example

### 1. Brand Posts Gig
```bash
curl -X POST http://localhost:4004/gigs \
  -H "Authorization: Bearer <brand_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Instagram Reel Creation",
    "description": "Need 10 engaging Instagram reels",
    "budget": 15000,
    "category": "content-creation",
    "roleRequired": "content-creator"
  }'
```

### 2. Influencer Applies
```bash
curl -X POST http://localhost:4004/gigs/gig_123/apply \
  -H "Authorization: Bearer <influencer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "applicantType": "user",
    "proposal": "I can create viral Instagram reels...",
    "quotedPrice": 12000
  }'
```

### 3. Brand Reviews Applications
```bash
curl -X GET http://localhost:4004/gigs/gig_123/applications \
  -H "Authorization: Bearer <brand_token>"
```

### 4. Brand Accepts Application
```bash
curl -X POST http://localhost:4004/applications/app_789/accept \
  -H "Authorization: Bearer <brand_token>"
```

### 5. Influencer Submits Work
```bash
curl -X POST http://localhost:4004/gigs/gig_123/submit \
  -H "Authorization: Bearer <influencer_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "10 Instagram Reels Completed",
    "deliverables": ["https://drive.google.com/reels-package.zip"],
    "description": "All 10 reels as requested"
  }'
```

### 6. Brand Reviews Submission
```bash
curl -X POST http://localhost:4004/submissions/sub_111/review \
  -H "Authorization: Bearer <brand_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "rating": 5,
    "feedback": "Perfect work! Exactly what we needed."
  }'
```

## 🎛️ Event Integration Benefits

### Real-time Notifications
- Other services can listen for gig events
- Credit Service can handle payments when gigs complete
- User Service can update reputation scores
- Analytics Service can track gig performance

### Data Synchronization
- Automatic cross-service data updates
- Consistent state across microservices
- Event-driven analytics and reporting

### Business Intelligence
- Track application success rates
- Monitor gig completion times
- Analyze market trends and pricing

## 🧪 Testing the Complete Workflow

Start the Gig Service:
```bash
cd "d:\project\50brains\50BraIns-Server\services\gig-service"
node src/index.js
```

The service will automatically:
- ✅ Connect to RabbitMQ for event publishing
- ✅ Listen for credit events from other services
- ✅ Publish gig lifecycle events
- ✅ Handle complete gig workflow from creation to completion

## 📊 Database Schema Updates
- ✅ Added `rejectionReason` to applications
- ✅ Added `rating` and enhanced fields to submissions
- ✅ Added `applicationId` link between submissions and applications
- ✅ Enhanced event tracking with boost events integration

The Gig Service now provides a complete, production-ready workflow for managing the entire gig lifecycle with full event integration! 🚀
