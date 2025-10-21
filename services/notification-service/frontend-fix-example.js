// Frontend Fix: Use API Gateway instead of direct service access
// The issue is that your frontend is calling http://localhost:4009 directly
// Instead, it should go through the API Gateway at http://localhost:3000/api

// ❌ WRONG - Direct service access (causes CORS issues)
const wsUrl = `ws://localhost:4009?userId=${userId}`;
const apiUrl = 'http://localhost:4009/notifications';

// ✅ CORRECT - Use API Gateway
const wsUrl = `ws://localhost:3000/api/notifications/ws?userId=${userId}`;
const apiUrl = 'http://localhost:3000/api/notifications';

// Updated Next.js hook example:
// File: hooks/useNotifications.js

import { useState, useEffect, useCallback, useRef } from 'react';

export const useNotifications = (userId) => {
    const [notifications, setNotifications] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;

    const connect = useCallback(() => {
        if (!userId) {
            console.error('User ID is required for WebSocket connection');
            return;
        }

        try {
            // Close existing connection
            if (wsRef.current) {
                wsRef.current.close();
            }

            // ✅ Use API Gateway for WebSocket connection
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/api/notifications/ws';
            const fullWsUrl = `${wsUrl}?userId=${userId}`;

            wsRef.current = new WebSocket(fullWsUrl);

            wsRef.current.onopen = () => {
                setIsConnected(true);
                setConnectionStatus('connected');
                reconnectAttemptsRef.current = 0;
                console.log('✅ WebSocket connected for user:', userId);
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'notification') {
                        // Add new notification to the beginning of the list
                        setNotifications(prev => [data.data, ...prev]);

                        // Show browser notification if permission granted
                        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                            new Notification(data.data.title, {
                                body: data.data.message,
                                icon: '/favicon.ico',
                                tag: data.data.id // Prevent duplicate notifications
                            });
                        }
                    } else if (data.type === 'connection') {
                        console.log('Connection confirmed:', data.message);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            wsRef.current.onclose = (event) => {
                setIsConnected(false);
                setConnectionStatus('disconnected');
                console.log('WebSocket disconnected:', event.code, event.reason);

                // Attempt to reconnect if not manually closed
                if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current++;
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

                    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, delay);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
                setConnectionStatus('error');
            };

        } catch (error) {
            console.error('Error creating WebSocket connection:', error);
            setConnectionStatus('error');
        }
    }, [userId]);

    // ... rest of the hook implementation remains the same

    return {
        notifications,
        isConnected,
        connectionStatus,
        connect,
        disconnect,
        markAsRead,
        clearNotifications,
        unreadCount: notifications.filter(n => !n.read).length
    };
};

// Updated API calls to use API Gateway:
// File: services/api.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const notificationApi = {
    // ✅ Use API Gateway for all API calls
    getNotifications: async (userId, params = {}) => {
        const response = await fetch(`${API_BASE_URL}/notifications/${userId}?${new URLSearchParams(params)}`);
        return response.json();
    },

    markAsRead: async (notificationId) => {
        const response = await fetch(`${API_BASE_URL}/notifications/mark-read/${notificationId}`, {
            method: 'PATCH'
        });
        return response.json();
    },

    markAllAsRead: async (userId) => {
        const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read/${userId}`, {
            method: 'PATCH'
        });
        return response.json();
    },

    getUnreadCount: async (userId) => {
        const response = await fetch(`${API_BASE_URL}/notifications/count/${userId}`);
        return response.json();
    },

    // Test notification (for development)
    sendTestNotification: async (userId, title, message) => {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId,
                type: 'TRANSACTIONAL',
                category: 'SYSTEM',
                title,
                message,
                metadata: { test: true }
            })
        });
        return response.json();
    }
};

// Environment Variables:
// File: .env.local
/*
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000/api/notifications/ws
*/

// API Gateway Configuration:
// The API Gateway should proxy WebSocket connections to the notification service
// Add this to your API Gateway proxy configuration:

/*
// In api-gateway/src/middleware/proxy.js
if (serviceName === 'notification') {
    // Handle WebSocket upgrade for notification service
    if (req.headers.upgrade === 'websocket') {
        return proxyToService('notification', req, res);
    }
    
    // Handle regular HTTP requests
    const notificationServiceRoutes = ['/api/notifications', '/api/admin/notifications'];
    for (const route of notificationServiceRoutes) {
        if (path.startsWith(route)) {
            const remainingPath = path.substring(route.length);
            const routePrefix = route.substring(5); // Remove '/api/' to get 'notifications', 'admin'
            const newPath = `/${routePrefix}${remainingPath}` || `/${routePrefix}`;
            return proxyToService('notification', req, res, newPath);
        }
    }
}
*/ 