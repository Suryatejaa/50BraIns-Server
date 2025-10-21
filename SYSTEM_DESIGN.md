                          ┌────────────────────┐
                          │    API Gateway     │
                          └────────────────────┘
                                   │
        ┌──────────────┬────────────┴─────────────┬──────────────┐
        ↓              ↓                          ↓              ↓

┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ AuthService │ │ UserService │ │ MediaService │ │ SearchService│
└─────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
↓ ↓ ↓ ↓
┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Influencer │ │ BrandService │ │ CampaignSvc │ │ GigService │
│ Service │ └──────────────┘ └──────────────┘ └──────────────┘
└─────────────┘
↓
┌──────────────┐
│ MessagingSvc │ (later)
└──────────────┘

model InfluencerProfile {
id String @id @default(cuid())
userId String @unique
platform Platform // ENUM: INSTAGRAM | YOUTUBE | BOTH
reach Int
followers Int
engagement Float
categories Category[] // many-to-many
reels Reel[]
gigs GigApplication[]

user User @relation(fields: [userId], references: [id])
}

model BrandProfile {
id String @id @default(cuid())
userId String @unique
companyName String
industry String
postedGigs Campaign[]
brainsLists BrainsList[]

user User @relation(fields: [userId], references: [id])
}

model Campaign {
id String @id @default(cuid())
brandId String
title String
description String
budget Int
startDate DateTime
endDate DateTime
category String
applicants GigApplication[]

brand BrandProfile @relation(fields: [brandId], references: [id])
}

model GigApplication {
id String @id @default(cuid())
campaignId String
influencerId String
status GigStatus // ENUM: APPLIED | SHORTLISTED | SELECTED | REJECTED

campaign Campaign
influencer InfluencerProfile
}

model BrainsList {
id String @id @default(cuid())
brandId String
title String
createdAt DateTime @default(now())

influencers InfluencerProfile[]
brand BrandProfile @relation(fields: [brandId], references: [id])
}

🔥 Now _that’s_ the complete picture, Surya. You're not just building a hiring platform—
You're architecting a **creative ecosystem where roles feed roles** like a cascading production pipeline.

Let’s **evolve the system design + ERD** to reflect the **crew economy**, **multi-directional hiring**, and **universal analytics layer.**

---

## 🧠 Revised Conceptual Flow (Creative Chain)

```
┌──────────┐      ┌────────────┐      ┌──────────────┐
│  Brand   │──▶──▶│ Influencer │──▶──▶│     Crew      │
│          │      └────────────┘      │ (writers, etc.)│
│          │─────────────▶──────────▶└──────────────┘
│          │──▶──────▶──────▶────────────▶──▶──────▶──
│     Direct hire to crew possible too                     │
└──────────┘
```

- Influencers become **executors** of brand intent.
- Crew becomes **executors** of influencer vision.
- Platform becomes **the hiring + discovery + performance oracle** for all.

---

## 📊 Requirement Update: Stats for All roles

### ✅ What You Need:

1. **Universal Analytics Table**

   - Engagement rate (posts/works)
   - Response rate to gigs
   - Completion stats
   - Ratings, reviews
   - Earnings (₹ + hours)
   - Skill tags

2. **Multi-roles Hiring Logic**

   - Any user can hire any other user
   - Based on skillset, not just “roles”
   - Gig originator ≠ always brand (influencer can post gigs for crew)

3. **Extended Profile Types**

   - Writers, editors, DOPs, voice artists, musicians, colorists, stylists, etc.

---

## 🗃️ Extended DB Architecture (Concept)

### New Models:

#### 🎭 `CreativeProfile` (Polymorphic Profile Type)

```prisma
model CreativeProfile {
  id          String   @id @default(cuid())
  userId      String   @unique
  profession  Profession // ENUM: DOP | WRITER | EDITOR | ARTIST | etc.
  skillTags   String[]
  bio         String
  reels       Reel[]
  gigs        GigApplication[]
  rating      Float?

  user        User @relation(fields: [userId], references: [id])
}
```

#### 📊 `UserAnalytics`

```prisma
model UserAnalytics {
  id          String   @id @default(cuid())
  userId      String   @unique
  gigsPosted  Int
  gigsApplied Int
  gigsWon     Int
  avgRating   Float
  earnings    Int
  profileViews Int
  responseRate Float

  user        User @relation(fields: [userId], references: [id])
}
```

#### 📦 `Gig` (Unified Gig Model)

```prisma
model Gig {
  id           String   @id @default(cuid())
  creatorId    String   // who posted the gig
  title        String
  type         GigType  // ENUM: CREW_HIRE | PROMOTION | COLLAB
  budget       Int
  rolesWanted   String   // DOP | WRITER | INFLUENCER | etc.
  deadline     DateTime
  applicants   GigApplication[]

  creator      User @relation(fields: [creatorId], references: [id])
}
```

---

## 🔧 Updated Services You’ll Need (Prioritized)

| Service               | Priority   | Dependent On    |
| --------------------- | ---------- | --------------- |
| ✅ AuthService        | Done       | —               |
| ✅ UserService        | Done       | —               |
| ✅ InfluencerService  | Done       | —               |
| 🔜 CreativeService    | ⭐️ High   | UserService     |
| 🔜 GigService         | ⭐️ High   | CreativeService |
| 🔜 ApplicationService | ⭐️ High   | GigService      |
| 🔜 AnalyticsService   | ⭐️ High   | All users       |
| 🔜 ReviewService      | ⭐️ Medium | GigService      |
| 💤 MessagingService   | Later      | Auth, User      |

---

## 📊 Final Vision: Everyone Is Measurable, Discoverable, and Monetizable

| roles      | Discoverable by   | Hires Who                          |
| ---------- | ----------------- | ---------------------------------- |
| Brand      | Influencer + Crew | Influencer / Crew                  |
| Influencer | Brand + Crew      | Crew                               |
| Crew       | Everyone          | Rare (can collab or offer service) |

And every profile gets:

- Stats: Gigs done, Avg budget, Response rate
- Reviews: Written testimonials
- Scorecards: Auto-generated from activity

---

## 🚀 This Product is Now:

> 🔁 **Two-sided + Multi-tiered marketplace**
> 🎭 **Multi-roles orchestration**
> 📊 **Live performance analytics engine**
> 💬 **Asynchronous hiring & storytelling machine**

---

## Next Steps:

- [ ] Update ERD with `CreativeProfile`, `Gig`, `UserAnalytics`
- [ ] Update Prisma schemas (want me to do this?)
- [ ] Plan dev sprints (1-week sprints per service?)
- [ ] Build onboarding UX to allow multi-roles signups

Say the word and I’ll generate the updated ERD diagram right now for this evolved model 💥



🗃️ Suggested DB Names Across Services (Final Naming Table)
Service	Database Name
AuthService	auth_db
UserService	users_db
CreativeService	creative_db
InfluencerService	influencer_db
BrandService	brand_db
CampaignService	campaign_db
GigApplicationService	gigs_db
MediaService	media_db
AnalyticsService	analytics_db
SearchService	search_index

You don't need 10 DBs from day one — just name them right so scaling later isn’t a mess.