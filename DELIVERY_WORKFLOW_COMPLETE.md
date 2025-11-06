# Updated Gig Workflow with Delivery Review Process

## Overview
The gig workflow now includes a **DELIVERED** status that sits between **APPROVED** and **SUBMITTED**, enabling a private content review process before public posting.

## Complete Application Status Flow

```
PENDING → APPROVED → DELIVERED → SUBMITTED → CLOSED
    ↓         ↓          ↓           ↓         ↓
  REJECTED  (delivery   (final     (final   (payment
            review)     URL)      review)   released)
```

## Detailed Workflow

### 1. **PENDING** → **APPROVED**
- **Trigger**: Brand approves the application
- **API**: `PUT /api/applications/:id/approve`
- **Status Change**: `PENDING` → `APPROVED`
- **Next Step**: Creator can now submit delivery files

### 2. **APPROVED** → **DELIVERED** 
- **Trigger**: Creator submits delivery files AND brand approves them
- **APIs**: 
  - `POST /api/applications/:id/submit-delivery` (creates delivery, keeps status APPROVED)
  - `PUT /api/applications/:id/deliveries/:deliveryId/review` with `status: "APPROVED"` (changes to DELIVERED)
- **Status Change**: `APPROVED` → `DELIVERED`
- **Next Step**: Creator can now post publicly and submit final URL

### 3. **DELIVERED** → **SUBMITTED**
- **Trigger**: Creator posts content publicly and submits final URL
- **API**: `POST /api/gigs/:id/submit`
- **Status Change**: `DELIVERED` → `SUBMITTED`
- **Next Step**: Brand reviews final submission

### 4. **SUBMITTED** → **CLOSED**
- **Trigger**: Brand approves final submission
- **API**: `PUT /api/submissions/:id/review` with `status: "APPROVED"`
- **Status Change**: `SUBMITTED` → `CLOSED`
- **Result**: Payment is processed, gig completed

## Delivery Review Process

### Creator Submits Delivery
```javascript
POST /api/applications/:applicationId/submit-delivery
{
  "title": "Instagram Post Content",
  "description": "Draft content for review",
  "fileUrl": "https://r2.domain.com/delivery-files/...",
  "fileName": "post-draft.jpg",
  "notes": "Please review the color grading"
}
```

### Brand Reviews Delivery
```javascript
PUT /api/applications/:applicationId/deliveries/:deliveryId/review
{
  "status": "APPROVED", // or "REJECTED" or "REVISION"
  "feedback": "Looks great! Please proceed with posting"
}
```

## Status Behavior on Delivery Review

### If Brand **APPROVES** Delivery:
- **Delivery Status**: `PENDING` → `APPROVED`
- **Application Status**: `APPROVED` → `DELIVERED`
- **Creator Can**: Post content publicly and submit final URL
- **Message**: "You can now post it publicly and submit the final URL"

### If Brand **REJECTS** Delivery:
- **Delivery Status**: `PENDING` → `REJECTED`
- **Application Status**: Remains `APPROVED`
- **Creator Can**: Submit a new delivery file
- **File Cleanup**: Rejected files are automatically deleted
- **Message**: "Please submit a new delivery"

### If Brand Requests **REVISION**:
- **Delivery Status**: `PENDING` → `REVISION`
- **Application Status**: Remains `APPROVED`
- **Creator Can**: Submit a revised delivery file
- **Message**: "Please make revisions and submit new delivery"

## API Endpoint Summary

| Endpoint | Purpose | Status Change |
|----------|---------|---------------|
| `PUT /applications/:id/approve` | Brand approves application | `PENDING` → `APPROVED` |
| `POST /applications/:id/submit-delivery` | Creator submits delivery files | Stays `APPROVED` |
| `PUT /applications/:id/deliveries/:id/review` | Brand reviews delivery | `APPROVED` → `DELIVERED` (if approved) |
| `POST /gigs/:id/submit` | Creator submits final URL | `DELIVERED` → `SUBMITTED` |
| `PUT /submissions/:id/review` | Brand reviews final submission | `SUBMITTED` → `CLOSED` (if approved) |

## Key Features

### Version Control
- Creators can submit up to 3 delivery versions
- Oldest delivery is auto-deleted when limit exceeded
- Each delivery has a version number

### File Management
- Delivery files are stored separately from final submissions
- Files auto-expire after 24 hours of approval/rejection
- Rejected files are immediately deleted
- R2/CloudFlare storage integration

### Cache Invalidation
- Real-time updates across all dashboards
- Comprehensive cache clearing on status changes
- Immediate visibility of status updates

### Notifications
- Real-time events for all status changes
- WebSocket notifications to both parties
- Detailed feedback and next-step messaging

## Error Handling

### Common Errors
- **403**: "You must have a delivered application to submit final work URL"
- **400**: "Delivery has already been reviewed"
- **404**: "Delivery not found"
- **403**: "You are not authorized to review this delivery"

### Validation
- File URLs must be valid
- Status transitions are enforced
- User permissions are checked at each step

## Database Schema Changes

### New Tables
- `gigDeliveries` - Stores delivery files and metadata
- `gigDeliveryCleanups` - Manages file cleanup scheduling

### Updated Enums
```sql
-- ApplicationStatus enum now includes:
PENDING | APPROVED | DELIVERED | SUBMITTED | CLOSED | REJECTED | WITHDRAWN

-- New delivery-specific enums:
GigDeliveryStatus: PENDING | APPROVED | REJECTED | REVISION
GigDeliveryCleanupStatus: SCHEDULED | PROCESSING | COMPLETED | FAILED
```

## Migration Requirements

1. **Run SQL Migration**: Execute `add-delivered-status.sql` in Supabase
2. **Update Prisma Client**: Generate new Prisma client with updated schema
3. **Deploy Backend**: Deploy updated application controller
4. **Update Frontend**: Handle new `DELIVERED` status in UI

## Testing the Workflow

1. Create a gig and get it approved
2. Submit delivery files via `submit-delivery` endpoint
3. Review delivery as brand (approve/reject)
4. If approved, submit final URL via `submit` endpoint
5. Review final submission as brand
6. Verify status transitions and notifications

This workflow ensures content quality and brand approval while maintaining a smooth user experience for both creators and brands.