# Client Implementation Guide: Gig-to-Clan Workflow

## Overview
This guide covers the client-side implementation for the new gig-to-clan workflow that allows clans to apply for gigs, manage work packages, and handle milestone-based payouts.

## Table of Contents
1. [New Data Models](#new-data-models)
2. [Updated API Endpoints](#updated-api-endpoints)
3. [Client-Side Implementation](#client-side-implementation)
4. [Real-time Notifications](#real-time-notifications)
5. [Error Handling](#error-handling)
6. [Example Implementations](#example-implementations)

## New Data Models

### 1. Application Model Updates
```typescript
interface Application {
  // ... existing fields
  clanId?: string;                    // New: For clan applications
  applicantType: 'user' | 'clan';    // New: Type of applicant
  teamPlan?: TeamPlan;               // New: Clan's team structure
  milestonePlan?: MilestonePlan[];   // New: Milestone breakdown
  payoutSplit?: PayoutSplit;         // New: Payment distribution
}

interface TeamPlan {
  members: TeamMember[];
  roles: string[];
  estimatedTotalHours: number;
}

interface TeamMember {
  userId: string;
  role: string;
  expectedHours: number;
  deliverables: string[];
}

interface MilestonePlan {
  title: string;
  description?: string;
  dueAt: string; // ISO date string
  amount: number;
  deliverables: string[];
}

interface PayoutSplit {
  type: 'percentage' | 'fixed';
  distribution: {
    [userId: string]: number; // percentage or fixed amount
  };
}
```

### 2. New Gig Assignment Models
```typescript
interface GigAssignment {
  id: string;
  gigId: string;
  assigneeType: 'user' | 'clan';
  assigneeId: string;
  clanId?: string;
  teamPlanSnapshot?: TeamPlan;
  milestonePlanSnapshot?: MilestonePlan[];
  payoutSplitSnapshot?: PayoutSplit;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  assignedAt: string;
  completedAt?: string;
  milestones: GigMilestone[];
  tasks: GigTask[];
}

interface GigMilestone {
  id: string;
  gigId: string;
  assignmentId: string;
  title: string;
  description?: string;
  dueAt: string;
  amount: number;
  deliverables: string[];
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt?: string;
  approvedAt?: string;
  paidAt?: string;
  feedback?: string;
  tasks: GigTask[];
}

interface GigTask {
  id: string;
  gigId: string;
  assignmentId: string;
  milestoneId?: string;
  title: string;
  description?: string;
  assigneeUserId: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  estimatedHours?: number;
  actualHours?: number;
  deliverables: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3. New Clan Work Package Models
```typescript
interface ClanWorkPackage {
  id: string;
  gigId: string;
  clanId: string;
  title: string;
  description?: string;
  assigneeUserId: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  estimatedHours?: number;
  actualHours?: number;
  deliverables: string[];
  notes?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface MemberAgreement {
  id: string;
  clanId: string;
  userId: string;
  gigId: string;
  role: string;
  expectedHours?: number;
  deliverables: string[];
  payoutPercentage?: number;
  payoutFixedAmount?: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Updated API Endpoints

### 1. Gig Service - New Endpoints

#### Apply to Gig (Updated)
```typescript
// POST /gigs/:gigId/apply
interface ApplyToGigRequest {
  applicantType: 'user' | 'clan';
  clanId?: string;                    // Required if applicantType is 'clan'
  teamPlan?: TeamPlan;               // Required if applicantType is 'clan'
  milestonePlan?: MilestonePlan[];   // Required if applicantType is 'clan'
  payoutSplit?: PayoutSplit;         // Required if applicantType is 'clan'
  // ... existing fields
}
```

#### Create Milestone
```typescript
// POST /gigs/:gigId/milestones
interface CreateMilestoneRequest {
  title: string;
  description?: string;
  dueAt: string;
  amount: number;
  deliverables: string[];
}
```

#### Submit Milestone
```typescript
// POST /gigs/:gigId/milestones/:milestoneId/submit
interface SubmitMilestoneRequest {
  deliverables: string[];
  notes?: string;
}
```

#### Approve Milestone
```typescript
// POST /gigs/:gigId/milestones/:milestoneId/approve
interface ApproveMilestoneRequest {
  feedback?: string;
}
```

#### Create Task
```typescript
// POST /gigs/:gigId/tasks
interface CreateTaskRequest {
  title: string;
  description?: string;
  assigneeUserId: string;
  milestoneId?: string;
  estimatedHours?: number;
  deliverables: string[];
}
```

#### Update Task
```typescript
// PATCH /gigs/:gigId/tasks/:taskId
interface UpdateTaskRequest {
  title?: string;
  description?: string;
  assigneeUserId?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  estimatedHours?: number;
  actualHours?: number;
  deliverables?: string[];
  notes?: string;
}
```

### 2. Clan Service - New Endpoints

#### Create Clan Gig Plan
```typescript
// POST /clan/:clanId/gigs/:gigId/plan
interface CreateClanGigPlanRequest {
  members: {
    userId: string;
    role: string;
    expectedHours: number;
    deliverables: string[];
    payoutPercentage?: number;
    payoutFixedAmount?: number;
  }[];
}
```

#### Create Clan Task
```typescript
// POST /clan/:clanId/gigs/:gigId/tasks
interface CreateClanTaskRequest {
  title: string;
  description?: string;
  assigneeUserId: string;
  estimatedHours?: number;
  deliverables: string[];
  dueDate?: string;
}
```

#### Update Clan Task
```typescript
// PATCH /clan/:clanId/gigs/:gigId/tasks/:taskId
interface UpdateClanTaskRequest {
  title?: string;
  description?: string;
  assigneeUserId?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
  estimatedHours?: number;
  actualHours?: number;
  deliverables?: string[];
  notes?: string;
  dueDate?: string;
}
```

#### Get Clan Tasks
```typescript
// GET /clan/:clanId/gigs/:gigId/tasks
// Returns: ClanWorkPackage[]
```

## Client-Side Implementation (Next.js)

### 1. API Client Setup

```typescript
// lib/api/gigApi.ts
class GigApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Get auth token from cookies or localStorage in Next.js
    const token = await this.getAuthToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async getAuthToken(): Promise<string> {
    // In Next.js, you might store tokens in cookies or use a state management solution
    // This is a placeholder - implement based on your auth strategy
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || '';
    }
    return '';
  }

  // Apply to gig (updated for clan support)
  async applyToGig(gigId: string, data: ApplyToGigRequest): Promise<Application> {
    return this.request<Application>(`/gigs/${gigId}/apply`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Create milestone
  async createMilestone(gigId: string, data: CreateMilestoneRequest): Promise<GigMilestone> {
    return this.request<GigMilestone>(`/gigs/${gigId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Submit milestone
  async submitMilestone(gigId: string, milestoneId: string, data: SubmitMilestoneRequest): Promise<GigMilestone> {
    return this.request<GigMilestone>(`/gigs/${gigId}/milestones/${milestoneId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Approve milestone
  async approveMilestone(gigId: string, milestoneId: string, data: ApproveMilestoneRequest): Promise<GigMilestone> {
    return this.request<GigMilestone>(`/gigs/${gigId}/milestones/${milestoneId}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Create task
  async createTask(gigId: string, data: CreateTaskRequest): Promise<GigTask> {
    return this.request<GigTask>(`/gigs/${gigId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update task
  async updateTask(gigId: string, taskId: string, data: UpdateTaskRequest): Promise<GigTask> {
    return this.request<GigTask>(`/gigs/${gigId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}
```

```typescript
// lib/api/clanApi.ts
class ClanApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Get auth token from cookies or localStorage in Next.js
    const token = await this.getAuthToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async getAuthToken(): Promise<string> {
    // In Next.js, you might store tokens in cookies or use a state management solution
    // This is a placeholder - implement based on your auth strategy
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken') || '';
    }
    return '';
  }

  // Create clan gig plan
  async createClanGigPlan(clanId: string, gigId: string, data: CreateClanGigPlanRequest): Promise<MemberAgreement[]> {
    return this.request<MemberAgreement[]>(`/clan/${clanId}/gigs/${gigId}/plan`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Create clan task
  async createClanTask(clanId: string, gigId: string, data: CreateClanTaskRequest): Promise<ClanWorkPackage> {
    return this.request<ClanWorkPackage>(`/clan/${clanId}/gigs/${gigId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update clan task
  async updateClanTask(clanId: string, gigId: string, taskId: string, data: UpdateClanTaskRequest): Promise<ClanWorkPackage> {
    return this.request<ClanWorkPackage>(`/clan/${clanId}/gigs/${gigId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Get clan tasks
  async getClanTasks(clanId: string, gigId: string): Promise<ClanWorkPackage[]> {
    return this.request<ClanWorkPackage[]>(`/clan/${clanId}/gigs/${gigId}/tasks`);
  }
}
```

### 2. Next.js Environment Configuration

Create a `.env.local` file in your Next.js project root:

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_CLAN_SERVICE_URL=http://localhost:3002
NEXT_PUBLIC_GIG_SERVICE_URL=http://localhost:3003
NEXT_PUBLIC_NOTIFICATION_SERVICE_URL=ws://localhost:3001
```

### 3. Next.js API Routes (Optional)

For server-side API calls or when you need to proxy requests, you can create Next.js API routes:

```typescript
// pages/api/gigs/[gigId]/apply.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res);
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { gigId } = req.query;
    const applicationData = req.body;

    // Forward request to your gig service
    const response = await fetch(`${process.env.GIG_SERVICE_URL}/gigs/${gigId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(applicationData),
    });

    const result = await response.json();
    res.status(response.status).json(result);
  } catch (error) {
    console.error('API route error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
```

### 3. React Hooks

```typescript
// hooks/useGigApplication.ts
import { useState, useCallback } from 'react';
import { GigApiClient } from '../lib/api/gigApi';

export const useGigApplication = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gigApiClient = new GigApiClient();

  const applyToGig = useCallback(async (
    gigId: string,
    data: ApplyToGigRequest
  ): Promise<Application | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await gigApiClient.applyToGig(gigId, data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply to gig');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    applyToGig,
    loading,
    error,
  };
};
```

```typescript
// hooks/useClanGigPlan.ts
import { useState, useCallback } from 'react';
import { ClanApiClient } from '../lib/api/clanApi';

export const useClanGigPlan = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clanApiClient = new ClanApiClient();

  const createGigPlan = useCallback(async (
    clanId: string,
    gigId: string,
    data: CreateClanGigPlanRequest
  ): Promise<MemberAgreement[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await clanApiClient.createClanGigPlan(clanId, gigId, data);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create gig plan');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createGigPlan,
    loading,
    error,
  };
};
```

### 4. Next.js Server-Side Data Fetching

For server-side rendering or static generation, you can use Next.js data fetching methods:

```typescript
// pages/gigs/[gigId]/clan-application.tsx
import { GetServerSideProps } from 'next';
import { ClanGigApplicationForm } from '../../components/ClanGigApplicationForm';

interface ClanGigApplicationPageProps {
  gig: Gig;
  clan: Clan;
  clanMembers: ClanMember[];
}

export const getServerSideProps: GetServerSideProps<ClanGigApplicationPageProps> = async (context) => {
  const { gigId, clanId } = context.params as { gigId: string; clanId: string };
  
  try {
    // Fetch data server-side
    const [gigRes, clanRes, membersRes] = await Promise.all([
      fetch(`${process.env.GIG_SERVICE_URL}/gigs/${gigId}`),
      fetch(`${process.env.CLAN_SERVICE_URL}/clan/${clanId}`),
      fetch(`${process.env.CLAN_SERVICE_URL}/clan/${clanId}/members`)
    ]);

    const [gig, clan, clanMembers] = await Promise.all([
      gigRes.json(),
      clanRes.json(),
      membersRes.json()
    ]);

    return {
      props: {
        gig: gig.data,
        clan: clan.data,
        clanMembers: clanMembers.data,
      },
    };
  } catch (error) {
    console.error('Failed to fetch data:', error);
    return {
      notFound: true,
    };
  }
};

export default function ClanGigApplicationPage({ gig, clan, clanMembers }: ClanGigApplicationPageProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Apply to {gig.title} as {clan.name}</h1>
      <ClanGigApplicationForm
        gigId={gig.id}
        clanId={clan.id}
        clanMembers={clanMembers}
        onSubmit={(application) => {
          // Handle submission
          console.log('Application submitted:', application);
        }}
      />
    </div>
  );
}
```

### 5. React Components

#### Clan Gig Application Form
```typescript
// components/ClanGigApplicationForm.tsx
import React, { useState } from 'react';
import { useGigApplication } from '../hooks/useGigApplication';

interface ClanGigApplicationFormProps {
  gigId: string;
  clanId: string;
  clanMembers: ClanMember[];
  onSubmit: (application: Application) => void;
}

export const ClanGigApplicationForm: React.FC<ClanGigApplicationFormProps> = ({
  gigId,
  clanId,
  clanMembers,
  onSubmit,
}) => {
  const { applyToGig, loading, error } = useGigApplication();
  const [teamPlan, setTeamPlan] = useState<TeamPlan>({
    members: [],
    roles: [],
    estimatedTotalHours: 0,
  });
  const [milestonePlan, setMilestonePlan] = useState<MilestonePlan[]>([]);
  const [payoutSplit, setPayoutSplit] = useState<PayoutSplit>({
    type: 'percentage',
    distribution: {},
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const application = await applyToGig(gigId, {
      applicantType: 'clan',
      clanId,
      teamPlan,
      milestonePlan,
      payoutSplit,
    });

    if (application) {
      onSubmit(application);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Team Plan Section */}
      <div>
        <h3 className="text-lg font-medium">Team Plan</h3>
        {/* Team member selection and role assignment */}
      </div>

      {/* Milestone Plan Section */}
      <div>
        <h3 className="text-lg font-medium">Milestone Plan</h3>
        {/* Milestone creation and management */}
      </div>

      {/* Payout Split Section */}
      <div>
        <h3 className="text-lg font-medium">Payout Split</h3>
        {/* Payment distribution configuration */}
      </div>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  );
};
```

#### Clan Task Management
```typescript
// components/ClanTaskManagement.tsx
import React, { useState, useEffect } from 'react';
import { useClanGigPlan } from '../hooks/useClanGigPlan';

interface ClanTaskManagementProps {
  clanId: string;
  gigId: string;
}

export const ClanTaskManagement: React.FC<ClanTaskManagementProps> = ({
  clanId,
  gigId,
}) => {
  const { createGigPlan, loading, error } = useClanGigPlan();
  const [tasks, setTasks] = useState<ClanWorkPackage[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    // Load existing tasks
    loadTasks();
  }, [clanId, gigId]);

  const loadTasks = async () => {
    try {
      const result = await clanApiClient.getClanTasks(clanId, gigId);
      setTasks(result);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  const handleCreateTask = async (taskData: CreateClanTaskRequest) => {
    try {
      const newTask = await clanApiClient.createClanTask(clanId, gigId, taskData);
      setTasks(prev => [...prev, newTask]);
      setShowCreateForm(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Clan Tasks</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
        >
          Create Task
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} className="border p-4 rounded-md">
            <h3 className="font-medium">{task.title}</h3>
            <p className="text-gray-600">{task.description}</p>
            <div className="flex justify-between items-center mt-2">
              <span className={`px-2 py-1 rounded-full text-xs ${
                task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {task.status}
              </span>
              <span className="text-sm text-gray-500">
                Due: {new Date(task.dueDate || '').toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Form */}
      {showCreateForm && (
        <CreateTaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};
```

## Real-time Notifications

### WebSocket Event Handling
```typescript
// services/websocketService.ts
class WebSocketService {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  connect(url: string) {
    this.ws = new WebSocket(url);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleEvent(data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
      // Implement reconnection logic
      setTimeout(() => this.connect(url), 5000);
    };
  }

  private handleEvent(data: any) {
    const { type, payload } = data;
    const handlers = this.eventHandlers.get(type) || [];
    
    handlers.forEach(handler => handler(payload));
  }

  on(eventType: string, handler: Function) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  off(eventType: string, handler: Function) {
    const handlers = this.eventHandlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }
}

// Usage in components
const wsService = new WebSocketService();

// Listen for clan events
wsService.on('clan.member.joined', (payload) => {
  console.log('Member joined clan:', payload);
  // Update UI accordingly
});

wsService.on('clan.member.left', (payload) => {
  console.log('Member left clan:', payload);
  // Update UI accordingly
});

wsService.on('gig.milestone.approved', (payload) => {
  console.log('Milestone approved:', payload);
  // Update UI accordingly
});

// Connect to notification service
wsService.connect('ws://localhost:3001');
```

### Next.js Middleware for Authentication

Create a middleware file to handle authentication across your app:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;
  
  // Protect API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Protect protected pages
  if (request.nextUrl.pathname.startsWith('/gigs/') || 
      request.nextUrl.pathname.startsWith('/clan/')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/gigs/:path*', '/clan/:path*'],
};
```

## Error Handling

### API Error Handling
```typescript
// utils/apiErrorHandler.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: any): ApiError => {
  if (error instanceof ApiError) {
    return error;
  }

  if (error.response) {
    return new ApiError(
      error.response.data?.message || 'API request failed',
      error.response.status,
      error.response.data?.code
    );
  }

  return new ApiError(
    error.message || 'Network error',
    0
  );
};

// Usage in API calls
try {
  const result = await apiClient.someMethod();
  return result;
} catch (error) {
  const apiError = handleApiError(error);
  
  switch (apiError.status) {
    case 401:
      // Handle unauthorized
      break;
    case 403:
      // Handle forbidden
      break;
    case 404:
      // Handle not found
      break;
    case 422:
      // Handle validation error
      break;
    default:
      // Handle other errors
      break;
  }
  
  throw apiError;
}
```

## Example Implementations

### Complete Clan Gig Application Flow
```typescript
// pages/gigs/[gigId]/clan-application.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ClanGigApplicationForm } from '../../../components/ClanGigApplicationForm';
import { useGigApplication } from '../../../hooks/useGigApplication';

export default function ClanGigApplicationPage() {
  const router = useRouter();
  const { gigId } = router.query;
  const [currentStep, setCurrentStep] = useState(1);
  const [applicationData, setApplicationData] = useState<any>({});
  const { applyToGig } = useGigApplication();

  const steps = [
    { id: 1, title: 'Team Plan', component: TeamPlanStep },
    { id: 2, title: 'Milestone Plan', component: MilestoneStep },
    { id: 3, title: 'Payout Split', component: PayoutSplitStep },
    { id: 4, title: 'Review & Submit', component: ReviewStep },
  ];

  const handleStepComplete = (stepData: any) => {
    setApplicationData(prev => ({ ...prev, ...stepData }));
    setCurrentStep(prev => prev + 1);
  };

  const handleSubmit = async (finalData: any) => {
    if (!gigId || typeof gigId !== 'string') return;
    
    try {
      const application = await applyToGig(gigId, {
        ...applicationData,
        ...finalData,
      });
      
      if (application) {
        // Handle success
        router.push(`/gigs/${gigId}/application-success`);
      }
    } catch (error) {
      // Handle error
      console.error('Application failed:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Apply to Gig as Clan</h1>
      
      {/* Progress Steps */}
      <div className="flex justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep > step.id ? 'bg-green-500 text-white' :
              currentStep === step.id ? 'bg-blue-500 text-white' :
              'bg-gray-300 text-gray-600'
            }`}>
              {currentStep > step.id ? '✓' : step.id}
            </div>
            <span className="ml-2 text-sm font-medium">{step.title}</span>
            {index < steps.length - 1 && (
              <div className="w-16 h-0.5 bg-gray-300 mx-4" />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Component */}
      {(() => {
        const StepComponent = steps[currentStep - 1].component;
        return (
          <StepComponent
            data={applicationData}
            onComplete={handleStepComplete}
            onSubmit={handleSubmit}
            isLastStep={currentStep === steps.length}
          />
        );
      })()}
    </div>
  );
};
```

### Task Management Dashboard
```typescript
// components/TaskDashboard.tsx
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface TaskDashboardProps {
  gigId: string;
  clanId: string;
}

export const TaskDashboard: React.FC<TaskDashboardProps> = ({
  gigId,
  clanId,
}) => {
  const [tasks, setTasks] = useState<ClanWorkPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [gigId, clanId]);

  const loadTasks = async () => {
    try {
      const result = await clanApiClient.getClanTasks(clanId, gigId);
      setTasks(result);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) {
      // Same column reorder
      const column = source.droppableId;
      const newTasks = reorderTasks(tasks, source.index, destination.index, column);
      setTasks(newTasks);
    } else {
      // Move between columns
      const newStatus = destination.droppableId;
      const taskId = draggableId;
      
      try {
        await clanApiClient.updateClanTask(clanId, gigId, taskId, {
          status: newStatus as any,
        });
        
        // Update local state
        setTasks(prev => prev.map(task =>
          task.id === taskId ? { ...task, status: newStatus as any } : task
        ));
      } catch (error) {
        console.error('Failed to update task status:', error);
        // Revert the change
        loadTasks();
      }
    }
  };

  const columns = {
    TODO: tasks.filter(task => task.status === 'TODO'),
    'IN_PROGRESS': tasks.filter(task => task.status === 'IN_PROGRESS'),
    REVIEW: tasks.filter(task => task.status === 'REVIEW'),
    COMPLETED: tasks.filter(task => task.status === 'COMPLETED'),
  };

  if (loading) {
    return <div>Loading tasks...</div>;
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(columns).map(([status, columnTasks]) => (
          <div key={status} className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-4 text-gray-700">{status}</h3>
            
            <Droppable droppableId={status}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2 min-h-[200px]"
                >
                  {columnTasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white p-3 rounded border shadow-sm"
                        >
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {task.description}
                          </p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-gray-500">
                              {task.assigneeUserId}
                            </span>
                            {task.dueDate && (
                              <span className="text-xs text-gray-500">
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};
```

## Next.js Best Practices

### 1. File Structure
```
your-nextjs-app/
├── components/
│   ├── ClanGigApplicationForm.tsx
│   ├── ClanTaskManagement.tsx
│   └── TaskDashboard.tsx
├── hooks/
│   ├── useGigApplication.ts
│   └── useClanGigPlan.ts
├── lib/
│   └── api/
│       ├── gigApi.ts
│       └── clanApi.ts
├── pages/
│   ├── api/
│   │   └── gigs/
│   │       └── [gigId]/
│   │           └── apply.ts
│   ├── gigs/
│   │   └── [gigId]/
│   │       └── clan-application.tsx
│   └── clan/
│       └── [clanId]/
│           └── gigs/
│               └── [gigId]/
│                   └── tasks.tsx
├── middleware.ts
├── .env.local
└── next.config.js
```

### 2. Environment Variables
Make sure to add your environment variables to `.env.local`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NEXT_PUBLIC_CLAN_SERVICE_URL=http://localhost:3002
NEXT_PUBLIC_GIG_SERVICE_URL=http://localhost:3003
NEXT_PUBLIC_NOTIFICATION_SERVICE_URL=ws://localhost:3001
```

### 3. TypeScript Configuration
Update your `tsconfig.json` to include the new paths:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/lib/*": ["./lib/*"]
    }
  }
}
```

## Summary

This Next.js implementation guide covers:

1. **New Data Models**: Updated Application model and new models for GigAssignment, GigMilestone, GigTask, ClanWorkPackage, and MemberAgreement
2. **API Endpoints**: New endpoints for clan gig workflow management
3. **Next.js Implementation**: API clients, React hooks, components, and server-side data fetching
4. **Real-time Updates**: WebSocket integration for live notifications
5. **Error Handling**: Comprehensive error handling strategies with Next.js middleware
6. **Example Components**: Complete implementation examples using Next.js patterns
7. **Next.js Best Practices**: File structure, environment configuration, and TypeScript setup

The guide provides a comprehensive foundation for implementing the gig-to-clan workflow in a Next.js application, enabling clans to apply for gigs, manage work packages, and handle milestone-based payouts effectively while following Next.js best practices.
