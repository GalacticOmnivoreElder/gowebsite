export const BOOTCAMP_ID = "from-idea-to-playable";
export const FIRST_COHORT_ID = "from-idea-to-playable-2026-10-05";

export const bootcampCourse = {
  id: BOOTCAMP_ID, slug: BOOTCAMP_ID, status: "published",
  title: "From Idea to Playable",
  subtitle: "AI-Assisted Game Development Bootcamp",
  promise: "Bring a game idea on Monday. Publish a playable v0.1 prototype by Friday.",
  description: "A practical five-day game development course where students turn their own game idea into a playable, published prototype. Learn a repeatable development workflow you can continue using independently: Godot, Codex, Git, GitHub and itch.io.",
  imageUrl: "", memberAccess: true, priceStatus: "coming_soon",
  audience: "People with a game idea but no idea where to start; beginner developers; designers and artists; students; people learning AI-assisted development; developers who struggle to finish prototypes; creators ready to publish and share playable builds. No professional programming experience is required.",
  outcomes: "Create your own prototype and a working gameplay loop. Plan features with AI, review implementation plans, test generated changes, write professional bug reports, commit and push with Git, publish a playable v0.1, conduct an external playtest, and create a backlog for independent development.",
  tools: "Godot · Codex · Git · GitHub · itch.io",
  methodology: "IDEA → DEFINE → LIST FEATURES → AI PLAN → CREATOR APPROVAL → AI IMPLEMENT → RUN → OBSERVE → QA TICKET → FIX → VERIFY → COMMIT → PUBLISH → PLAYTEST → ITERATE",
  aiRule: "AI PROPOSES. CREATOR APPROVES. AI IMPLEMENTS. CREATOR VERIFIES.",
  expectations: "This is a practical system for turning game ideas into playable prototypes. It is not a complete Godot, Unity or s&box course, a programming degree, a commercial game in five days, or an AI-makes-everything-for-you course. The workflow can later transfer to Unity, s&box and other coding agents.",
  badgeTitle: "GO Prototype Creator — Level 1",
  reviewMinimum: 10,
  curriculumVersion: 1,
  modules: [
    { id: "day-1", title: "Idea to first playable", milestone: "v0.0.1", theme: "Turn an idea into something playable.", content: "Idea vs prototype vs finished game. Define the player's main verb, goal and obstacle; scope v0.1. Set up Godot, Codex, Git and GitHub. Make the first AI interaction, player movement, interaction and gameplay mechanic. Make the first commit. Something can be controlled and something can be interacted with." },
    { id: "day-2", title: "Directing AI", milestone: "v0.0.3", theme: "Learn how to develop with an AI coding agent.", content: "Give AI a feature list. Ask it to inspect the project, identify systems, dependencies and risks, and propose small testable steps with acceptance criteria. Review and approve before implementation. If scope changes materially, stop and approve a revised plan. Run, test and report bugs using structured QA tickets. Implement small gameplay features: collectible, health, timer, enemy, score, power-up, inventory, projectile, dialogue or level transition. Finish with a recognizable gameplay loop." },
    { id: "day-3", title: "Turn the prototype into a game", milestone: "v0.0.5", theme: "Can another person understand the game without an explanation?", content: "VERB: what the player does. OBJECT: what they interact with. RULE: what happens. GOAL: why. FEEDBACK: how they understand. Add start and gameplay states, success, failure, restart, UI, visual feedback, appropriate audio and onboarding. Observe another person playing without explaining. Record Expected, Observed, Player confusion, Player behavior, Player feedback and Highest-priority change." },
    { id: "day-4", title: "Ship it", milestone: "v0.0.8", theme: "Turn the local project into something other people can play.", content: "Git workflow, commits, repositories, builds, export, CI/CD and automated deployment. Preferred pipeline: Godot → Git → GitHub → automated build → itch.io → playable URL. Publish a page with a title, one-sentence description, screenshots, how to play, controls, version, known issues, credits and feedback mechanism. Send the publicly playable build to external testers and join the cohort jam when available." },
    { id: "day-5", title: "Independent creator", milestone: "v0.1.0", theme: "Continue without the mentor doing the work for you.", content: "Independently understand an instructor's change request, list features, ask AI to plan, review and approve, implement, run, report and fix bugs, verify, commit, push and publish. Mentor intervention is limited to genuine blockers. Retrospective: WHAT EXISTS; WHAT WORKS; WHAT DOESN'T; WHAT PLAYERS SAID; WHAT I WOULD BUILD NEXT. Submit your playable itch.io URL and evidence of at least 10 reviews/ratings for human verification. The requirement stays at 10 even above 100 participants; verification may follow the live week." },
  ],
  qaTemplate: "QA TICKET — BUG REPORT\nSubject\nSteps to Reproduce\nExpected\nActual\nStill Working\nEvidence: screenshots / video, debug logs, console / error message\nEnvironment: game version, operating system, engine version, build type, Git commit\n\nAI debugging instructions: Inspect relevant code and identify the probable root cause before editing. Do not modify unrelated systems. Apply the smallest safe fix. Explain the probable root cause, list changed files, describe the change, give exact verification steps, and report remaining risks or unresolved issues.",
  resources: [],
  faq: [
    { question: "Who can attend the first cohort?", answer: "Internal GO team members invited by an organizer and existing Community members. Choose GOHQ (8 seats) or online (unlimited). The course is in English, led by Ivan Kikerkov." },
    { question: "Will sessions be recorded?", answer: "Yes. Recordings are reviewed and approved before release. Recording access requires active membership. After membership expires, separate video-bundle purchase is planned; purchases are coming soon." },
    { question: "How do reviews work?", answer: "Publish on itch.io, gather at least 10 reviews/ratings and submit evidence. A human checks the evidence. The threshold remains 10 for every cohort size. Jam rating queues can help distribute playtests; this is GO's completion requirement, not an itch.io publishing restriction." },
    { question: "Can I attend again?", answer: "Yes. Repeat attendance in another cohort is welcome, subject to eligibility and in-person capacity." },
    { question: "How much does it cost?", answer: "Community members attend free. Standalone purchases are coming soon: join the price announcement waitlist. Future paid purchases will have a no-questions-asked refund policy; bank settlement timing varies." },
  ],
};

export const firstBootcampCohort = {
  id: FIRST_COHORT_ID, slug: FIRST_COHORT_ID, courseId: BOOTCAMP_ID,
  title: "From Idea to Playable · 5–9 October 2026", description: bootcampCourse.description,
  learningType: "course", instructorName: "Ivan Kikerkov", instructorUserId: null,
  level: "Beginner / Early Game Developer", prerequisites: "No professional programming experience required.",
  language: "English", timeZone: "Europe/Skopje", startsAt: "2026-10-05T16:00:00.000Z", endsAt: "2026-10-09T18:00:00.000Z",
  durationMinutes: 600, format: "hybrid", locationType: "hybrid", publicLocation: "GOHQ + online",
  capacity: 8, capacityMode: "in_person", confirmedCount: 0, onlineConfirmedCount: 0, reservedCount: 0, waitlistCount: 0,
  accessType: "community_member_only", membershipRequirement: "Internal GO team and existing Community members",
  enrollmentMode: "automatic", waitlistEnabled: true, status: "enrollment_open",
  enrollmentClosesAt: "2026-10-05T16:00:00.000Z", invitedUserIds: [], customQuestions: [],
  sessions: bootcampCourse.modules.map((module, index) => ({ id: module.id, title: module.title,
    startsAt: `2026-10-0${5 + index}T16:00:00.000Z`, endsAt: `2026-10-0${5 + index}T18:00:00.000Z`, privateSessionUrl: "" })),
  resources: [], jamUrl: "", curriculumSnapshot: bootcampCourse.modules, curriculumVersion: 1,
};
