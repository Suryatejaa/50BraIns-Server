# Clan Notification Events

This document outlines all the notification events that are automatically sent to clan members when various actions occur in the gig workflow.

## 🎯 **Event Overview**

All clan members receive real-time notifications through RabbitMQ events when their clan is involved in gig-related activities. These events are published by the gig-service and can be consumed by the notification-service to send actual notifications (email, push, in-app, etc.).

## 📋 **Event Types**

### 1. **Clan Gig Approved** 🎉
**Event**: `clan_gig_approved`
**Trigger**: When a clan's gig application is approved
**Recipients**: All clan members
**Data**:
```json
{
  "gigId": "string",
  "gigTitle": "string",
  "clanId": "string",
  "gigOwnerId": "string",
  "applicationId": "string",
  "memberCount": "number",
  "milestoneCount": "number",
  "totalAmount": "number",
  "assignedAt": "ISO string"
}
```

### 2. **Individual Member Notifications** 👤
**Event**: `clan_gig_approved_member_notification`
**Trigger**: When a clan's gig application is approved
**Recipients**: Individual clan members
**Data**:
```json
{
  "gigId": "string",
  "gigTitle": "string",
  "clanId": "string",
  "clanName": "string",
  "memberId": "string",
  "memberRole": "string",
  "gigOwnerId": "string",
  "applicationId": "string",
  "milestoneCount": "number",
  "totalAmount": "number",
  "assignedAt": "ISO string"
}
```

### 3. **Milestone Created** 📅
**Event**: `clan_milestone_created_member_notification`
**Trigger**: When a new milestone is created for a clan gig
**Recipients**: All clan members
**Data**:
```json
{
  "gigId": "string",
  "gigTitle": "string",
  "milestoneId": "string",
  "milestoneTitle": "string",
  "milestoneAmount": "number",
  "clanId": "string",
  "memberId": "string",
  "memberRole": "string",
  "dueAt": "ISO string",
  "deliverables": ["string"],
  "createdAt": "ISO string"
}
```

### 4. **Milestone Approved** ✅
**Event**: `clan_milestone_approved_member_notification`
**Trigger**: When a milestone is approved by the gig owner
**Recipients**: All clan members
**Data**:
```json
{
  "gigId": "string",
  "gigTitle": "string",
  "milestoneId": "string",
  "milestoneTitle": "string",
  "milestoneAmount": "number",
  "clanId": "string",
  "memberId": "string",
  "memberRole": "string",
  "approvedAt": "ISO string",
  "feedback": "string",
  "payoutSplit": "object",
  "createdAt": "ISO string"
}
```

### 5. **General Milestone Approved** 🎯
**Event**: `clan_milestone_approved`
**Trigger**: When a milestone is approved by the gig owner
**Recipients**: Clan-wide event (for analytics, dashboards, etc.)
**Data**:
```json
{
  "gigId": "string",
  "gigTitle": "string",
  "milestoneId": "string",
  "milestoneTitle": "string",
  "milestoneAmount": "number",
  "clanId": "string",
  "memberCount": "number",
  "approvedAt": "ISO string",
  "feedback": "string",
  "payoutSplit": "object",
  "createdAt": "ISO string"
}
```

### 6. **Task Assigned** 📝
**Event**: `clan_task_assigned_member_notification`
**Trigger**: When a task is assigned to a specific clan member
**Recipients**: The assigned clan member
**Data**:
```json
{
  "gigId": "string",
  "gigTitle": "string",
  "taskId": "string",
  "taskTitle": "string",
  "taskDescription": "string",
  "clanId": "string",
  "memberId": "string",
  "memberRole": "string",
  "estimatedHours": "number",
  "deliverables": ["string"],
  "dueDate": "ISO string",
  "milestoneId": "string",
  "createdAt": "ISO string"
}
```

### 7. **Task Status Updated** 🔄
**Event**: `clan_task_status_updated_member_notification`
**Trigger**: When a task status changes (TODO → IN_PROGRESS → REVIEW → DONE)
**Recipients**: The assigned clan member
**Data**:
```json
{
  "gigId": "string",
  "taskId": "string",
  "taskTitle": "string",
  "oldStatus": "string",
  "newStatus": "string",
  "clanId": "string",
  "memberId": "string",
  "memberRole": "string",
  "updatedAt": "ISO string"
}
```

## 🔄 **Event Flow**

```
Gig Application → Approved → Clan Members Notified
     ↓
Milestones Created → Clan Members Notified
     ↓
Tasks Assigned → Specific Member Notified
     ↓
Task Status Changes → Member Notified
     ↓
Milestone Submitted → Owner Reviews
     ↓
Milestone Approved → Clan Members Notified + Payout Triggered
```

## 🚀 **Implementation Details**

### **Service Integration**
- **Gig Service**: Publishes all events via RabbitMQ
- **Clan Service**: Provides clan member data via internal API calls
- **Notification Service**: Consumes events and sends actual notifications
- **User Service**: Provides user profile data for personalization

### **Error Handling**
- Notification failures don't break the main workflow
- All notification calls are wrapped in try-catch blocks
- Logs are generated for debugging notification issues

### **Performance Considerations**
- Clan member data is fetched once per event
- Events are published asynchronously
- No blocking operations in the main workflow

## 📱 **Notification Channels**

These events can be consumed to send notifications through:
- **Email**: Milestone approvals, task assignments
- **Push Notifications**: Real-time updates
- **In-App Notifications**: Dashboard updates
- **SMS**: Critical milestone approvals
- **Slack/Discord**: Team collaboration updates

## 🧪 **Testing**

To test these notifications:
1. Create a clan application to a gig
2. Approve the clan application
3. Create milestones and tasks
4. Update task statuses
5. Approve milestones
6. Check RabbitMQ for published events

## 🔧 **Configuration**

**Environment Variables**:
- `BASE_URL`: API Gateway URL for internal service calls
- `RABBITMQ_URL`: RabbitMQ connection string
- `RABBITMQ_EXCHANGE`: Exchange name for events

**RabbitMQ Exchanges**:
- `gig_events`: Main exchange for gig-related events
- `credit_events`: Exchange for payment-related events
