export const MENTOR_VERIFICATION_NOTICE =
  "Mentor applications are reviewed separately from GO subscriptions. An interview and GO verification are required before any approved mentor activity begins; applying does not guarantee approval or a placement.";

export const BILLING_INTERVALS = [
  { id: "monthly", label: "Monthly" },
  { id: "annual", label: "Annual" },
];

export const MEMBERSHIP_PLANS = [
  {
    id: "community",
    tier: "member",
    name: "GO Community",
    audience: "For individual creators",
    description:
      "Apply to listed projects and use the current Community member resources.",
    popular: true,
    benefits: [
      "One unreleased creator project; GO release approval unlocks the next",
      "Apply to open community projects",
      "Periodic asset, music, and code resource drops",
      "Tutorials and learning resources",
      "Community events and member-only Discord access",
    ],
    pricing: {
      monthly: {
        amount: 500,
        period: "month",
        billingNote: "Billed monthly",
      },
      annual: {
        amount: 4800,
        period: "year",
        billingNote: "Equivalent to 400 MKD/month",
        savings: "Save 1,200 MKD",
      },
    },
  },
  {
    id: "mentor",
    tier: "mentor",
    name: "GO Mentor",
    audience: "For mentors and educators",
    description:
      "Mentor-focused membership access for educators and experienced creators. Mentor participation still requires separate GO review.",
    verificationNotice: MENTOR_VERIFICATION_NOTICE,
    benefits: [
      "Member resources and asset packs as they are released",
      "Educational workshops and learning activities",
      "Mentor profile and programme tools after approval",
      "Member collaboration and networking channels",
      "Separate interview and verification path for mentor participation",
    ],
    pricing: {
      monthly: {
        amount: 1499,
        period: "month",
        billingNote: "Billed monthly",
      },
      annual: {
        amount: 14999,
        period: "year",
        billingNote: "Billed annually",
        savings: "Save 2,989 MKD",
      },
    },
  },
  {
    id: "business",
    tier: "company",
    name: "GO Business",
    audience: "For studios and project creators",
    description:
      "Create project briefs, review applicants, manage teams, and use every Community benefit.",
    benefits: [
      "Everything included in GO Community",
      "Project capacity negotiated with the GO Business team",
      "Review applicants and build project teams",
      "Manage your active project portfolio",
      "Priority membership support",
    ],
    pricing: {
      monthly: {
        amount: 2999,
        period: "month",
        billingNote: "Billed monthly",
      },
      annual: {
        amount: 29000,
        period: "year",
        billingNote: "Equivalent to 2,417 MKD/month",
        savings: "Save 6,988 MKD",
      },
    },
  },
];
