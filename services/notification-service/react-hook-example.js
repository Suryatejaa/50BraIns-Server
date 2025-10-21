// React Hook for Real-time Notifications
// Usage: const { notifications, isConnected, connect, disconnect } = useNotifications(userId);

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

            const wsUrl = `ws://localhost:4009?userId=${userId}`;
            wsRef.current = new WebSocket(wsUrl);

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
                        if ('Notification' in window && Notification.permission === 'granted') {
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

// React Component Example
export const NotificationBell = ({ userId, onNotificationClick }) => {
    const {
        notifications,
        isConnected,
        unreadCount,
        markAsRead
    } = useNotifications(userId);

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
        onNotificationClick?.(notification);
    };

    return (
        <div className="notification-bell">
            <div className="bell-icon">
                🔔
                {unreadCount > 0 && (
                    <span className="badge">{unreadCount}</span>
                )}
                {!isConnected && (
                    <span className="connection-indicator">🔴</span>
                )}
            </div>

            <div className="notifications-dropdown">
                {notifications.length === 0 ? (
                    <div className="no-notifications">
                        No notifications
                    </div>
                ) : (
                    notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`notification-item ${!notification.read ? 'unread' : ''}`}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            <div className="notification-title">{notification.title}</div>
                            <div className="notification-message">{notification.message}</div>
                            <div className="notification-time">
                                {new Date(notification.createdAt).toLocaleString()}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// CSS for the component (add to your styles)
/*
.notification-bell {
    position: relative;
    display: inline-block;
}

.bell-icon {
    position: relative;
    cursor: pointer;
    font-size: 24px;
}

.badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #ff4444;
    color: white;
    border-radius: 50%;
    padding: 2px 6px;
    font-size: 12px;
    min-width: 18px;
    text-align: center;
}

.connection-indicator {
    position: absolute;
    bottom: -2px;
    right: -2px;
    font-size: 12px;
}

.notifications-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    width: 300px;
    max-height: 400px;
    overflow-y: auto;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    display: none;
}

.notification-bell:hover .notifications-dropdown {
    display: block;
}

.notification-item {
    padding: 12px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
}

.notification-item:hover {
    background: #f8f9fa;
}

.notification-item.unread {
    background: #fff3cd;
}

.notification-title {
    font-weight: bold;
    margin-bottom: 4px;
}

.notification-message {
    font-size: 14px;
    color: #666;
    margin-bottom: 4px;
}

.notification-time {
    font-size: 12px;
    color: #999;
}

.no-notifications {
    padding: 20px;
    text-align: center;
    color: #999;
}
*/ 