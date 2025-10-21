# 📱 Profile Page Design & Implementation Guide

## 🎯 **Overview**
Comprehensive profile page that consolidates data from multiple microservices into a cohesive, editable user experience.

## 📊 **Data Sources Mapping**

### **User Service (Port 4002)**
```typescript
interface UserProfileData {
  // Basic Info
  id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  phone?: string
  bio?: string
  location?: string
  profilePicture?: string
  coverImage?: string
  
  // Social Media
  instagramHandle?: string
  twitterHandle?: string
  linkedinHandle?: string
  youtubeHandle?: string
  website?: string
  
  // Role-specific Data
  roles: string[]
  
  // Influencer Data
  contentCategories: string[]
  primaryNiche?: string
  primaryPlatform?: string
  estimatedFollowers?: number
  
  // Brand Data
  companyName?: string
  companyType?: string
  industry?: string
  gstNumber?: string
  companyWebsite?: string
  marketingBudget?: string
  targetAudience: string[]
  campaignTypes: string[]
  designationTitle?: string
  
  // Crew Data
  crewSkills: string[]
  experienceLevel?: string
  equipmentOwned: string[]
  portfolioUrl?: string
  hourlyRate?: number
  availability?: string
  workStyle?: string
  specializations: string[]
}
```

### **Work History Service (Port 4007)**
```typescript
interface WorkHistoryData {
  workSummary: {
    totalProjects: number
    averageRating: number
    onTimeDeliveryRate: number
    totalEarnings: number
    completionRate: number
  }
  skills: Array<{
    skill: string
    level: string
    score: number
    projectCount: number
    averageRating: number
  }>
  achievements: Array<{
    type: string
    title: string
    description: string
    achievedAt: string
    verified: boolean
  }>
  recentWork: Array<{
    title: string
    category: string
    clientRating: number
    completedAt: string
    verified: boolean
  }>
}
```

### **Analytics Service (Port 4002/analytics)**
```typescript
interface AnalyticsData {
  profileViews: number
  searchAppearances: number
  popularityScore: number
  engagementScore: number
  lastViewedAt?: string
}
```

## 🎨 **Profile Page Components Structure**

```
ProfilePage/
├── ProfileHeader/
│   ├── CoverImage
│   ├── ProfilePicture
│   ├── BasicInfo (name, username, location)
│   ├── RoleBadges
│   └── ActionButtons (edit, share, boost)
├── ProfileTabs/
│   ├── OverviewTab/
│   │   ├── AboutSection
│   │   ├── StatsOverview
│   │   ├── SocialLinks
│   │   └── ContactInfo
│   ├── WorkHistoryTab/
│   │   ├── WorkSummary
│   │   ├── SkillsProficiency
│   │   ├── Achievements
│   │   └── RecentProjects
│   ├── PortfolioTab/
│   │   ├── FeaturedWork
│   │   ├── MediaGallery
│   │   └── ClientTestimonials
│   └── SettingsTab/ (owner only)
│       ├── ProfileSettings
│       ├── RoleSettings
│       ├── PrivacySettings
│       └── NotificationSettings
└── EditModal/
    ├── BasicInfoForm
    ├── SocialMediaForm
    ├── RoleSpecificForms
    └── WorkHistoryForm
```

## 🚀 **API Integration Plan**

### **Data Fetching Strategy**
```typescript
// Single API call to get complete profile data
const fetchCompleteProfile = async (userId: string) => {
  const [
    userProfile,
    workHistory,
    analytics,
    reputation
  ] = await Promise.all([
    apiClient.get(`/api/user/profile`), // or /api/public/users/${userId}
    apiClient.get(`/api/work-history/users/${userId}/summary`),
    apiClient.get(`/api/analytics/user-insights/${userId}`),
    apiClient.get(`/api/reputation/users/${userId}`)
  ])
  
  return {
    user: userProfile.data,
    workHistory: workHistory.data,
    analytics: analytics.data,
    reputation: reputation.data
  }
}
```

### **Update Strategy**
```typescript
// Granular updates to specific services
const updateProfileSection = async (section: string, data: any) => {
  switch (section) {
    case 'basicInfo':
      return apiClient.put('/api/user/profile', data)
    case 'socialMedia':
      return apiClient.put('/api/user/social', data)
    case 'roleInfo':
      return apiClient.put('/api/user/roles-info', data)
    case 'workHistory':
      return apiClient.put('/api/work-history/profile', data)
    case 'settings':
      return apiClient.put('/api/user/settings', data)
  }
}
```

## 📱 **Responsive Design Considerations**

### **Desktop Layout (1200px+)**
- Two-column layout with sidebar
- Tabbed interface for different sections
- Inline editing for quick updates

### **Tablet Layout (768px - 1199px)**
- Single column with collapsible sections
- Modal forms for editing
- Swipeable tabs

### **Mobile Layout (< 768px)**
- Stacked components
- Bottom sheet for editing
- Simplified view with essential info

## 🎯 **Role-Specific Customization**

### **Influencer Profile**
- Focus on content categories, follower count
- Engagement metrics prominently displayed
- Social media handles highlighted
- Content portfolio showcase

### **Brand Profile**
- Company information section
- Marketing budget and target audience
- Campaign types and industry focus
- Team member profiles (if applicable)

### **Crew Profile**
- Skills and equipment showcase
- Hourly rate and availability
- Portfolio of completed work
- Client testimonials and ratings

## 🔧 **Technical Implementation Details**

### **State Management**
```typescript
interface ProfileState {
  user: UserProfileData | null
  workHistory: WorkHistoryData | null
  analytics: AnalyticsData | null
  reputation: ReputationData | null
  loading: boolean
  editing: {
    section: string | null
    data: any
  }
  errors: Record<string, string>
}
```

### **Caching Strategy**
- Profile data cached for 5 minutes
- Analytics data refreshed on every visit
- Work history cached for 1 hour
- Real-time updates for profile changes

### **Performance Optimization**
- Lazy load non-critical sections
- Image optimization for profile/cover pictures
- Skeleton loading states
- Progressive data loading

## 🎨 **UI/UX Best Practices**

### **Visual Hierarchy**
1. Profile picture and name (most prominent)
2. Role badges and key stats
3. About section and social links
4. Detailed work history and portfolio
5. Settings and admin options

### **Interaction Patterns**
- Click to edit inline for simple fields
- Modal forms for complex data entry
- Drag and drop for portfolio items
- Auto-save for settings changes

### **Accessibility**
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader friendly content
- High contrast mode support

## 🔐 **Privacy & Permissions**

### **Visibility Rules**
```typescript
const getFieldVisibility = (field: string, userRole: string, isOwner: boolean) => {
  const publicFields = ['firstName', 'lastName', 'username', 'bio', 'location', 'socialHandles']
  const roleSpecificFields = {
    INFLUENCER: ['contentCategories', 'primaryNiche', 'estimatedFollowers'],
    BRAND: ['companyName', 'industry', 'companyWebsite'],
    CREW: ['skills', 'experienceLevel', 'hourlyRate', 'availability']
  }
  
  if (isOwner) return true
  if (publicFields.includes(field)) return true
  if (roleSpecificFields[userRole]?.includes(field)) return true
  
  return false
}
```

### **Edit Permissions**
- Users can only edit their own profiles
- Admins can edit certain fields for all users
- Some fields require verification (work history, achievements)

## 📊 **Analytics & Tracking**

### **Profile View Tracking**
```typescript
const trackProfileView = (profileUserId: string, viewerUserId?: string) => {
  apiClient.post('/api/analytics/profile-view', {
    profileUserId,
    viewerUserId,
    timestamp: new Date().toISOString()
  })
}
```

### **Edit Tracking**
```typescript
const trackProfileEdit = (section: string, fields: string[]) => {
  apiClient.post('/api/analytics/profile-edit', {
    section,
    fields,
    timestamp: new Date().toISOString()
  })
}
```

This comprehensive profile page design will provide a seamless experience for users to view and edit their complete profile across all your microservices!
