### Goals
- **Brands**: reliable delivery, single point-of-contact, outcome-based milestones.
- **Clans**: apply as a team, split work clearly, lock fair pay upfront.
- **Members**: transparent roles, deliverables, and payouts.

### Roles
- **Brand**: posts gig, reviews plans, approves milestones, releases funds.
- **Clan owner/head/admin**: applies, sets team plan/splits, manages execution.
- **Clan members**: accept assignments, deliver tasks, request milestone reviews.

### End-to-end flow
1) **Brand posts gig**
- Gig includes scope, budget range, milestones (optional), acceptance criteria.
- Event: `gig.created`.

2) **Clan applies**
- Clan owner/admin submits application with:
  - teamPlan: roles → members, expected hours/deliverables
  - milestonePlan: milestones with deliverables, dates
  - payoutSplit: memberId → percentage or fixed amount per milestone
- Applicant is `applicantType='CLAN'`, includes `clanId`.
- Event: `gig.application.submitted` + `clan.join_request.submitted` (if clan gating is needed elsewhere).

3) **Brand reviews**
- Can request changes; clan resubmits.
- On approval, brand accepts clan as assignee.
- Events: `gig.application.accepted`, `clan.gig.assigned`.

4) **Assignment + internal plan lock**
- Gig becomes assigned to `clanId`.
- Lock `teamPlan`, `milestonePlan`, and `payoutSplit` snapshot; further edits require brand approval.
- Credit service optionally escrows milestone budgets.

5) **Execution**
- Clan creates internal `workPackages`/`tasks` mapped to milestones.
- Members accept tasks; status tracked (todo/in-progress/review/done).
- Events per task state change and milestone progress.

6) **Delivery + approval**
- Clan marks milestone delivered; brand approves or requests changes.
- On approval, credit service releases escrowed milestone funds according to `payoutSplit`.
- Events: `gig.milestone.submitted`, `gig.milestone.approved`, `credit.event` for releases.

7) **Payout distribution**
- Split by percentage or fixed per milestone.
- Credit service records transfers to each member’s wallet/balance.
- Event: `credit.payout.released`.

8) **Reputation updates**
- Reputation service increments clan and member scores based on on-time delivery, acceptance quality, dispute-free ratio.
- Events: `reputation.updated`.

### Minimal data model additions
- In gig-service:
  - `GigApplication`: `id, gigId, applicantType ('USER'|'CLAN'), clanId?, teamPlan, milestonePlan, payoutSplit, status`
  - `GigAssignment`: `gigId, assigneeType ('CLAN'), clanId, teamPlanSnapshot, milestonePlanSnapshot, payoutSplitSnapshot, status`
  - `GigMilestone`: `id, gigId, title, dueAt, amount, status ('PENDING'|'SUBMITTED'|'APPROVED'|'PAID')`
  - `GigTask`: `id, gigId, milestoneId?, title, assigneeUserId, status, hours?`
- In clan-service:
  - `ClanWorkPackage`: `id, gigId, clanId, title, assigneeUserId, status`
  - Optional: `MemberAgreement`: member acceptance of role/split.

### Key API endpoints (logic)
- gig-service
  - POST `/gigs/:gigId/applications` (body: applicantType, clanId, teamPlan, milestonePlan, payoutSplit)
  - GET `/gigs/:gigId/applications`
  - POST `/gigs/:gigId/applications/:appId/accept` (locks snapshots and creates assignment)
  - POST `/gigs/:gigId/milestones/:milestoneId/submit`
  - POST `/gigs/:gigId/milestones/:milestoneId/approve`
  - POST `/gigs/:gigId/tasks` (internal team tasks mapped to clan members)
  - PATCH `/gigs/:gigId/tasks/:taskId` (status, reassignment)
- clan-service
  - POST `/clan/:clanId/gigs/:gigId/plan` (create/update internal plan pre-accept; mirrors application)
  - POST `/clan/:clanId/gigs/:gigId/tasks` (create work packages)
  - PATCH `/clan/:clanId/gigs/:gigId/tasks/:taskId` (status changes)

### Events to emit (RabbitMQ)
- From gig-service
  - `gig.application.submitted|updated|accepted|rejected`
  - `gig.assigned` (with `clanId`)
  - `gig.milestone.submitted|approved|paid`
  - `gig.task.updated`
- From clan-service
  - `clan.gig.assigned` (mirror)
  - `clan.task.assigned|updated`
- From credit-service
  - `credit.payout.released` (with distribution detail)
- Notification-service broadcasts user-targeted notifications; client listens via WS.

### Permissions
- Apply on behalf of clan: `HEAD|CO_HEAD|ADMIN` (configurable via clan roles).
- Edit team/milestone/payout plan: clan admin until brand acceptance; post-accept requires brand approval.
- Task assignments: clan admin; members can accept/decline their tasks.
- Milestone submit: clan admin; approve: brand only.

### Fair pay rules
- Define payoutSplit at application time:
  - Option A: percentage per member per milestone (sum 100%).
  - Option B: fixed amounts per milestone per member (sum equals milestone budget).
- Funds flow:
  - On assignment, brand funds escrow per milestone.
  - On approval, credit-service releases funds per split to members.
- Adjustments:
  - Re-split requires both clan admin and brand approval before milestone submission.
- Transparency:
  - Split snapshots immutable after approval; visible to all assigned members.
- Edge cases:
  - Member leaves mid-gig: reassign and update split; log approvals.
  - Disputes: hold payout, request admin/brand resolution; partial approvals supported.

### What to build first (incremental)
- Enable clan applications in gig-service (`applicantType='CLAN'`, `clanId`).
- Lock snapshots on acceptance; emit `gig.assigned` with `clanId`.
- Add milestones with amounts; approval triggers credit-service payout split.
- Clan-service: minimal task management mapped to gig milestones.
- Notifications: ensure WS relays `gig.assigned`, `gig.milestone.*`, and `credit.payout.released`.

Status update:
- Proposed a concise, logic-first workflow spanning gig-, clan-, credit-, reputation-, and notification-services; specified minimal models, endpoints, events, permissions, and fair-pay mechanics so clans can apply, split work, and get paid transparently.