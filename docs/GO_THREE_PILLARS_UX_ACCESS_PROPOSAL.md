# GO: three pillars, six clear paths

Audit and proposal · 16 September 2026 · For review before implementation

**Historical audit:** The user's subsequent decisions are consolidated in [GO_THREE_PILLARS_DECISION_SPEC.md](GO_THREE_PILLARS_DECISION_SPEC.md). That specification supersedes this document's proposed policies, unresolved-decision list, and Business-only project-creation recommendation. Source findings here describe the earlier inspected implementation and remain evidence, not the new entitlement contract.

## Recommendation

Make the homepage an immediate choice of purpose, followed by a choice of action. Keep the existing platform underneath it. Use **LEARN, PORTFOLIO, OUTSOURCE** consistently as the long-term pillar names; the first proposed wireframe below preserves the requested **EDUCATION** label for review.

The main work is connecting intent to a useful next action, not adding another directory. GO already has project applications, mentor review and matching, learning access rules, creator profiles, and billing. Game publishing through GO, independent team formation, and approved community experts need additional product definitions before they can be sold as working features.

No application code, subscriptions, permissions, or live access were changed for this audit.

## Evidence and limits

This is a source-code audit of the current workspace, with public-page text checks. It is not an authenticated production test, checkout test, database audit, or visual accessibility review. Runtime feature flags, deployed Firestore rules, available content, and actual billing products were not verified. Code behavior below means the behavior of the inspected implementation, not proof of deployed behavior.

The [public homepage](https://www.galacticomnivore.com/) retrieved for this review prioritizes Discord, a call, and organizational information before feature discovery, and calls its third pillar Business. The [public membership page](https://www.galacticomnivore.com/membership) retrieved for this review describes the Mentor Programme as coming soon with applications closed. Local membership code instead includes GO Mentor pricing and an application route. The web tool reported these pages as crawled last week: verify the deployed build and flags before treating either as the current production contract. The public `/learn` fetch failed in the retrieval tool; that is not evidence that the page is broken.

### Source register

Paths below are repository-relative. These identifiers are used throughout the matrix.

| ID | Inspected implementation |
|---|---|
| E1 | `src/components/landing/HeroSection.js`, `GoPillars.jsx`; `src/app/(main)/page.js`; `src/lib/navigation.js` |
| E2 | `src/app/learn/page.js`, `src/app/mentorship/page.js`, `src/app/matchmaking/page.js`, `src/app/community/page.js` |
| E3 | `src/constants/membership.js`, `src/app/membership/page.js`, `src/lib/auth-utils.js`, `src/app/api/auth/verify/route.js` |
| E4 | `src/lib/project-utils.js`, `src/lib/project-access.js`, `src/app/api/projects/route.js`, `src/app/project/create/page.js` |
| E5 | `src/app/api/projects/[id]/route.js`, `src/app/project/[id]/edit/page.js`, `src/app/api/applications/route.js`, `src/app/api/applications/[id]/route.js`, `src/app/api/projects/[id]/members/[memberId]/route.js` |
| E6 | `src/lib/mentorship.js`, `src/lib/mentorship-service.js`, `src/lib/mentor-directory.js`, `src/lib/mentor-profiles.js`, `src/lib/content-entitlements.js` |
| E7 | `src/lib/product-config.js`, `src/lib/learning-enrollment.js`, `src/lib/learning-items.js`, `src/app/api/admin/learning-items/route.js`, `src/app/api/admin/video-bundles/route.js`, `src/app/api/learning-items/[slug]/session-access/route.js`, `src/app/api/learning-items/[slug]/participants/route.js` |
| E8 | `src/lib/asset-packs.js`, `src/app/api/asset-packs/route.js`, `src/lib/video-bundles.js`, `src/lib/content-entitlements.js` |
| E9 | `src/app/api/me/profile/route.js`, `src/app/api/me/cv/route.js`, `src/app/api/users/[id]/cv/route.js`, `src/app/api/onboarding/route.js`, `src/app/onboarding/page.js` |
| E10 | `src/app/games/page.js`, `src/app/api/sourceProjects/route.js`; route inventory and searches for game publishing, teams, and expert privileges |
| E11 | `src/app/api/go-events/[eventId]/join/route.js`, `src/lib/support-tickets.js`, `src/app/api/support/route.js` |
| E12 | `src/lib/checkout-navigation.js`, `src/app/api/checkout/route.js`, `src/lib/subscription-upgrade.js`, `src/app/subscription/success/page.js`, `src/lib/subscription-state.js` |
| E13 | `firestore.rules` |
| E14 | `src/components/omnivore/StarterPathway.jsx`, `src/content/evergreen-curriculum.mjs`, `src/app/api/learning-catalog/route.js`, `src/app/api/learning-signal/route.js` |

## What currently creates friction

1. **Purpose is spread across several menus.** The hero, pillar cards, orbit directory, learning menu, and community directory all offer different starting points. Pillar cards describe GO but do not perform the requested two-step routing. [E1–E2]
2. **LEARN has several meanings.** `/learn` opens Omnivore; `/education` contains learning offerings; `/mentorship` is the mentor directory; `/matchmaking` permanently redirects to mentorship. Preserve these routes but make the selected purpose explicit. [E2]
3. **Portfolio publishing has no equivalent self-service workflow identified.** `/games` filters approved projects and links to their project pages. It is not a game-submission or distribution workflow. Public CV publishing is a different capability. [E9–E10]
4. **Team collaboration currently uses project recruitment.** Project ownership, admins, team membership, applications, and applicant acceptance exist. A separate member-created team service was not identified. Creating the recruiting project currently needs Business, even if its compensation is Portfolio/Experience or Volunteer. [E4–E5]
5. **Payment does not equal approval.** Mentor tools need an active Mentor subscription and approval; a mentor application can be submitted without that subscription when intake is enabled. Project publication is controlled by platform admins. [E5–E6]
6. **Earn does not mean every opportunity is paid.** Projects support Paid, Revenue Share, Portfolio/Experience, Volunteer, Equity, and Hybrid. The earning path must filter and label compensation rather than imply payment across the listing. [E4]
7. **The return journey is incomplete.** Authentication can preserve redirects and checkout plans, but onboarding finishes at `/profile/cv?welcome=1`, and purchase confirmation offers generic destinations. There is no unified six-intent continuation in the inspected flow. [E9, E12]

## Entry experience and copy

Place this in the first homepage viewport. Use an inline panel so visitors can still browse. The selected first choice reveals the second question in the same panel. No signup or long profile form before these two choices.

```text
GO                                         Sign in

Find your next step in game development.
What do you want to do?                         1 of 2

[ EDUCATION ]       [ PORTFOLIO ]       [ OUTSOURCE ]
Learn with people.  Build and publish.  Find work or hire.

Just exploring? Browse GO
```

```text
← Change goal                                  2 of 2
How would you like to get started?

EDUCATION: [ Ask for mentorship ] [ Become a mentor ]
PORTFOLIO: [ Publish solo       ] [ Find a team     ]
OUTSOURCE: [ Create and earn    ] [ Pay 2 Win       ]

Show only the two choices for the selected pillar.
```

| Requested choice | Supporting copy | First destination | Useful next action |
|---|---|---|---|
| Ask for mentorship | Get guidance for your next game-development milestone. | `/learn` | An intent-specific mentorship panel, then the existing mentor directory and request workspace. Keep Omnivore available as a secondary option. |
| Become a mentor | Share your experience. GO interview and approval required. | `/membership` | Mentor explanation and application at `/profile?tab=mentor`; display intake status before payment. |
| Publish solo | Bring your game to GO. Community membership is required. | `/membership` | A proposed game-submission intake, with review requirements. Do not redirect this user into Business project creation. |
| Find a team | Meet collaborators and build something worth showing. | `/membership` | For eligible members, continue to suitable project roles at `/projects`; disclose that independent team formation still needs definition. |
| Create and earn | Find opportunities that fit your skills and availability. | `/projects` | Paid opportunities first, with clearly labeled alternatives and application eligibility. Compensation filtering must be added; the inspected discovery helper does not implement it. |
| Pay 2 Win | Hire people to move your project forward. | `/project/create` | A public explanation and Business popup before the protected form. Reuse the existing singular route. |

**Naming recommendation:** use LEARN across navigation, entry cards, and page headings, with “Education and mentorship” as explanatory text. “Find paid work” is clearer than “Create and earn”; “Hire talent” is clearer than “Pay 2 Win.” Keep the requested labels in the first review version, pairing them with the plain-language descriptions above. “Publish solo” needs accompanying text that membership enables submission, not guaranteed acceptance or storefront release.

### Interaction details

- Display choices as real buttons or links with visible keyboard focus; move focus to the second question after selection. Back preserves the first selection.
- Stack cards on mobile, maintain comfortable touch targets, avoid hover-only instructions, and honor reduced motion.
- Keep “Browse GO” and ordinary navigation available. Deep links should open their intended page rather than forcing homepage orientation.
- Remember a dismissed entry flow locally; give returning users “Continue: [last goal]” and “Change goal.” Do not reopen it on every visit.
- Use a dismissible, keyboard-accessible dialog only for the Business explanation. Escape, a labeled close control, and focus restoration must work.
- Show loading, unavailable, and no-match states honestly. Never turn a feature outage or failed permission request into an upgrade prompt.

## Six persona journeys and account states

All states below describe the proposed journey. Existing gates remain in force until a revised policy is approved. All three paid plans currently receive shared member content access; Mentor-specific operation requires the Mentor tier and approval. They are not a simple ascending hierarchy.

| Persona and intent | Signed out | Free account | Eligible subscriber | Subscriber on another plan / blocked by approval |
|---|---|---|---|---|
| Learner seeking mentorship | `/learn` → browse mentor options; sign in at request. Preserve selected mentor and goal. | Explain current member requirement at request; `/membership` → resume saved request after activation. | Continue to `/mentorship` and `/profile?tab=mentorships`; collect goal, discipline, level, availability and required consent. | All active paid tiers currently qualify on the mentee side. If capacity, feature availability, or GO review blocks the request, show that reason rather than upselling. |
| Experienced creator becoming a mentor | `/membership` → requirements → sign in to apply. | Application can currently proceed when intake is open. Recommend application and interview before charging for operational tools. | Approved active GO Mentor → `/profile?tab=mentor` for profile and availability. Pending GO Mentor → application status, not another checkout. | Community/Business can apply but cannot operate Mentor tools under current tier checks. Explain plan transition limits and route to Billing/support; payment cannot replace approval. |
| Solo creator publishing a game | `/membership` → publishing requirements → account creation; retain publish-solo intent. | Explain Community requirement and review process; resume proposed publishing intake after entitlement confirmation. | Membership page recognizes eligibility and offers “Continue to game submission.” Until intake exists, show an honest GO-assisted contact route. | Recommend inherited publishing access for Mentor/Business, pending decision. Existing paid users should not buy duplicate Community subscriptions. Membership is necessary; publishing approval remains separate. |
| Creator looking for teammates | `/membership` → explain team path and view opportunities. | Explain current project-specific application rules. Membership requirement for game publishing must not imply that all team discovery is already paid. | `/membership` → “Continue to team opportunities” → `/projects` with relevant roles; use profile skills and availability. | All paid tiers currently meet members-only application access. An independent team-creation action must not silently require Business; decide its policy first. |
| Freelancer finding paid work | `/projects` → compensated briefs; sign in when applying. | Allow application if the project is `all_signed_in_users`; otherwise explain the current member gate. Retain project, role and draft application. | Apply to visible hiring projects; use consented CV/profile information. Existing-team and duplicate-application rules still apply. | All active paid tiers qualify for members-only applications. Closed, private or inaccessible projects do not become available merely by paying. |
| Business owner hiring | `/project/create` explanation and popup → sign in → Business selection. | Business plan → verified activation → return to brief. Preserve any locally drafted description. | Active GO Business goes straight to the form; drafts require publication review. | GO Community uses the existing Business upgrade preview. GO Mentor has no equivalent verified upgrade path in this code; show Billing/support guidance. Retain the hire intent. |

Mentorship is staff-mediated matching: request, GO review, suggestions/forwarding, mentor decision, and agreement. Fast navigation is achievable; immediate or guaranteed matching should not be promised. Capacity, enabled intake, consent, and mentor availability still govern outcomes. [E6]

### Preserve intent through account setup and payment

Propose six allowlisted intent values: `mentorship`, `become-mentor`, `publish-solo`, `find-team`, `find-work`, `hire-talent`. They describe navigation, never authorization.

Save the selected intent and safe internal continuation with a draft identifier. Bind it to the account after sign-in and keep it through checkout and onboarding. Preserve the existing plan/interval handling. Query parameters such as `?intent=find-team` are proposed additions, not existing supported behavior.

After checkout, wait for server-confirmed entitlement before resuming. Handle delayed confirmation with “We’re confirming your membership” and a retry path. After a cancelled checkout, return to the saved goal with the draft intact. At onboarding completion, resume that goal rather than always redirecting to the CV. Collect only the profile fields needed for the next action and leave the full Passport available later. Validate continuation destinations against internal routes.

## Access and benefits review matrix

**P = “Proposed paywall — pending decision.”** Every P row is a review candidate, including currently free capabilities; P does not authorize a live restriction or predetermine that the final choice must be paid. “Fixed” marks an explicit rule in this request. Existing exceptions, grants, safety/reporting access, and purchased entitlements must be considered individually before changing them.

“Shared member access” below means effective active subscription under the code, including paid-through cancellation windows, for Community, Mentor, or Business, plus platform-admin exceptions. Source references distinguish actual gates from advertised benefits.

| Capability | Current access and evidence | Required role / approval | Current subscription requirement | Proposed gate | Decision | Upgrade / recovery destination |
|---|---|---|---|---|---|---|
| Browse public projects | Public, approved statuses; visibility and archive rules [E4] | None for public discovery | None | Recommend public preview | P | `/membership` only at a restricted action |
| View private/invite projects | Owner/admin/team or applicable invitation [E4] | Project relationship | No general paid bypass | Keep relationship gate | P | Request invitation; payment alone cannot unlock |
| Create a recruiting project brief | API and create page check `canCreateProjects` [E3–E4] | Business user; admin exception | Active GO Business | GO Business | **Fixed** | `/membership?reason=creator` |
| Publish project / change status | Created as draft; status changes require platform admin [E4–E5] | Platform review/admin | Business for initial creation | Business submission plus GO review | Business fixed; review mechanics to confirm | Existing project and GO review |
| Edit/archive existing project | Owner, project admin or platform admin [E5] | Ownership/admin role | No ongoing Business check in inspected edit gate | Decide post-expiry management rights | P | `/billing` or `/membership?reason=creator` if chosen |
| Review applications / accept teammates | Project owner/admin or platform admin [E5] | Project management role | No fresh Business check in inspected application decision gate | Decide ongoing Business requirement | P | Project workspace; Billing if entitlement policy changes |
| Remove team member | Owner/admin/platform-admin authorization [E5] | Management role; protected member constraints | No fresh Business check identified | Keep relationship safeguards; decide billing rule | P | Project workspace |
| Apply to project | Visible hiring project; per-project application setting [E4–E5] | Signed-in applicant; duplicate/team constraints | Members-only default; `all_signed_in_users` exception | Review exception vs universal paid applications | P | `/membership`, retaining project/role |
| View/withdraw own application | Applicant-authorized workflow [E5] | Applicant | No new subscription gate identified | Recommend retaining account control after expiry | P | Application workspace |
| Create source-project container | Signed-in POST; owned/administered listing [E10] | Account and subsequent ownership | None | Clarify whether grouping belongs to Business | P | `/membership?reason=creator` if selected |
| Browse games showcase | Public projects filtered as game-related [E10] | None | None | Recommend public | P | No upgrade for browsing proposed |
| Submit/publish solo game through GO | Separate publishing intake not identified [E10] | Creator plus proposed GO review | Not implemented as distinct entitlement | GO Community membership required | **Fixed**; higher-plan inheritance to decide | `/membership`, then proposed intake |
| Publish team game through GO | Same workflow gap [E10] | Team ownership/credits and proposed review | No distinct publishing gate found | GO Community required; decide which contributors need membership | **Fixed** requirement; team scope unresolved | `/membership`, then proposed intake |
| Find collaborators / join a team | Project discovery and accepted applications exist [E4–E5, E9] | Project acceptance | Per-project application policy | Review paid matching separately from publishing | P | `/membership` entry → `/projects` |
| Create independent team | No separate team-creation service identified [E10] | Proposed team owner role | No independent entitlement | Define before selling; avoid conflating with Business brief creation | P | `/membership`; proposed workflow |
| Create/edit creator profile, skills, availability | Own authenticated profile API [E9] | Account owner | None identified | Recommend basic profile remains available | P | `/membership` if premium features chosen |
| Generate/edit/publish/download GameDev Passport | Own CV routes; profile required for generation [E9] | Owner; onboarding and visibility rules | No subscription gate in own-CV auth helper | Separate basic profile from possible premium export/visibility | P | `/membership` if chosen |
| Recruiter access to applicant CV | Visibility/consent and applicant relationship checks [E9] | Authorized viewer | Not a blanket Business talent directory | Preserve consent and relationship checks | P | Obtain access/consent; no universal paid unlock |
| Browse official mentors | Approved, public-enabled, complete profiles; feature flags [E2, E6–E7] | Published approved mentor | Viewer subscription not required; mentor must have active Mentor access | Recommend public discovery | P | No visitor upgrade for preview proposed |
| Request mentorship / apply to suggestion | Member gate; enabled workflow, consent and capacity [E6] | Mentee and workflow ownership | Shared member access | Review paid request policy explicitly | P | `/membership` → `/profile?tab=mentorships` |
| Participate in active mentorship | Participant workflow; active-access checks [E6] | Mentee/mentor participation; agreement | Mentee member access; mentor operational eligibility | Decide expiry/grace behavior | P | `/billing`; preserve reporting access |
| Apply to become mentor | Authenticated application when enabled [E6] | Required profile, terms, interview/review | No paid gate in `apply_mentor` authorization | Recommend application before operational subscription | P | `/membership` → `/profile?tab=mentor` |
| Offer mentorship / manage availability / appear in directory | `hasMentorToolAccess`; directory completeness and opt-in [E6] | GO approval plus enabled public profile where relevant | Active GO Mentor | Keep approval separate from paid access | P; `/membership` entry fixed | `/membership`; application status for approval block |
| Mentor feedback / public references | Existing review workflow; consent and approval described on membership page [E3, E6] | Participants; public-reference approval | Not established as independent paid benefit | Review exact feedback-service rules before repricing | P | Mentorship workspace; not automatic checkout |
| Courses/workshops enrollment | Per-item free/member/invite/admin-approval/event modes; schedule and capacity [E7] | Enrollment, invitation or approval as applicable | Item-specific; training-assignment exception | Keep per-item access explicit | P | `/membership` only for member access |
| Course session access / participant management | Session API checks confirmed/attendance/completion enrollment states; participant API checks learning-manager role [E7] | Platform admin or assigned instructor with active approved Mentor access; otherwise enrolled participant | Member-only sessions recheck active membership | Preserve enrollment and manager checks; reconcile training-assignment exceptions | P | Learning item / organizer review |
| Produce courses/workshops | Inspected authoring API is platform-admin-only; assigned instructor checked [E7] | Admin authoring; eligible Mentor instructor | Mentor access for assigned instructor | Describe as GO-assisted production until self-service authoring exists | P | `/membership` + GO production process |
| View video bundles / track progress | Bundle access allows member or active training assignment [E8] | Published content; enabled feature | Shared member access or assignment | Preserve assigned-access exception | P | `/membership` or assigned learning |
| Produce video bundles | Inspected publishing API is admin-only [E7] | Platform admin | No self-service Mentor publishing established | GO-assisted production, or build authoring role | P | GO production process |
| Open protected resource/package files | Shared member access or matching `unlockedPackages` grant [E8] | Publication/access checks | Membership OR existing item grant | Preserve individual grants | P | `/membership`; verify grant before upsell |
| Download asset packs | Public/community/individual access types [E8] | Published current version; individual grant if required | Per-pack | Preserve public and individually granted access pending decision | P | `/membership` or grant resolution |
| Contribute/update asset packs | Member gate; Mentor tier additionally needs approval; feature flag [E8] | Contributor ownership; GO publication review | Shared member access; Mentor verification condition | Make contribution and approval rules consistent in UI | P | `/membership` or mentor review |
| Omnivore learning discovery / starter preview | Public learning surface; first starter lesson free [E2, E14] | None for preview | None for preview | Recommend public orientation | P | `/membership` at paid step |
| Full starter pathway / saved achievements | UI uses community access; lesson data statically imported [E14] | Account for persisted progress | UI member gate for later lessons | Separate protected lesson delivery from progress permission | P | `/membership` |
| Join GO events | Public links or member join API based on event access [E11] | Event-specific availability | Member events require shared member access | Keep public/member distinction | P | `/membership?reason=community-event` |
| Community Discord / networking | Public invitation; member-only access advertised [E1, E3] | External Discord roles not verified | Advertised member benefit; enforcement unverified | Audit Discord role provisioning and member channels | P | `/membership` only for verified restricted channels |
| Support tickets / replies / reopen | Service requires active membership; own listing authenticated [E11] | Account owner/staff | Shared member access for create/reply/reopen | Decide free account/billing help exception | P | `/contact`; `/billing` where applicable |
| Priority Business support | Advertised benefit [E3]; priority enforcement not established | Support operations | Advertised GO Business | Define and implement service commitment before promising priority | P | `/membership?reason=creator` |
| Approved community expert / expert hiring | Distinct expert status and approval workflow not identified [E10] | New approval definition needed | Unknown | Define verification independent of plan | P | No existing expert upgrade destination |
| Freelancer contracting / payments | Project compensation fields and recruitment found, not a verified contracting/payout system [E4–E5] | Project acceptance and external terms | No separate entitlement established | Clearly state recruitment scope; define payment handling separately | P | Project workflow; no promise of GO-managed payouts |
| Notifications and learning updates | Notification routes and feature flags exist [E7] | Account/recipient | Independent paid gate not verified | Review as companion functionality, not a new paid claim | P | Relevant workspace |
| Billing, cancellation, consent and safety controls | Existing account/billing/mentorship controls [E6, E9, E12] | Account owner or authorized participant | Control-specific; not a purchasable role | Recommend always retaining essential controls after expiry | P; recommend exclusion from commercial gates | `/billing`, account settings, report route |

This inventory covers discovered benefits and the requested missing capabilities. Rows explicitly marked unverified need targeted follow-up; they must not be presented as implemented entitlements.

## Plans and permission model

The local plan names are **GO Community** (`member`), **GO Mentor** (`mentor`), and **GO Business** (`company`). Public/free is an account state, not another paid tier. Shared content access already includes all three paid plans. Business adds project creation; Mentor adds approved mentor tools. [E3, E6]

Use explicit capabilities such as `project.create`, `project.apply`, `game.submit`, `team.create`, `mentorship.request`, and `mentor.operate`. Resolve each from subscription, approval, object ownership, invitations, grants, publication state, and feature availability. Centralize the result for both page messaging and API authorization. Never infer approval from payment or make a higher price imply unrelated professional privileges.

Do not market GO Mentor as simply above Community and below Business: upgrading an approved mentor to the Business tier would fail the current exact-Mentor-tier operational check. The existing self-service upgrade helper supports Community → Business, while checkout blocks existing subscribers from creating another active membership. Other transitions need a deliberate policy and implementation. [E6, E12]

## Paywall and status messaging

### Business popup — requested draft

**Create your project with GO Business**

To create a project, you need an active GO Business subscription. You can hire GO Community members, mentors, or approved community experts. Create a brief, review applicants, and build your team. GO reviews project publication.

Primary: **Explore GO Business**

Secondary: **Browse projects**

Close: **Not now**

For a signed-in Community member, replace the primary action with **Review Business upgrade** and use the existing upgrade preview. For an active Business member, omit the paywall and show **Create project**. For a Mentor subscriber, explain the current plan-change limitation and offer Billing/support.

**Publication dependency:** the requested expert sentence is proposal copy, not a verified current benefit. Before releasing it, establish expert approval and hiring eligibility. Until then, use “Connect with GO creators and review applicants for your project.” The current project application model does not enforce the proposed three-category talent roster.

### Other messages

- **Mentorship request:** “An active GO membership is currently required to submit this request. Matching depends on fit and mentor availability.” CTA: **View membership**. Keep the request draft.
- **Mentor approval:** “Your application is under review. GO approval is required before you can offer mentorship.” CTA: **View application**. Do not offer another purchase as a remedy.
- **Game publishing:** “GO Community membership is required to submit your game for publishing review. GO will confirm the publishing terms and next steps.” CTA: **View Community membership**. Use only after the intake and terms exist.
- **Project application:** “This project accepts applications from active GO members.” CTA: **View membership**. Show only for a members-only project.
- **Existing eligible member:** “Your membership includes this step.” CTA: **Continue to [action]**.
- **Expired access:** “Your membership access has ended. Your saved work is still here.” CTA: **Review membership**, with any retained management/reporting rights still reachable.
- **Feature unavailable:** “This service is currently unavailable. Your progress is saved.” CTA: **Return to your goal** or **Contact GO**, not checkout.

## Enforcement gaps and conflicting promises

| Finding | Evidence and consequence | Proposed response |
|---|---|---|
| Paid creation vs role-based ongoing management | Create API checks Business; project edits, application decisions, and team administration rely on ownership/admin role [E4–E5]. Business marketing implies management is a paid benefit. | Decide whether continuing management survives expiry; then align copy, UI and every mutation endpoint. This is a policy inconsistency, not automatically an authorization vulnerability. |
| Paid publishing proposal vs no publishing capability | `/games` is a project showcase [E10]. Reusing brief creation would incorrectly require Business from Community game publishers. | Create a separate Community game-submission entitlement and reviewed intake. |
| Membership copy overstates self-service educator tools | Courses and video bundle authoring endpoints are admin-only [E7]. | Explain GO-assisted production or implement approved Mentor authoring with review. |
| Applications are not universally paid | `all_signed_in_users` explicitly permits free accounts [E4–E5]. | Preserve and label the exception until the policy is decided. |
| Starter content protection is weaker than the UI suggests | `StarterPathway` imports lesson data into a client component; the lock is a render condition [E14]. | If lesson confidentiality is intended, serve protected content through an entitled server response. Progress-write checks alone do not protect shipped lesson text. |
| Training assignment does not consistently grant session access | Enrollment eligibility accepts a training assignment, but the session endpoint rechecks membership for member-only items without the same assignment exception [E7]. | Decide whether assigned learners receive session access; align both checks before advertising training access. |
| Mentor and Business privileges are not cumulative | Mentor operation requires exact `mentor` tier; only Community → Business upgrade is implemented [E6, E12]. | Define dual-role access and safe plan transitions before routing everyone to checkout. |
| Public wording and local code differ | Retrieved membership text says Mentor intake is closed; local plan/application code differs. | Confirm deployed revision, intake flags and Polar configuration before launch. |
| Expert qualification is not modeled | No distinct approved-expert privilege found [E10]. | Define criteria, reviewers, revocation, visibility and hiring access before publishing that promise. |
| Discord and priority support remain operational claims | External member role enforcement and priority SLA not established in this audit [E3, E11]. | Validate fulfillment before listing them as guaranteed benefits. |

Firestore rules deny browser access to server-owned projects, applications, billing, learning and mentorship collections, and protect subscription/approval fields on user documents. This is a useful existing boundary. The Admin SDK bypasses those rules, so API authorization remains essential; hiding a button or adding a frontend popup is not sufficient. Deployment of these rules was not verified. [E13]

## Implementation order and verification

1. **Agree the entitlement contract.** Resolve the decisions below; confirm deployed Mentor availability; define publishing and expert scope. Keep all undecided rows in proposal state.
2. **Connect the six journeys.** Add the homepage two-step panel, contextual membership landing states, `/learn` mentorship handoff, public create-project explanation, and paid-work discovery filtering. Preserve current route identities and existing permission rules.
3. **Complete continuation.** Carry intent and drafts through login, onboarding, plan review and confirmed billing. Let already eligible members continue without another purchase. Handle closed intake and no suitable matches.
4. **Align authorization.** Implement approved capability decisions centrally and enforce them in affected APIs. Preserve grants, consent, ownership and paid-through dates. Audit any previously unverified matrix rows before selling them.
5. **Add the missing workflows.** Game publishing intake/review; independent team formation if required; expert approval if retained; educator self-service only if GO intends to provide it.
6. **Verify and release gradually.** Test all six paths across signed-out, free, Community, Mentor pending/approved, Business, expired and admin accounts. Cover monthly/annual paid-through cancellation, wrong-plan transitions, delayed billing confirmation, invitation-only projects, free-application exceptions, unavailable flags, empty results, and draft recovery. Exercise direct API calls as well as page controls.

Usability acceptance: two homepage choices reach the correct contextual destination; a member is never asked to repurchase an included capability; back/skip/deep links work; mobile and keyboard flows are usable; no payment implies guaranteed matching or approval. Track purpose selection, second-choice completion, destination reached, first meaningful action, gate reason and successful continuation using the existing analytics consent model. Measure improvement against the current funnel rather than inventing conversion targets.

## Decisions needed before implementation

1. **Naming:** adopt LEARN throughout, and use “Find paid work” / “Hire talent,” or retain the requested labels with explanatory text? Not sure, do whatever is most appropritate as a marketing expert
2. **Game publishing:** does “publish through GO” mean a GO listing, publishing support, or distribution under GO? Who reviews it, which terms apply, and must every team contributor subscribe? Recommend Mentor/Business inherit the Community publishing capability. This is under mentorship, you can use GO resources to publish a game through GO itch.io account and GO steam account in order to  boost your visibility or to do it for the first time and then learn how to do it with your personal account.
3. **Team formation:** is “Find a team” joining existing project roles, or must Community members also be able to create independent teams? The latter needs a separate capability from Business recruiting briefs. Each Community member will have the ability to create one project per account and can start a new project only once GO reviews and approves the project as released in order to have the ability to start a new project. Each community member can own only one project unless they have the business GO package then they can create as many projects as GO Business Team negotiates with the Pay 2 Win persona. 
4. **Free vs paid participation:** should mentorship requests remain member-only; should free project-application exceptions remain; and which discovery, profile, resources and learning previews stay free? Each is a separate decision. 4.1 mentorship requests remain member only, 4.2 free project-applications exceptions should remain, 4.3 leave as it is don't change anything for now. 
5. **Mentor/business overlap:** can one person operate as both? Recommend approval independent of billing and a defined combined capability policy rather than duplicate subscriptions. Confirm whether mentor subscription starts after approval. Allow the mentor the ability to create learning resources and earn 90% of the income, they must have a mentor subsciprtion, allow the mentor to have the ability to create only ONE project until it is fully released according to GO. If the mentor wants to create multiple projects they will need to upgrade their subsccription to business and pay additional 1500 MKD per month for the ability to earn from mentorship and from the ability to create multiple projects. 
6. **Expiry and support:** which existing project-management and mentorship actions continue after expiry? Recommend retaining saved work, account/billing help, withdrawal and reporting controls. After expiration of subscription you retain access to all the tools you had until that moment but everything new is frozen and you cannot make any new action that require any changes or updates to your profile, any support can be requested through our /contact or /support channels 
7. **Expert and benefit promises:** define approved community experts and verify Discord privileges, educator production access, and priority support before advertising them. The ask a mentor ability users will have as part of the /learn website we will produce learning materials daily, whatever will be asked today we will aim to answer it as soon as posssible and we'll ping the community member that asked that question, if it was asked by someone that is not a user it will say asked by anonymous. Anything that our users requests we will try to accomodate to them ASAP. and we will leave the answers as a permanent FAQ that can be reused when you are asking an omnivore in the /learn website

The review can approve the entry experience separately from pricing. No unresolved benefit needs to become a live paywall merely to make the navigation clearer.
