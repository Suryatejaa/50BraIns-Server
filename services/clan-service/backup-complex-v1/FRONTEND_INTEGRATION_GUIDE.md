# Clan Service - Frontend Integration Guide

## Overview
This guide provides everything you need to integrate the clan service with your frontend application.

## API Client Setup

### 1. Base Configuration
```javascript
// api-client.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ClanApiClient {
    constructor() {
        this.baseURL = `${API_BASE_URL}/api`;
    }

    async request(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

export const clanApiClient = new ClanApiClient();
```

### 2. Clan Management Functions
```javascript
// clan-service.js
import { clanApiClient } from './api-client';

export const clanService = {
    // Get all clans
    async getClans(params = {}) {
        return clanApiClient.get('/clan', params);
    },

    // Get clan feed
    async getClanFeed(params = {}) {
        return clanApiClient.get('/clans/feed', params);
    },

    // Get single clan
    async getClan(clanId) {
        return clanApiClient.get(`/clan/${clanId}`);
    },

    // Create clan
    async createClan(clanData) {
        return clanApiClient.post('/clan', clanData);
    },

    // Update clan
    async updateClan(clanId, clanData) {
        return clanApiClient.put(`/clan/${clanId}`, clanData);
    },

    // Delete clan
    async deleteClan(clanId) {
        return clanApiClient.delete(`/clan/${clanId}`);
    },

    // Get clan members
    async getClanMembers(clanId) {
        return clanApiClient.get(`/members/${clanId}`);
    },

    // Invite member
    async inviteMember(invitationData) {
        return clanApiClient.post('/members/invite', invitationData);
    },

    // Accept invitation
    async acceptInvitation(invitationId) {
        return clanApiClient.post(`/members/invitations/${invitationId}/accept`);
    },

    // Remove member
    async removeMember(clanId, userId) {
        return clanApiClient.delete(`/members/${clanId}/members/${userId}`);
    },

    // Update member role
    async updateMemberRole(clanId, userId, roleData) {
        return clanApiClient.put(`/members/${clanId}/members/${userId}/role`, roleData);
    },

    // Leave clan
    async leaveClan(clanId) {
        return clanApiClient.post(`/members/${clanId}/leave`);
    },

    // Get rankings
    async getRankings(params = {}) {
        return clanApiClient.get('/rankings', params);
    },

    // Get analytics
    async getAnalytics(clanId) {
        return clanApiClient.get(`/analytics/${clanId}`);
    }
};
```

## React Hooks

### 1. Clan Management Hook
```javascript
// hooks/useClans.js
import { useState, useEffect, useCallback } from 'react';
import { clanService } from '../services/clan-service';

export const useClans = (initialParams = {}) => {
    const [clans, setClans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({});

    const fetchClans = useCallback(async (params = {}) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await clanService.getClans(params);
            
            if (response.success) {
                setClans(response.data.clans);
                setPagination(response.data.pagination);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchClans(initialParams);
    }, [fetchClans, initialParams]);

    return {
        clans,
        loading,
        error,
        pagination,
        refetch: fetchClans
    };
};
```

### 2. Single Clan Hook
```javascript
// hooks/useClan.js
import { useState, useEffect, useCallback } from 'react';
import { clanService } from '../services/clan-service';

export const useClan = (clanId) => {
    const [clan, setClan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchClan = useCallback(async () => {
        if (!clanId) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await clanService.getClan(clanId);
            
            if (response.success) {
                setClan(response.data.clan);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clanId]);

    useEffect(() => {
        fetchClan();
    }, [fetchClan]);

    const updateClan = useCallback(async (updateData) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await clanService.updateClan(clanId, updateData);
            
            if (response.success) {
                setClan(response.data.clan);
                return response.data.clan;
            }
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [clanId]);

    return {
        clan,
        loading,
        error,
        refetch: fetchClan,
        updateClan
    };
};
```

### 3. Clan Members Hook
```javascript
// hooks/useClanMembers.js
import { useState, useEffect, useCallback } from 'react';
import { clanService } from '../services/clan-service';

export const useClanMembers = (clanId) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchMembers = useCallback(async () => {
        if (!clanId) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await clanService.getClanMembers(clanId);
            
            if (response.success) {
                setMembers(response.data.members);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [clanId]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const inviteMember = useCallback(async (invitationData) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await clanService.inviteMember(invitationData);
            
            if (response.success) {
                // Optionally refresh members list
                await fetchMembers();
                return response.data.invitation;
            }
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchMembers]);

    const removeMember = useCallback(async (userId) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await clanService.removeMember(clanId, userId);
            
            if (response.success) {
                setMembers(prev => prev.filter(member => member.userId !== userId));
            }
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [clanId]);

    const updateMemberRole = useCallback(async (userId, roleData) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await clanService.updateMemberRole(clanId, userId, roleData);
            
            if (response.success) {
                setMembers(prev => prev.map(member => 
                    member.userId === userId 
                        ? { ...member, ...response.data.member }
                        : member
                ));
                return response.data.member;
            }
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [clanId]);

    return {
        members,
        loading,
        error,
        refetch: fetchMembers,
        inviteMember,
        removeMember,
        updateMemberRole
    };
};
```

## React Components

### 1. Clan List Component
```javascript
// components/ClanList.jsx
import React, { useState } from 'react';
import { useClans } from '../hooks/useClans';

export const ClanList = () => {
    const [filters, setFilters] = useState({
        category: '',
        location: '',
        sortBy: 'score',
        order: 'desc'
    });

    const { clans, loading, error, pagination, refetch } = useClans(filters);

    const handleFilterChange = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    if (loading) return <div>Loading clans...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="clan-list">
            <div className="filters">
                <select 
                    value={filters.category} 
                    onChange={(e) => handleFilterChange({ category: e.target.value })}
                >
                    <option value="">All Categories</option>
                    <option value="Technology">Technology</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                </select>
                
                <select 
                    value={filters.sortBy} 
                    onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
                >
                    <option value="score">Score</option>
                    <option value="name">Name</option>
                    <option value="reputationScore">Reputation</option>
                    <option value="totalGigs">Gigs</option>
                </select>
            </div>

            <div className="clans-grid">
                {clans.map(clan => (
                    <ClanCard key={clan.id} clan={clan} />
                ))}
            </div>

            {pagination.totalPages > 1 && (
                <Pagination 
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(page) => refetch({ ...filters, page })}
                />
            )}
        </div>
    );
};
```

### 2. Clan Card Component
```javascript
// components/ClanCard.jsx
import React from 'react';
import Link from 'next/link';

export const ClanCard = ({ clan }) => {
    return (
        <div className="clan-card">
            <div className="clan-header">
                <h3>{clan.name}</h3>
                {clan.isVerified && <span className="verified-badge">✓ Verified</span>}
            </div>
            
            <p className="tagline">{clan.tagline}</p>
            <p className="description">{clan.description}</p>
            
            <div className="clan-stats">
                <span>{clan._count.members} members</span>
                <span>{clan.totalGigs} gigs</span>
                <span>⭐ {clan.averageRating}</span>
            </div>
            
            <div className="clan-categories">
                {clan.categories.map(category => (
                    <span key={category} className="category-tag">{category}</span>
                ))}
            </div>
            
            <div className="clan-location">
                {clan.location && <span>📍 {clan.location}</span>}
            </div>
            
            <Link href={`/clans/${clan.slug}`}>
                <button className="view-clan-btn">View Clan</button>
            </Link>
        </div>
    );
};
```

### 3. Clan Detail Component
```javascript
// components/ClanDetail.jsx
import React from 'react';
import { useClan } from '../hooks/useClan';
import { useClanMembers } from '../hooks/useClanMembers';

export const ClanDetail = ({ clanId }) => {
    const { clan, loading: clanLoading, error: clanError } = useClan(clanId);
    const { 
        members, 
        loading: membersLoading, 
        inviteMember, 
        removeMember 
    } = useClanMembers(clanId);

    if (clanLoading) return <div>Loading clan...</div>;
    if (clanError) return <div>Error: {clanError}</div>;
    if (!clan) return <div>Clan not found</div>;

    return (
        <div className="clan-detail">
            <div className="clan-header">
                <h1>{clan.name}</h1>
                <p className="tagline">{clan.tagline}</p>
                <p className="description">{clan.description}</p>
            </div>

            <div className="clan-stats">
                <div className="stat">
                    <span className="label">Members</span>
                    <span className="value">{clan._count.members}</span>
                </div>
                <div className="stat">
                    <span className="label">Total Gigs</span>
                    <span className="value">{clan.totalGigs}</span>
                </div>
                <div className="stat">
                    <span className="label">Revenue</span>
                    <span className="value">${clan.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="stat">
                    <span className="label">Rating</span>
                    <span className="value">⭐ {clan.averageRating}</span>
                </div>
            </div>

            <div className="clan-members">
                <h2>Members</h2>
                {membersLoading ? (
                    <div>Loading members...</div>
                ) : (
                    <div className="members-grid">
                        {members.map(member => (
                            <MemberCard 
                                key={member.id} 
                                member={member}
                                onRemove={() => removeMember(member.userId)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
```

## Form Validation

### 1. Clan Creation Form
```javascript
// components/CreateClanForm.jsx
import React, { useState } from 'react';
import { clanService } from '../services/clan-service';

export const CreateClanForm = ({ onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        tagline: '',
        visibility: 'PUBLIC',
        email: '',
        website: '',
        primaryCategory: '',
        categories: [],
        skills: [],
        location: '',
        maxMembers: 50
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Clan name is required';
        } else if (formData.name.length < 2) {
            newErrors.name = 'Clan name must be at least 2 characters';
        }

        if (!formData.slug.trim()) {
            newErrors.slug = 'Slug is required';
        } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
            newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
        }

        if (formData.description && formData.description.length > 500) {
            newErrors.description = 'Description cannot exceed 500 characters';
        }

        if (formData.tagline && formData.tagline.length > 100) {
            newErrors.tagline = 'Tagline cannot exceed 100 characters';
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
            newErrors.website = 'Please enter a valid website URL';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        try {
            setLoading(true);
            const response = await clanService.createClan(formData);
            
            if (response.success) {
                onSuccess(response.data.clan);
            }
        } catch (error) {
            setErrors({ submit: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="create-clan-form">
            <div className="form-group">
                <label htmlFor="name">Clan Name *</label>
                <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={errors.name ? 'error' : ''}
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="slug">Slug *</label>
                <input
                    type="text"
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleChange('slug', e.target.value.toLowerCase())}
                    className={errors.slug ? 'error' : ''}
                />
                {errors.slug && <span className="error-message">{errors.slug}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    maxLength={500}
                    className={errors.description ? 'error' : ''}
                />
                {errors.description && <span className="error-message">{errors.description}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="tagline">Tagline</label>
                <input
                    type="text"
                    id="tagline"
                    value={formData.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    maxLength={100}
                    className={errors.tagline ? 'error' : ''}
                />
                {errors.tagline && <span className="error-message">{errors.tagline}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="visibility">Visibility</label>
                <select
                    id="visibility"
                    value={formData.visibility}
                    onChange={(e) => handleChange('visibility', e.target.value)}
                >
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                    <option value="INVITE_ONLY">Invite Only</option>
                </select>
            </div>

            <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="website">Website</label>
                <input
                    type="url"
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className={errors.website ? 'error' : ''}
                />
                {errors.website && <span className="error-message">{errors.website}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="primaryCategory">Primary Category</label>
                <input
                    type="text"
                    id="primaryCategory"
                    value={formData.primaryCategory}
                    onChange={(e) => handleChange('primaryCategory', e.target.value)}
                    maxLength={50}
                />
            </div>

            <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                    type="text"
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    maxLength={100}
                />
            </div>

            <div className="form-group">
                <label htmlFor="maxMembers">Max Members</label>
                <input
                    type="number"
                    id="maxMembers"
                    value={formData.maxMembers}
                    onChange={(e) => handleChange('maxMembers', parseInt(e.target.value))}
                    min={1}
                    max={1000}
                />
            </div>

            {errors.submit && <div className="error-message">{errors.submit}</div>}

            <button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Clan'}
            </button>
        </form>
    );
};
```

## Error Handling

### 1. Error Boundary Component
```javascript
// components/ClanErrorBoundary.jsx
import React from 'react';

export class ClanErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Clan Error Boundary:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <h2>Something went wrong with the clan feature</h2>
                    <p>Please try refreshing the page or contact support if the problem persists.</p>
                    <button onClick={() => window.location.reload()}>
                        Refresh Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
```

### 2. Error Toast Component
```javascript
// components/ErrorToast.jsx
import React from 'react';

export const ErrorToast = ({ error, onClose }) => {
    if (!error) return null;

    return (
        <div className="error-toast">
            <div className="error-content">
                <span className="error-icon">⚠️</span>
                <span className="error-message">{error}</span>
                <button onClick={onClose} className="close-btn">×</button>
            </div>
        </div>
    );
};
```

## CSS Styles

### 1. Basic Clan Styles
```css
/* clan-styles.css */
.clan-list {
    padding: 20px;
}

.filters {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.filters select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
}

.clans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}

.clan-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: box-shadow 0.2s;
}

.clan-card:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.clan-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.clan-header h3 {
    margin: 0;
    color: #333;
}

.verified-badge {
    background: #4CAF50;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
}

.tagline {
    color: #666;
    font-style: italic;
    margin-bottom: 10px;
}

.description {
    color: #555;
    margin-bottom: 15px;
    line-height: 1.4;
}

.clan-stats {
    display: flex;
    gap: 15px;
    margin-bottom: 15px;
    font-size: 14px;
    color: #666;
}

.clan-categories {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 15px;
}

.category-tag {
    background: #f0f0f0;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    color: #666;
}

.clan-location {
    margin-bottom: 15px;
    color: #666;
    font-size: 14px;
}

.view-clan-btn {
    width: 100%;
    padding: 10px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
}

.view-clan-btn:hover {
    background: #0056b3;
}

/* Form Styles */
.create-clan-form {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #333;
}

.form-group input,
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
}

.form-group input.error,
.form-group textarea.error,
.form-group select.error {
    border-color: #dc3545;
}

.error-message {
    color: #dc3545;
    font-size: 12px;
    margin-top: 5px;
    display: block;
}

/* Error Toast */
.error-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #dc3545;
    color: white;
    padding: 15px 20px;
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    z-index: 1000;
}

.error-content {
    display: flex;
    align-items: center;
    gap: 10px;
}

.close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    margin-left: 10px;
}
```

## Usage Examples

### 1. Page Component
```javascript
// pages/clans/index.js
import React from 'react';
import { ClanList } from '../../components/ClanList';
import { ClanErrorBoundary } from '../../components/ClanErrorBoundary';

export default function ClansPage() {
    return (
        <ClanErrorBoundary>
            <div className="clans-page">
                <h1>Discover Clans</h1>
                <ClanList />
            </div>
        </ClanErrorBoundary>
    );
}
```

### 2. Clan Detail Page
```javascript
// pages/clans/[slug].js
import React from 'react';
import { useRouter } from 'next/router';
import { ClanDetail } from '../../components/ClanDetail';
import { ClanErrorBoundary } from '../../components/ClanErrorBoundary';

export default function ClanDetailPage() {
    const router = useRouter();
    const { slug } = router.query;

    return (
        <ClanErrorBoundary>
            <div className="clan-detail-page">
                <ClanDetail clanId={slug} />
            </div>
        </ClanErrorBoundary>
    );
}
```

This integration guide provides everything you need to make the clan feature fully dynamic in your frontend application. The components, hooks, and services are designed to work together seamlessly with the clan service API. 