# 🏛️ Clan Service Route Organization

## 📋 **Overview**
The clan service routes are organized into two main categories to avoid duplication and maintain clear separation of concerns.

## 🚀 **Route Structure**

### **1. `/clans` Routes - Clan-Level Operations**
**Purpose**: All operations that affect the clan as a whole or require clan-level permissions.

#### **Public Routes**
- `GET /clans` - List all clans (with filters)
- `GET /clans/feed` - Get clan feed
- `GET /clans/featured` - Get featured clans
- `GET /clans/:clanId` - Get specific clan details

#### **Protected Routes**
- `GET /clans/my` - Get user's clans
- `POST /clans` - Create new clan

#### **Clan Management (Owner/Admin Only)**
- `PUT /clans/:clanId` - Update clan
- `DELETE /clans/:clanId` - Delete clan

#### **Join Request Management (Head/Admin Only)**
- `GET /clans/:clanId/pending-requests` - View pending requests
- `GET /clans/:clanId/join-requests` - Alias for pending requests
- `POST /clans/:clanId/join-requests/:userId/approve` - Approve join request
- `POST /clans/:clanId/join-requests/:userId/reject` - Reject join request

#### **System Routes**
- `POST /clans/:clanId/update-reputation` - Update clan reputation (called by reputation service)

---

### **2. `/members` Routes - Individual Member Actions**
**Purpose**: Operations that affect individual members or their relationships with clans.

#### **Membership Operations**
- `GET /members/:clanId` - Get clan members list
- `POST /members/:clanId/join-requests` - Request to join clan
- `POST /members/:clanId/join` - Directly join clan
- `POST /members/:clanId/leave` - Leave clan

#### **Role Management (Owner/Admin Only)**
- `PUT /members/:clanId/:userId/role` - Update member role
- `DELETE /members/:clanId/:userId` - Remove member from clan

#### **Admin Management (Head Only)**
- `POST /members/:clanId/:userId/admin` - Add admin
- `DELETE /members/:clanId/:userId/admin` - Remove admin

#### **Ownership Transfer (Head Only)**
- `POST /members/:clanId/transfer-ownership` - Transfer clan ownership

---

## 🎯 **Key Principles**

### **1. No Route Duplication**
- Each operation has exactly one route
- Clear separation between clan-level and member-level operations

### **2. Consistent URL Patterns**
- **Clan operations**: `/clans/:clanId/...`
- **Member operations**: `/members/:clanId/...`
- **Join requests**: Always under clan routes (clan-level decision)

### **3. Permission-Based Organization**
- **Public routes**: No authentication required
- **Protected routes**: User authentication required
- **Admin routes**: Clan head/admin permissions required
- **Owner routes**: Clan head permissions required

---

## 🔄 **Migration Notes**

### **Frontend Updates Required**
If your frontend was using the old member routes for join request management, update to:

- **Old**: `POST /members/:clanId/:userId/approve`
- **New**: `POST /clans/:clanId/join-requests/:userId/approve`

- **Old**: `GET /members/:clanId/pending-requests`
- **New**: `GET /clans/:clanId/pending-requests`

### **Backward Compatibility**
The `GET /clans/:clanId/join-requests` alias is maintained for frontend compatibility.

---

## 📚 **Usage Examples**

### **Join Request Workflow**
```javascript
// 1. User requests to join
POST /members/:clanId/join-requests

// 2. Admin views pending requests
GET /clans/:clanId/pending-requests

// 3. Admin approves/rejects
POST /clans/:clanId/join-requests/:userId/approve
POST /clans/:clanId/join-requests/:userId/reject
```

### **Member Management**
```javascript
// Add/remove admins (head only)
POST /members/:clanId/:userId/admin
DELETE /members/:clanId/:userId/admin

// Transfer ownership (head only)
POST /members/:clanId/transfer-ownership
```

This organization makes the API more intuitive and eliminates confusion about which route to use for each operation.
