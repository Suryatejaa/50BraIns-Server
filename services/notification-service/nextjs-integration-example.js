// Next.js Integration for Real-time Notifications
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

            // Use environment variable for WebSocket URL
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4009';
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

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close(1000, 'User disconnected');
            wsRef.current = null;
        }

        setIsConnected(false);
        setConnectionStatus('disconnected');
        reconnectAttemptsRef.current = 0;
    }, []);

    const markAsRead = useCallback((notificationId) => {
        setNotifications(prev =>
            prev.map(notification =>
                notification.id === notificationId
                    ? { ...notification, read: true }
                    : notification
            )
        );
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // Auto-connect when userId changes
    useEffect(() => {
        if (userId) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [userId, connect, disconnect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

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

// Next.js Component Example
// File: components/NotificationBell.jsx

import { useNotifications } from '../hooks/useNotifications';
import { useState } from 'react';

export const NotificationBell = ({ userId, onNotificationClick }) => {
    const {
        notifications,
        isConnected,
        unreadCount,
        markAsRead
    } = useNotifications(userId);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
        onNotificationClick?.(notification);
        setIsDropdownOpen(false);
    };

    return (
        <div className="relative inline-block">
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17h6m-6-4h6m-6-4h6m-6-4h6" />
                </svg>

                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}

                {!isConnected && (
                    <span className="absolute -bottom-1 -right-1 bg-gray-400 rounded-full h-2 w-2"></span>
                )}
            </button>

            {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold">Notifications</h3>
                        {!isConnected && (
                            <p className="text-sm text-gray-500 mt-1">Reconnecting...</p>
                        )}
                    </div>

                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            No notifications
                        </div>
                    ) : (
                        <div>
                            {notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-yellow-50' : ''
                                        }`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900 mb-1">
                                                {notification.title}
                                            </h4>
                                            <p className="text-sm text-gray-600 mb-2">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center text-xs text-gray-500">
                                                <span className="capitalize">{notification.category.toLowerCase()}</span>
                                                <span className="mx-2">•</span>
                                                <span>{new Date(notification.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Next.js Page Example
// File: pages/dashboard.jsx

import { useSession } from 'next-auth/react';
import { NotificationBell } from '../components/NotificationBell';

export default function Dashboard() {
    const { data: session } = useSession();
    const userId = session?.user?.id;

    const handleNotificationClick = (notification) => {
        console.log('Notification clicked:', notification);
        // Handle navigation or other actions based on notification type
        switch (notification.category) {
            case 'GIG':
                // Navigate to gig details
                break;
            case 'CLAN':
                // Navigate to clan page
                break;
            default:
                // Default action
                break;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

                        <div className="flex items-center space-x-4">
                            <NotificationBell
                                userId={userId}
                                onNotificationClick={handleNotificationClick}
                            />
                            {/* Other header items */}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Your dashboard content */}
                <div className="px-4 py-6 sm:px-0">
                    <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
                        <p className="text-gray-500">Dashboard content goes here</p>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Environment Variables
// File: .env.local
/*
NEXT_PUBLIC_WS_URL=ws://localhost:4009
NEXT_PUBLIC_API_URL=http://localhost:3000/api
*/

// Next.js API Route for Testing
// File: pages/api/test-notification.js

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { userId, title, message } = req.body;

        if (!userId || !title || !message) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Send test notification via notification service
        const response = await fetch('http://localhost:4009/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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

        const data = await response.json();

        if (response.ok) {
            res.status(200).json({ success: true, data });
        } else {
            res.status(response.status).json({ success: false, error: data });
        }
    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
} 