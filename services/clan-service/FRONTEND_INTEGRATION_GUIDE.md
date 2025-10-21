# 🎯 Frontend Integration Guide - Clan Join Requests

## 📋 **Overview**
This guide explains how to properly integrate with the clan join request system using the new route structure.

## 🔄 **Join Request Workflow**

### **Step 1: Get Pending Requests**
```javascript
// Get all pending join requests for a clan
const getPendingRequests = async (clanId) => {
    const response = await fetch(`/api/clans/${clanId}/pending-requests`, {
        headers: {
            'x-user-id': currentUserId, // Admin/Head user ID
            'Content-Type': 'application/json'
        }
    });
    
    const data = await response.json();
    return data.data; // Array of user IDs requesting to join
};
```

### **Step 2: Display Pending Requests**
```javascript
// Example: Display pending requests in UI
const pendingRequests = await getPendingRequests(clanId);

pendingRequests.forEach(userId => {
    // Create UI element for each pending request
    const requestElement = createRequestElement(userId);
    // Add approve/reject buttons
});
```

### **Step 3: Approve/Reject Requests**
```javascript
// Approve a join request
const approveRequest = async (clanId, userId) => {
    const response = await fetch(`/api/clans/${clanId}/join-requests/${userId}/approve`, {
        method: 'POST',
        headers: {
            'x-user-id': currentUserId, // Admin/Head user ID
            'Content-Type': 'application/json'
        }
    });
    
    const data = await response.json();
    return data;
};

// Reject a join request
const rejectRequest = async (clanId, userId) => {
    const response = await fetch(`/api/clans/${clanId}/join-requests/${userId}/reject`, {
        method: 'POST',
        headers: {
            'x-user-id': currentUserId, // Admin/Head user ID
            'Content-Type': 'application/json'
        }
    });
    
    const data = await response.json();
    return data;
};
```

## 🚨 **Common Mistakes to Avoid**

### **❌ Wrong: Using requestId**
```javascript
// DON'T DO THIS
const endpoint = `/api/clans/${clanId}/join-requests/${requestId}/approve`;
```

### **✅ Correct: Using userId**
```javascript
// DO THIS
const endpoint = `/api/clans/${clanId}/join-requests/${userId}/approve`;
```

## 📱 **Complete UI Example**

```javascript
import React, { useState, useEffect } from 'react';

const ClanJoinRequests = ({ clanId, currentUserId }) => {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch pending requests
    const fetchPendingRequests = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/clans/${clanId}/pending-requests`, {
                headers: {
                    'x-user-id': currentUserId,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            if (data.success) {
                setPendingRequests(data.data);
            }
        } catch (error) {
            console.error('Error fetching pending requests:', error);
        } finally {
            setLoading(false);
        }
    };

    // Approve request
    const handleApprove = async (userId) => {
        try {
            const response = await fetch(`/api/clans/${clanId}/join-requests/${userId}/approve`, {
                method: 'POST',
                headers: {
                    'x-user-id': currentUserId,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            if (data.success) {
                // Remove from pending requests
                setPendingRequests(prev => prev.filter(id => id !== userId));
                // Show success message
                alert('Join request approved!');
            }
        } catch (error) {
            console.error('Error approving request:', error);
        }
    };

    // Reject request
    const handleReject = async (userId) => {
        try {
            const response = await fetch(`/api/clans/${clanId}/join-requests/${userId}/reject`, {
                method: 'POST',
                headers: {
                    'x-user-id': currentUserId,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            if (data.success) {
                // Remove from pending requests
                setPendingRequests(prev => prev.filter(id => id !== userId));
                // Show success message
                alert('Join request rejected!');
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    };

    useEffect(() => {
        fetchPendingRequests();
    }, [clanId]);

    if (loading) return <div>Loading pending requests...</div>;

    return (
        <div className="join-requests">
            <h3>Pending Join Requests ({pendingRequests.length})</h3>
            
            {pendingRequests.length === 0 ? (
                <p>No pending join requests</p>
            ) : (
                <div className="requests-list">
                    {pendingRequests.map(userId => (
                        <div key={userId} className="request-item">
                            <span>User ID: {userId}</span>
                            <div className="actions">
                                <button 
                                    onClick={() => handleApprove(userId)}
                                    className="approve-btn"
                                >
                                    ✅ Approve
                                </button>
                                <button 
                                    onClick={() => handleReject(userId)}
                                    className="reject-btn"
                                >
                                    ❌ Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ClanJoinRequests;
```

## 🔑 **Key Points**

1. **Route Parameters**: The `:userId` in the route is the user requesting to join, not a separate request ID
2. **Headers**: Always include `x-user-id` header with the current user's ID (admin/head)
3. **Workflow**: Get pending requests first, then approve/reject using the user IDs from that list
4. **No Request IDs**: The system doesn't use separate request IDs - it uses the actual user IDs

## 🚀 **Testing**

To test the integration:

1. **Create a join request**: `POST /api/members/:clanId/join-requests`
2. **View pending requests**: `GET /api/clans/:clanId/pending-requests`
3. **Approve/reject**: `POST /api/clans/:clanId/join-requests/:userId/approve`

This approach ensures a clean, RESTful API design without duplicate routes or confusing parameters.
