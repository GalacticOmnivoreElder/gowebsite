# GO: three pillars and the agreed product direction

Revised specification · 16 September 2026 · Based on the user's annotated proposal

This specification consolidates the supplied decisions. It supersedes conflicting recommendations in the original audit. It defines the next implementation; it does not claim that these features or permissions are already deployed. Application code and billing configuration have not been changed.

## 1. Positioning and the six entry paths

**Learn with guidance. Build your portfolio. Find work or hire talent.**

Use **LEARN | PORTFOLIO | OUTSOURCE** consistently. LEARN is a clear action and matches the existing route. PORTFOLIO covers building, collaboration, and publishing. OUTSOURCE needs the supporting text “Find work or hire talent” so both sides understand their place.

Use **Find paid work** and **Hire talent** as the main customer-facing labels. Keep “Create and earn” and “Pay 2 Win” as internal persona names or optional campaign language. “Hire talent” describes the buyer's next action without implying that payment guarantees success.

The homepage asks exactly two initial questions:

```text
What do you want to do?                            Step 1 of 2

[ LEARN ]          [ PORTFOLIO ]          [ OUTSOURCE ]
Get guidance.      Build and publish.     Find work or hire talent.

How would you like to start?                       Step 2 of 2

LEARN       → [ Ask for mentorship ] [ Become a mentor ]
PORTFOLIO   → [ Publish solo       ] [ Find a team     ]
OUTSOURCE   → [ Find paid work     ] [ Hire talent     ]

Only the selected pillar's two actions appear.
← Change goal                              Just exploring? Browse GO
```

| Action | First destination | Contextual next step |
|---|---|---|
| Ask for mentorship | `/learn` | Ask a learning question, find existing answers, or request structured mentorship as a member. |
| Become a mentor | `/membership` | Mentor benefits, 90% earnings policy, subscription requirements, application and GO approval. |
| Publish solo | `/membership` | Community publishing support and project entitlement; eligible members continue without buying again. |
| Find a team | `/membership` | Explain collaboration access; eligible members browse roles or start their permitted project. |
| Find paid work | `/projects` | Paid opportunities first; retain clearly identified free-account application exceptions. |
| Hire talent | `/project/create` | Business recruiting explanation and plan/quota-aware continuation. |

Keep the two-step experience inline, mobile-friendly, keyboard-accessible, skippable and revisitable. Retain intent through login, onboarding and checkout. Returning eligible members see a continuation action instead of another sales journey. Ordinary deep links remain usable.

## 2. Confirmed policy changes

### Community projects

An active **GO Community** member can own **one unreleased project at a time**. They may create another only after GO reviews the current project and approves it as released.

This is not a lifetime limit of one project. Previously released projects remain part of their portfolio. Membership cancellation, deletion, archiving, or a user-selected “completed” state must not automatically free the slot. GO's release approval is the event that permits the next project.

An active **GO Mentor** subscriber has the same one-unreleased-project entitlement. A **GO Business** subscriber has the project allowance negotiated with the GO Business team. Business does not mean unlimited projects by default.

The existing Business-only project-creation rule must therefore change. The same project infrastructure can support creator projects and hiring briefs, but the intent and permissions need to be explicit:

- Community/Mentor: create their one eligible creator project, recruit collaborators and work toward a reviewed release.
- Business: create hiring briefs and manage a negotiated project allowance.

**Recommended interpretation for implementation:** store a staff-set concurrent project limit for Business and count unreleased owned projects against it. The user specified negotiation, but not whether contracts count concurrent projects, total projects, or another measure. Keep the quota model explicit in the negotiated agreement before enabling Business creation; do not invent a numerical default.

The current `completed` status is not sufficient evidence of a GO-approved release. Record a distinct release approval, reviewer and timestamp. Users can submit work for release review; only authorized GO staff can approve and free the slot. Enforce allocation atomically so two simultaneous create requests cannot exceed the allowance.

An abandoned or permanently blocked creator project needs a staff resolution policy. Until that policy is decided, do not silently bypass the user's release requirement through archive or delete actions.

### Publishing with GO

Publishing is part of guided learning and mentorship. Members can use GO resources and publish through GO's **itch.io account** and **Steam account** to build visibility, experience a first release, and learn how to publish through their own accounts later.

Suggested customer copy:

> Publish your first game with GO's guidance. Prepare your release, learn the process, and explore publishing through GO's itch.io or Steam account with the GO team.

Keep the Community membership requirement and both PORTFOLIO entry routes to `/membership`. Recommend inheriting this capability for Mentor and Business accounts so existing subscribers are not asked to purchase Community separately.

The workflow should distinguish:

1. Creating and developing a project.
2. Receiving guidance and preparing release materials.
3. GO reviewing the game and publishing arrangements.
4. GO carrying out an approved storefront release.
5. GO recording release approval and freeing the creator's next-project slot.

Platform membership alone does not define distribution rights, storefront fees, ownership, revenue allocation or guaranteed visibility. These remain publishing-service terms to establish. The mentor's 90% policy below does not automatically apply to game sales. No storefront credentials should be exposed to members; GO manages its own publishing accounts.

### Free and paid participation

These decisions are settled:

- Structured mentorship requests remain member-only.
- Existing free-account project-application exceptions remain.
- Existing discovery, profile, resource and learning-preview access stays as it is for now.
- The old matrix's pending-paywall labels are not instructions to add new restrictions to these existing free experiences.

The requested new creator-project and mentor-earning capabilities have their own subscription requirements. Anonymous learning questions are a distinct interaction, described below.

## 3. Subscription and capability matrix

This table describes the requested target state. Approval, ownership, publication status and per-project application rules still apply independently of subscription.

| Capability | Free account / public visitor | GO Community | GO Mentor | GO Business | GO Business + mentor earning add-on |
|---|---|---|---|---|---|
| Existing public browsing, previews and free features | Preserve current rules | Preserve | Preserve | Preserve | Preserve |
| Ask a public learning question | Allowed; visitors attributed as Anonymous | Allowed | Allowed | Allowed | Allowed |
| Request structured mentorship | Member-only; no free access | Included | Included through shared member access | Included through shared member access | Included |
| Apply to projects | Existing signed-in exceptions only | Per-project rules | Per-project rules | Per-project rules | Per-project rules |
| Own unreleased creator projects | No new entitlement granted | One | One | Negotiated allowance | Negotiated allowance |
| Create Business hiring briefs | No | Business required | Business required | Within negotiated allowance | Within negotiated allowance |
| Guided game publishing through GO | Community membership required | Included subject to GO review and terms | Recommended inheritance | Recommended inheritance | Recommended inheritance |
| Create learning resources and earn | No paid creator entitlement | Mentor access required | Yes, with GO approval | Mentor earning add-on required | Yes, with GO approval |
| Mentor's earnings share | Not applicable | Not applicable | 90% of qualifying income | Not included in base Business | 90% of qualifying income |
| Additional mentor earning charge on Business | Not applicable | Not applicable | Existing Mentor subscription | Not included | **1,500 MKD/month in addition to Business** |

The new 1,500 MKD charge is a **Business add-on**, not a replacement price for the existing GO Mentor plan. Preserve existing plan pricing unless separately changed. Do not infer an annual add-on price or discount.

Mentor approval remains separate from payment. The prior interview and GO verification requirement is retained. A Business subscriber with the mentor earning add-on must retain approved mentor capabilities; an exact `membershipTier === 'mentor'` check cannot represent this correctly.

Proposed entitlement composition:

```text
mentor earning access = approved mentor
                     AND active access
                     AND (GO Mentor OR (GO Business AND active mentor add-on))

creator project access = active eligible subscription
                      AND remaining GO-approved project allowance

new structured mentorship request = active member entitlement
```

The mentor income policy is confirmed at **90%**, but its accounting basis is unresolved. Define whether that means gross sales, net receipts after processing/taxes, or another basis; specify refunds, payout timing and qualifying products/services before enabling transactions. Do not present an earnings dashboard as a working payout service until that service exists.

## 4. Expired membership: retain access, freeze changes

The requested experience is a frozen workspace: members retain access to the tools and material they had reached, but cannot create new work, change existing work, or update their profile after their paid access ends.

Cancellation scheduled for the end of a paid period is not immediate expiry. Freeze begins when entitlement actually ends.

| After expiry | Target behavior |
|---|---|
| Existing projects, profile, drafts and learning records | Remain readable; no automatic deletion. |
| Previously accessible tools/content | Retain read access according to an expiry snapshot; no access to newly added paid content. |
| Profile or portfolio edits | Frozen. |
| New projects, applications, mentorship requests or resource submissions | Frozen where they are membership workspace actions. |
| Edits to existing projects, resource versions and mentorship work | Frozen. |
| Resource authoring or new paid mentor work | Frozen. |
| Support | Reachable through `/contact` and a proposed `/support` entry point. `/support` was not identified in the previous route inventory and must be added or redirected to a real support channel. |
| Renewal | Restores current-plan write permissions after server-confirmed activation, while still respecting quota and approval state. |

Suggested banner:

> Your membership has ended. You can still view your existing work and previously available tools. Renew to make changes or start something new. Need help? Contact GO.

**Recommended operational exceptions to agree:** billing management, sign-out/account security, consent withdrawal, removal of public personal information, safety reports, and support should remain actionable. These are account controls rather than new paid work. This is a recommendation, not a confirmed exception to the requested freeze.

There is also a boundary to settle: an ordinary free account can currently edit its profile and apply to exception projects, whereas the requested expired-account policy freezes former subscribers. Implement the explicit freeze as a distinct account state rather than accidentally granting writes through the free-account fallback. Decide whether former subscribers should regain ordinary free capabilities; do not silently assume that they do.

Preserving previously available content requires durable entitlement history or a content-access snapshot. The existing active-subscription Boolean cannot distinguish retained content from newly released content. Previously granted individual resource access must be preserved separately. Define treatment of revoked, refunded or suspended accounts separately from ordinary subscription expiry.

Existing sales and unpaid mentor balances after expiry need a financial policy: freezing authoring does not by itself settle whether already-published paid resources stay on sale or when earned balances are paid.

## 5. `/learn`: questions, answers and structured mentorship

Provide two clearly differentiated services on the same page:

| Service | Purpose | Access | Result |
|---|---|---|---|
| **Ask GO a question** | A focused learning question that can help the community | Visitors and signed-in users | GO reviews it, creates an answer or learning material, and adds a reusable FAQ entry. |
| **Request mentorship** | Ongoing, personal guidance toward a milestone | Active members | Existing structured request, matching, mentor review and agreement workflow. |

A visitor asking a question is not creating a free formal mentorship request. This distinction preserves the user's member-only mentorship policy while supporting anonymous questions.

Suggested `/learn` copy:

> What would you like to learn?
>
> Search GO's answers or send us your question. We create learning material daily and aim to respond as soon as we can. For ongoing personal guidance, request mentorship with your GO membership.

### Question-to-FAQ workflow

1. Show relevant approved FAQ answers as the person writes a question.
2. If they still need help, allow submission. Attribute unsigned visitors as **Anonymous**. For signed-in members, retain the private account association so GO can notify them.
3. Acknowledge receipt and explain that the GO team will review it. Daily content production is an operating goal, not a guaranteed same-day response to each question.
4. GO reviews, merges duplicates and prepares an answer or learning resource.
5. GO publishes the approved answer as a persistent FAQ entry with a stable URL, topics, source links where appropriate, and an update date.
6. Notify the requesting community member when the answer is ready. Use in-app notification and existing email preferences; no outbound notification is sent as part of this planning task.
7. Let Omnivore retrieve relevant published FAQ answers and link to them in future conversations. Unanswered or private submissions must not appear as established answers.

The permanent FAQ stores reusable learning knowledge, not private mentorship details. Explain before submission that questions may be edited and published; keep account/contact information private, and use an agreed public display name or Anonymous label. Give anonymous visitors a stable question receipt/status link; a follow-up notification requires an account or an explicitly provided contact method.

Add moderation, duplicate handling and basic submission limits to keep the public queue usable. Allow correction or unpublication of unsafe/outdated answers; “permanent” means durable and reusable rather than impossible to maintain.

Approved community expert status is still undefined. Your new learning-Q&A direction does not establish a separate expert hiring credential. Keep that label out of live promises until its criteria and approval workflow are defined. Likewise, Discord privileges and priority support remain verification items from the audit.

## 6. Updated contextual messages

**Business entry popup**

> **Hire talent with GO Business**
>
> Create hiring briefs, review applicants and build your team. GO Business project capacity is agreed with the GO team based on your needs.

Actions: **Explore GO Business**, **Contact GO about capacity**, and **Not now**.

For Community/Mentor users, add a separate link: **Building your own game? Use your included creator project.** This avoids incorrectly selling Business to someone who already has a project slot.

Active Business users with capacity continue to the form. Business users without a configured allowance or at their limit see a capacity request, not a duplicate subscription purchase. Mentor subscribers seeking Business plus earning access see the Business price and **+1,500 MKD/month** add-on clearly separated.

**Creator project limit**

> You already have a project in progress. Continue working on it or submit it to GO for release review. Once GO approves its release, you can start your next project.

Actions: **Open my project**, **Request release review**; secondary **Explore Business capacity**.

**Mentor earning access**

> Create learning resources and earn 90% of qualifying income with approved GO Mentor access. GO interview and verification are required before you can offer paid work.

The phrase “qualifying income” must link to the agreed accounting terms before release; it is draft copy, not a substitute for those terms.

## 7. Implementation sequence

1. **Navigation and continuation:** introduce the six paths, use the chosen labels, add intent-aware membership messaging, and preserve intent across registration, onboarding and confirmed payment. Keep current free-access rules.
2. **Project allowances and GO release approval:** implement one-slot Community/Mentor creation, separate creator/hiring intent, staff-configured Business capacity, atomic quota enforcement and release review. Include migration handling for accounts that already exceed a proposed allowance; do not delete their projects.
3. **Composite mentor access:** separate mentor approval from subscription tier, support Business plus the 1,500 MKD/month add-on, and provide reviewed mentor resource authoring. Implement revenue accounting only after the income/payout terms are resolved.
4. **Expiry behavior:** record retained access, freeze content/profile writes consistently in APIs and UI, retain support access, and handle renewal without losing work. Resolve the free-account and account-control exceptions before activating the freeze.
5. **Learning Q&A and FAQ:** public/member submission, review queue, reusable answers, notifications and Omnivore retrieval. Reuse existing resources and notification infrastructure where appropriate.
6. **Guided publishing:** release-preparation intake, GO review, publishing terms, staff-managed storefront work and recorded release approval.

### Required acceptance checks

- Two choices reach the correct contextual destination; no eligible subscriber is told to buy the same benefit again.
- Community and Mentor users cannot create a second unreleased project, including through concurrent requests or direct API calls.
- Archiving/deleting or marking completed does not reset the project slot; authorized GO release approval does.
- Business capacity is enforced according to a configured agreement, never an inferred unlimited entitlement.
- An approved Mentor upgraded to Business plus the add-on retains mentor operation; Business without the add-on does not receive paid mentor access.
- Free project-application exceptions remain; structured mentorship stays member-only.
- Ordinary expiry retains the defined historical reads and blocks workspace writes, including profile edits, regardless of entry route.
- A future paid-content release is not unlocked by a previous subscription's retained-access snapshot.
- Anonymous learning questions do not enter the private mentorship workflow; member answer notifications target the correct account.
- FAQ retrieval uses published answers and links back to their maintained entries.

## 8. Remaining details—not a request to repeat settled decisions

The navigation, one-project rule, member-only structured mentorship, free-application exceptions, 90% mentor share, Business add-on amount, frozen expiry experience and public learning-Q&A direction are now specified.

Before the corresponding transactional features go live, resolve:

1. **Earnings:** the basis of the 90% calculation, qualifying sales, payout/refund handling, add-on annual billing and when mentor charging begins relative to approval.
2. **Quota agreements:** Business counting rules; abandoned-project exceptions; treatment of existing over-limit owners and plan downgrades.
3. **Publishing:** GO's distribution terms, costs and game-sale proceeds; whether every credited collaborator must subscribe; confirmation of publishing inheritance for Mentor/Business.
4. **Expiry boundaries:** essential account-control exceptions, free-account fallback, existing resource sales and retained-content snapshot scope.
5. **Public identity:** whether signed-in question authors are named publicly by default or choose attribution. Recommend explicit choice while always retaining private notification linkage.

These details can be resolved alongside navigation work. They should not be guessed into billing, storefront publishing or irreversible access migrations.
