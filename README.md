Influencer Marketing Platform - Development Prompt
Project Overview
Build a LinkedIn-style platform connecting brands with influencers for marketing collaborations. The platform serves as a marketplace where brands post campaigns and influencers apply/get discovered.
Core Features to Implement
1. User Management System
    • Triple account types: Brand accounts, Influencer accounts, and Admin accounts
    • Authentication: JWT-based auth with refresh tokens, role-based access control (RBAC)
    • Profile management: Rich profiles with media uploads, portfolios, and metrics
    • Account verification: Admin-controlled verification system for credibility
    • Admin controls: User moderation, account suspension, content management
2. Discovery & Matching Engine
    • Search functionality: Filter influencers by niche, follower count, engagement rate, location
    • Recommendation system: Simple algorithm suggesting relevant matches
    • Browse campaigns: Influencers can browse and apply to open campaigns
    • Talent pool: Brands can search and invite influencers directly
3. Campaign Management
    • Campaign creation: Brands create detailed campaign briefs with requirements, budget, timeline
    • Application system: Influencers apply with proposals and portfolio samples
    • Selection process: Brands review applications and select influencers
    • Contract management: Basic agreement templates and status tracking
4. Communication Hub
    • Messaging system: Real-time chat between brands and influencers
    • Notifications: Campaign updates, new messages, application status changes
    • File sharing: Share briefs, assets, and deliverables within conversations
5. Admin Dashboard & System Monitoring
    • System health monitoring: Real-time service status, API response times, error rates
    • User management: View, edit, suspend, verify user accounts
    • Content moderation: Review reported content, manage campaigns, moderate messages
    • Analytics & reporting: Platform usage stats, revenue metrics, user behavior insights
    • System logs: Centralized logging with search, filtering, and alerting
    • Configuration management: Feature flags, system settings, maintenance mode
6. Revenue Features (LinkedIn-inspired)
    • Premium subscriptions: Enhanced profiles, advanced search filters, priority placement
    • Featured listings: Paid promotion for campaigns and profiles
    • Analytics dashboard: Performance metrics for premium users
    • InMail-style credits: Limited direct messages for free users, unlimited for premium
Technical Architecture
Microservices Structure
├── api-gateway/          # Route management, rate limiting, auth middleware
├── auth-service/         # JWT authentication, RBAC, user sessions
├── user-service/         # Profile management, account settings
├── campaign-service/     # Campaign CRUD, applications, moderation
├── messaging-service/    # Real-time chat, notifications
├── search-service/       # Search, recommendations, filtering
├── payment-service/      # Subscriptions, billing, revenue tracking
├── notification-service/ # Email, push, in-app notifications
├── media-service/        # File uploads, image processing
├── admin-service/        # Admin dashboard, system management
├── analytics-service/    # Data collection, reporting, insights
├── monitoring-service/   # Health checks, metrics, alerting
└── logging-service/      # Centralized logging, error tracking

Database Design
    • MongoDB: User profiles, campaigns, messages, applications, admin logs
    • Redis: Sessions, caching, real-time data, message queues, metrics storage
    • InfluxDB or TimeSeries: System metrics, performance data, analytics
    • Elasticsearch: Centralized logging, error tracking, search optimization
    • File storage: AWS S3 or similar for media assets
Technology Stack Implementation
    • Backend: Node.js + Express, TypeScript
    • Frontend Web: React + TypeScript, TailwindCSS
    • Admin Dashboard: React + TypeScript with data visualization (Chart.js/D3.js)
    • Mobile: React Native + TypeScript
    • Real-time: Socket.io for messaging and notifications
    • Monitoring: Prometheus + Grafana for metrics, Winston for logging
    • Documentation: Swagger/OpenAPI, auto-generated docs, Postman collections
    • Containerization: Docker with docker-compose for development
Development Phases
Phase 1: Core Foundation (Weeks 1-3)
    1. Set up microservices architecture with Docker
    2. Implement authentication service (JWT, refresh tokens)
    3. Build user service (registration, profiles, account types)
    4. Create basic frontend layouts for both web and mobile
    5. Set up Redis for caching and sessions
Phase 2: Campaign System (Weeks 4-6)
    1. Build campaign service (CRUD operations)
    2. Implement application system (apply, review, select)
    3. Create campaign browsing and search functionality
    4. Add basic matching/recommendation logic
    5. Implement file upload for campaign assets
Phase 3: Communication & Real-time (Weeks 7-8)
    1. Build messaging service with Socket.io
    2. Implement real-time notifications
    3. Create chat interfaces for web and mobile
    4. Add notification preferences and management
Phase 4: Admin Dashboard & Monitoring (Weeks 9-10)
    1. Build admin service with comprehensive dashboard
    2. Implement system health monitoring and alerting
    3. Create user management and moderation tools
    4. Set up centralized logging and error tracking
    5. Add analytics and reporting features
Phase 5: Premium Features & Revenue (Weeks 11-12)
    1. Implement subscription tiers and payment processing
    2. Add premium search filters and analytics
    3. Create featured listing system
    4. Build revenue tracking dashboard
Phase 6: Documentation & Polish (Weeks 13-14)
    1. Performance optimization and caching strategies
    2. Mobile app refinement and testing
    3. Admin panel for platform management
    4. Analytics and reporting features
Key Code Guidelines
Maintainability Principles
    • Use consistent naming conventions across all services
    • Implement proper error handling with standardized error responses
    • Write comprehensive TypeScript interfaces for all data models
    • Keep business logic separate from route handlers
    • Use middleware for common functionality (auth, validation, logging)
API Design Standards
    • RESTful endpoints with clear resource naming
    • Consistent response formats with status codes
    • Input validation using libraries like Joi or Yup
    • Rate limiting to prevent abuse
    • Comprehensive logging for debugging
Frontend Architecture
    • Component-based architecture with reusable UI components
    • Custom hooks for business logic
    • Context API for global state management
    • Responsive design patterns for mobile-first approach
    • Error boundaries for graceful error handling
Database Optimization
    • Proper indexing for search queries
    • Data aggregation pipelines for analytics
    • Connection pooling for performance
    • Regular cleanup jobs for expired data
Sample Implementation Starting Points
1. Authentication Service Structure
// auth-service/src/models/User.ts
interface User {
  id: string;
  email: string;
  accountType: 'brand' | 'influencer';
  profile: BrandProfile | InfluencerProfile;
  subscription: 'free' | 'premium';
  createdAt: Date;
}
2. Campaign Service Structure
// campaign-service/src/models/Campaign.ts
interface Campaign {
  id: string;
  brandId: string;
  title: string;
  description: string;
  requirements: string[];
  budget: { min: number; max: number };
  deadline: Date;
  status: 'open' | 'in_progress' | 'completed';
  applications: Application[];
}
3. Admin Service Structure
// admin-service/src/models/AdminUser.ts
interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'moderator' | 'support';
  permissions: string[];
  lastLogin: Date;
  createdAt: Date;
}
// admin-service/src/models/SystemMetrics.ts
interface SystemMetrics {
  timestamp: Date;
  activeUsers: number;
  totalCampaigns: number;
  errorRate: number;
  responseTime: number;
  revenue: number;
}
4. API Gateway Setup
    • Use Express Gateway or create custom gateway
    • Implement service discovery
    • Add request/response logging
    • Set up CORS and security headers
Documentation Strategy
API Documentation
    • Swagger/OpenAPI 3.0: Auto-generated from TypeScript interfaces
    • Postman Collections: Pre-configured API testing collections
    • SDK Generation: Auto-generate client SDKs for popular languages
    • Interactive docs: Swagger UI with try-it-now functionality
    • Versioning: Document API versions and deprecation notices
System Documentation
    • Architecture diagrams: Service interactions, data flow, deployment topology
    • Database schemas: Entity relationships, indexing strategies
    • Deployment guides: Environment setup, CI/CD pipeline configuration
    • Troubleshooting guides: Common issues and solutions
    • Performance benchmarks: Load testing results, optimization recommendations
Development Documentation
    • Code standards: Coding conventions, PR templates, commit message formats
    • Setup guides: Local development environment, Docker configuration
    • Testing strategies: Unit testing, integration testing, E2E testing approaches
    • Security guidelines: Authentication flows, data protection, vulnerability management
    • Contribution guidelines: For open-source or team collaboration
User Documentation
    • User guides: Feature walkthroughs for brands and influencers
    • Admin manual: Complete admin dashboard usage guide
    • API integration: Third-party integration examples and SDKs
    • FAQ sections: Common user questions and troubleshooting
    • Video tutorials: Screen recordings for complex workflows
Documentation Tools & Automation
// Auto-generate API docs from TypeScript interfaces
/**
 * @swagger
 * /api/campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignCreate'
 */
Documentation Maintenance
    • Automated updates: Sync docs with code changes via CI/CD
    • Review process: Documentation updates in PR reviews
    • Versioning: Maintain docs for different API/system versions
    • Metrics tracking: Documentation usage analytics
    • Feedback loops: User feedback integration for doc improvements
Subscription Tiers
    • Free: Basic profile, limited searches, 5 direct messages/month
    • Premium: Advanced analytics, unlimited messaging, priority support
    • Enterprise: Custom solutions, dedicated account manager
Additional Revenue Streams
    • Featured campaign listings
    • Profile boost/promotion
    • Premium placement in search results
    • Analytics and insights packages
Deployment & DevOps
Development Environment
# Docker setup for local development
docker-compose up -d  # Starts all services including monitoring
npm run dev:all       # Starts all services in development mode
npm run docs:serve    # Serves documentation locally
npm run logs:tail     # Tail logs from all services
Production Considerations
    • Container orchestration (Docker Swarm or Kubernetes)
    • Load balancing for high traffic
    • Database replication and backups
    • Comprehensive monitoring and alerting systems
    • Blue-green deployment for zero downtime
    • Automated backup and disaster recovery
    • Security scanning and vulnerability management
    • CI/CD pipeline with automated testing and documentation updates
Success Metrics to Track
    • User metrics: Acquisition, retention, engagement, churn rates
    • Business metrics: Campaign completion rates, revenue per user, subscription conversions
    • Technical metrics: System uptime, API performance, error rates
    • Admin efficiency: Support ticket resolution time, moderation queue processing
    • Platform health: Search effectiveness, matching accuracy, user satisfaction scores
Admin Role Implementation Details
Role-Based Access Control (RBAC)
// auth-service/src/middleware/rbac.ts
enum AdminRole {
  SUPER_ADMIN = 'super_admin',    // Full system access
  MODERATOR = 'moderator',        // Content moderation, user management
  SUPPORT = 'support',            // User support, basic analytics
  ANALYST = 'analyst'             // Read-only analytics and reports
}
interface AdminPermissions {
  users: ['read', 'write', 'delete'];
  campaigns: ['read', 'moderate', 'delete'];
  system: ['read', 'configure', 'maintain'];
  analytics: ['read', 'export'];
  billing: ['read', 'process', 'refund'];
}
Admin Dashboard Components
    • Real-time monitoring widgets: Live system status, active users, error alerts
    • Data visualization: Charts for user growth, revenue trends, system performance
    • Quick actions panel: Common admin tasks, bulk operations
    • Notification center: System alerts, user reports, critical issues
    • Activity feed: Recent platform activities, admin actions log
Error Handling & Alerting
// monitoring-service/src/alerts.ts
interface AlertRule {
  metric: string;
  threshold: number;
  duration: string;
  severity: 'critical' | 'warning' | 'info';
  channels: ['email', 'slack', 'sms'];
  escalation: boolean;
}
// Example alerts
const alertRules: AlertRule[] = [
  {
    metric: 'api_error_rate',
    threshold: 5, // 5% error rate
    duration: '5m',
    severity: 'critical',
    channels: ['email', 'slack'],
    escalation: true
  }
];
Next Steps After MVP
    1. Advanced analytics: Machine learning insights, predictive analytics
    2. Social media integration: Direct platform connections, automated posting
    3. Automated contract generation: Legal document templates, e-signatures
    4. Escrow payment system: Secure payment holding, milestone-based releases
    5. Review and rating system: Mutual feedback, reputation scores
    6. AI-powered recommendations: Smart matching, content suggestions
    7. Mobile admin app: On-the-go platform management
    8. Multi-language support: Internationalization and localization
    9. Advanced fraud detection: AI-powered security monitoring
    10. White-label solutions: Customizable platform for enterprise clients
Development Best Practices
Code Quality & Maintenance
    • TypeScript strict mode: Enforce type safety across all services
    • ESLint + Prettier: Consistent code formatting and linting
    • Husky git hooks: Pre-commit code quality checks
    • SonarQube: Code quality analysis and technical debt tracking
    • Dependency management: Regular security updates, vulnerability scanning
Testing Strategy
    • Unit tests: 80%+ coverage for business logic
    • Integration tests: API endpoint testing with real databases
    • E2E tests: Critical user journeys automated
    • Load testing: Performance benchmarks and stress testing
    • Security testing: OWASP compliance, penetration testing
Deployment & CI/CD
# .github/workflows/deploy.yml
name: Deploy Services
on:
  push:
    branches: [main]
jobs:
  test-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Run tests
      - name: Build Docker images
      - name: Update documentation
      - name: Deploy to staging
      - name: Run E2E tests
      - name: Deploy to production
      - name: Notify team
Remember to maintain documentation alongside development - treat it as a first-class citizen in your development process. This comprehensive approach will create a robust, maintainable platform that can scale with your business needs while providing excellent visibility into system health and user behavior.

From <https://claude.ai/chat/89eda411-2380-4f3a-9018-0acfe648890a> 

Brand & Creator Verification System
Multi-Tier Verification Approach
Verification Levels
    1. Basic Verified ✓ - Automated checks passed
    2. Business Verified ✓✓ - Document verification completed
    3. Premium Verified ✓✓✓ - Manual review + performance history
    4. Platform Endorsed 🏆 - Top performers with proven track record
Brand Verification System
Automated Verification (Basic ✓)
interface BrandVerificationChecks {
  // Business Registration
  gstNumber: string;           // GST registration verification
  cinNumber?: string;          // Corporate Identity Number
  panNumber: string;           // PAN verification
  
  // Online Presence
  website: string;             // Website ownership verification
  socialProfiles: {
    platform: string;
    url: string;
    followerCount: number;
    verified: boolean;         // Platform's native verification
  }[];
  
  // Contact Verification
  businessEmail: string;       // Email domain must match website
  phoneNumber: string;         // OTP verification
  officeAddress: string;       // Google Maps verification
}
Document Verification (Business ✓✓)
Required Documents:
    • GST Certificate or Udyog Aadhaar for Indian businesses
    • Certificate of Incorporation for companies
    • Business License (if applicable)
    • PAN Card of business/authorized signatory
    • Bank Statement (last 3 months) for financial verification
    • Letter of Authorization if someone else is managing the account
Verification Process:
    1. Document Upload: Secure encrypted upload system
    2. OCR + Manual Review: Extract details, verify authenticity
    3. Cross-Reference: Match with government databases (GST portal, MCA)
    4. Business Verification Call: Verify office address and operations
    5. Financial Health Check: Basic creditworthiness assessment
Advanced Verification (Premium ✓✓✓)
    • Financial Audit: Revenue verification, payment history
    • Reference Check: Previous influencer collaborations
    • Campaign Success Rate: Track record of successful campaigns
    • Legal Compliance: Check for any legal issues or complaints
Creator Verification System
Automated Verification (Basic ✓)
interface CreatorVerificationChecks {
  // Identity Verification
  aadhaarNumber?: string;      // Aadhaar verification (optional)
  panNumber: string;           // PAN verification for payments
  
  // Social Media Verification
  socialAccounts: {
    platform: 'instagram' | 'youtube' | 'twitter' | 'linkedin';
    username: string;
    followerCount: number;
    engagementRate: number;
    accountAge: number;        // Account creation date
    verifiedStatus: boolean;   // Platform's native verification
  }[];
  
  // Contact & Personal Info
  email: string;              // Email verification
  phoneNumber: string;        // OTP verification
  location: string;           // City/State verification
}
Social Media Authentication
Multi-Platform Verification:
    • Instagram: OAuth + follower analysis
    • YouTube: API integration for subscriber verification
    • Twitter/X: API for follower and engagement metrics
    • LinkedIn: Professional background verification
Fake Follower Detection:
interface FollowerAnalysis {
  suspiciousFollowers: number;     // Accounts with no profile pic, few posts
  engagementRate: number;          // Likes/comments vs followers ratio
  audienceQuality: {
    realFollowers: number;
    botFollowers: number;
    dormantAccounts: number;
  };
  growthPattern: {
    organicGrowth: boolean;        // Natural growth vs sudden spikes
    consistentEngagement: boolean;
    authenticity Score: number;    // 0-100 based on multiple factors
  };
}
Content Verification (Business ✓✓)
    • Portfolio Review: Quality and authenticity of previous content
    • Brand Collaboration History: Previous partnerships and performance
    • Content Originality: Check for plagiarism or recycled content
    • Audience Demographics: Verify target audience alignment
Professional Verification (Premium ✓✓✓)
    • Media Kit Review: Professional presentation and metrics
    • Performance Analytics: Campaign success rates, ROI generated
    • Client Testimonials: Feedback from previous brand collaborations
    • Exclusivity Agreements: Transparency about competing brand partnerships
Technical Implementation
Verification APIs & Services
Government Database Integration
// GST Verification Service
class GSTVerificationService {
  async verifyGST(gstNumber: string): Promise<GSTVerificationResult> {
    // Integrate with GST portal API
    const response = await fetch(`${GST_API_URL}/verify`, {
      method: 'POST',
      body: JSON.stringify({ gstin: gstNumber })
    });
    
    return {
      isValid: boolean,
      businessName: string,
      businessType: string,
      registrationDate: Date,
      status: 'active' | 'cancelled' | 'suspended'
    };
  }
}
Social Media Verification
// Instagram Verification Service
class InstagramVerificationService {
  async verifyAccount(username: string): Promise<InstagramVerification> {
    // Use Instagram Basic Display API + third-party tools
    const accountData = await this.getAccountData(username);
    const followerAnalysis = await this.analyzeFollowers(username);
    
    return {
      isVerified: accountData.is_verified,
      followerCount: accountData.followers_count,
      engagementRate: this.calculateEngagementRate(accountData),
      audienceQuality: followerAnalysis.qualityScore,
      suspiciousActivity: followerAnalysis.redFlags
    };
  }
  
  private calculateEngagementRate(data: any): number {
    // Algorithm to calculate genuine engagement
    const avgLikes = data.recent_posts.reduce((sum, post) => sum + post.like_count, 0) / data.recent_posts.length;
    const avgComments = data.recent_posts.reduce((sum, post) => sum + post.comments_count, 0) / data.recent_posts.length;
    
    return ((avgLikes + avgComments) / data.followers_count) * 100;
  }
}
Fraud Detection System
Red Flags for Brands
    • Sudden business registration with no online presence
    • Mismatch between business type and social media content
    • No verifiable office address or fake addresses
    • Unrealistic budget offers for campaign size
    • Payment history issues or chargebacks
Red Flags for Creators
    • Sudden follower spikes without viral content
    • Low engagement rate compared to follower count
    • Inconsistent content quality or style changes
    • Audience demographics don't match content niche
    • Multiple accounts with similar content
Verification Workflow
interface VerificationWorkflow {
  // Step 1: Automated Checks
  runAutomatedVerification(): Promise<AutoVerificationResult>;
  
  // Step 2: Document Verification (if needed)
  submitDocuments(documents: Document[]): Promise<void>;
  reviewDocuments(): Promise<DocumentReviewResult>;
  
  // Step 3: Manual Review (for premium verification)
  assignManualReviewer(): Promise<void>;
  conductVerificationCall(): Promise<CallResult>;
  
  // Step 4: Final Decision
  makeVerificationDecision(): Promise<VerificationDecision>;
  
  // Step 5: Ongoing Monitoring
  schedulePeriodicReview(): void;
  monitorAccountActivity(): void;
}
Verification UI/UX
Verification Dashboard
    • Progress Indicator: Show verification steps and current status
    • Document Upload: Secure, encrypted file upload with progress tracking
    • Status Updates: Real-time notifications about verification progress
    • Help Center: Guide users through verification process
Verification Badges
    • Badge Display: Clear visual indicators on profiles
    • Badge Meanings: Tooltip explanations for each verification level
    • Trust Score: Numerical score based on verification level and performance
Ongoing Monitoring
Continuous Verification
// Background monitoring service
class ContinuousMonitoringService {
  async monitorAccount(userId: string): Promise<void> {
    // Daily checks
    await this.checkSocialMediaMetrics(userId);
    await this.monitorEngagementPatterns(userId);
    await this.validateBusinessStatus(userId);
    
    // Weekly analysis
    await this.analyzePerformanceTrends(userId);
    await this.checkComplianceStatus(userId);
    
    // Monthly review
    await this.comprehensiveAccountReview(userId);
  }
}
Re-verification Triggers
    • Significant follower drops or suspicious activity
    • Complaints from other users
    • Failed campaign deliveries or quality issues
    • Changes in business registration or ownership
    • Periodic review (every 6-12 months for premium users)
Cost Structure
Verification Pricing Tiers
    • Basic Verification: Free (automated only)
    • Business Verification: ₹2,999 one-time (includes document review)
    • Premium Verification: ₹9,999 annually (comprehensive review + ongoing monitoring)
    • Enterprise Verification: Custom pricing for large brands
ROI for Platform
    • Higher trust leads to more successful campaigns
    • Premium verified users have higher engagement and retention
    • Reduced fraud saves customer support costs
    • Better matching improves platform reputation
Legal & Compliance
Data Protection
    • Encrypted storage for all verification documents
    • GDPR compliance for data handling
    • Document retention policy (delete after verification period)
    • Audit trail for all verification decisions
Verification Standards
    • Clear criteria published for each verification level
    • Appeal process for rejected verifications
    • Regular audit of verification decisions
    • Compliance reporting for regulatory requirements
This comprehensive verification system ensures genuine users while maintaining user experience and platform trust. The multi-tier approach allows for different levels of verification based on user needs and platform requirements.

From <https://claude.ai/chat/89eda411-2380-4f3a-9018-0acfe648890a> 
#   P r i v a t e   r e p o   t e s t  
 