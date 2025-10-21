# Clan Gig Workflow Implementation

This document outlines the complete implementation of the clan gig workflow as specified in `GIGxClan_flow.md`.

## Overview

The clan gig workflow enables clans to apply for gigs as a team, split work among members, and manage fair pay distribution through milestone-based payments.

## Database Schema Changes

### Gig Service New Tables

#### `gig_assignments`
- Links gigs to assignees (clans or users)
- Stores snapshots of team plans, milestone plans, and payout splits
- Tracks assignment status and completion

#### `gig_milestones`
- Represents deliverable milestones with budgets
- Tracks submission, approval, and payment status
- Links to gig assignments

#### `gig_tasks`
- Internal clan tasks mapped to milestones
- Tracks task status, hours, and deliverables
- Assigned to specific clan members

### Clan Service New Tables

#### `clan_work_packages`
- Internal clan task management
- Maps to gig milestones
- Tracks progress and completion

#### `member_agreements`
- Member acceptance of gig roles and payouts
- Defines expected hours and deliverables
- Tracks agreement status

## API Endpoints

### Gig Service

#### Clan Applications
- `POST /gigs/:gigId/apply` - Apply to gig as clan
  - Body: `{ applicantType: 'clan', clanId, teamPlan, milestonePlan, payoutSplit, ... }`

#### Milestone Management
- `POST /gigs/:gigId/milestones` - Create milestone
- `POST /gigs/:gigId/milestones/:milestoneId/submit` - Submit milestone for approval
- `POST /gigs/:gigId/milestones/:milestoneId/approve` - Approve milestone (brand only)

#### Task Management
- `POST /gigs/:gigId/tasks` - Create task
- `PATCH /gigs/:gigId/tasks/:taskId` - Update task status

### Clan Service

#### Gig Planning
- `POST /clan/:clanId/gigs/:gigId/plan` - Create/update clan gig plan
- `POST /clan/:clanId/gigs/:gigId/tasks` - Create clan task
- `PATCH /clan/:clanId/gigs/:gigId/tasks/:taskId` - Update clan task
- `GET /clan/:clanId/gigs/:gigId/tasks` - Get clan tasks

## Workflow Steps

### 1. Clan Application
1. Clan owner/admin applies with:
   - Team plan (roles, members, hours, deliverables)
   - Milestone plan (titles, dates, amounts)
   - Payout split (percentage or fixed amounts per member)

2. Brand reviews application and accepts/rejects

### 2. Assignment & Plan Lock
1. On acceptance, gig status becomes `ASSIGNED`
2. Assignment record created with plan snapshots
3. Milestones created from milestone plan
4. Plans become immutable (require brand approval for changes)

### 3. Execution
1. Clan creates internal work packages mapped to milestones
2. Members accept tasks and track progress
3. Tasks move through statuses: TODO → IN_PROGRESS → REVIEW → DONE

### 4. Delivery & Approval
1. Clan marks milestone as delivered
2. Brand reviews and approves/rejects
3. On approval, credit service releases milestone funds per payout split

## Event Publishing

### Gig Service Events
- `gig.application.submitted` - Clan application submitted
- `gig.assigned` - Gig assigned to clan
- `gig.milestone.created` - Milestone created
- `gig.milestone.submitted` - Milestone delivered
- `gig.milestone.approved` - Milestone approved (triggers payout)
- `gig.task.created` - Task created
- `gig.task.updated` - Task status updated

### Clan Service Events
- `clan.gig.plan_updated` - Clan gig plan updated
- `clan.task.created` - Clan task created
- `clan.task.updated` - Clan task updated

## Data Models

### Application Schema
```json
{
  "applicantType": "clan",
  "clanId": "clan_123",
  "teamPlan": [
    {
      "role": "Video Editor",
      "memberId": "user_456",
      "hours": 20,
      "deliverables": ["Final video", "Raw footage"]
    }
  ],
  "milestonePlan": [
    {
      "title": "Video Production",
      "dueAt": "2025-08-20T00:00:00Z",
      "amount": 500,
      "deliverables": ["Final video"]
    }
  ],
  "payoutSplit": [
    {
      "memberId": "user_456",
      "percentage": 100
    }
  ]
}
```

### Milestone Schema
```json
{
  "title": "Video Production",
  "description": "Create final promotional video",
  "dueAt": "2025-08-20T00:00:00Z",
  "amount": 500,
  "deliverables": ["Final video", "Raw footage"],
  "status": "PENDING"
}
```

## Permissions

### Clan Management
- **HEAD/CO_HEAD/ADMIN**: Can apply to gigs, manage plans, create tasks
- **MEMBER**: Can view tasks, update assigned task status

### Gig Management
- **Brand**: Can approve/reject applications, approve milestones
- **Clan**: Can submit milestones, manage internal tasks

## Fair Pay Rules

1. **Payout Split Definition**: Set at application time (percentage or fixed amounts)
2. **Milestone Escrow**: Funds held until milestone approval
3. **Automatic Distribution**: Credit service releases funds per split on approval
4. **Transparency**: All members see payout splits and milestone amounts
5. **Adjustments**: Require both clan admin and brand approval

## Migration Steps

### 1. Run Database Migrations
```bash
# Gig Service
psql -d gig_service_db -f services/gig-service/migrations/add_clan_gig_workflow.sql

# Clan Service  
psql -d clan_service_db -f services/clan-service/migrations/add_clan_gig_workflow.sql
```

### 2. Restart Services
```bash
# Restart both services to load new schema
cd services/gig-service && npm restart
cd services/clan-service && npm restart
```

### 3. Verify Event Publishing
Check RabbitMQ exchanges for new events:
- `brains_events` (clan events)
- `credit_events` (gig events)

## Testing

### Test Clan Application
```bash
curl -X POST http://localhost:4002/gigs/gig_123/apply \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_456" \
  -d '{
    "applicantType": "clan",
    "clanId": "clan_789",
    "teamPlan": [...],
    "milestonePlan": [...],
    "payoutSplit": [...]
  }'
```

### Test Milestone Creation
```bash
curl -X POST http://localhost:4002/gigs/gig_123/milestones \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_456" \
  -d '{
    "title": "Video Production",
    "dueAt": "2025-08-20T00:00:00Z",
    "amount": 500
  }'
```

## Next Steps

1. **Credit Service Integration**: Implement milestone payment escrow and distribution
2. **Notification Service**: Add WebSocket notifications for milestone events
3. **Reputation System**: Track clan and member performance scores
4. **Dispute Resolution**: Handle milestone rejection and revision workflows
5. **Analytics**: Track clan performance metrics and gig success rates

## Troubleshooting

### Common Issues

1. **Unique Constraint Violations**: Ensure proper clanId validation in applications
2. **Event Publishing Failures**: Check RabbitMQ connection and exchange setup
3. **Permission Errors**: Verify user roles and clan membership status
4. **Database Constraints**: Ensure foreign key relationships are properly set up

### Debug Commands

```bash
# Check RabbitMQ connections
rabbitmqctl list_connections

# Monitor events
rabbitmqctl list_exchanges
rabbitmqctl list_queues

# Check database tables
psql -d gig_service_db -c "\dt"
psql -d clan_service_db -c "\dt"
```

## Support

For issues or questions about the clan gig workflow implementation, refer to:
- `GIGxClan_flow.md` - Original requirements and design
- Database migration scripts in respective service directories
- Controller implementations in `src/controllers/` directories
- Route definitions in `src/routes/` directories
