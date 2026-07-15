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
      "Join projects, access member resources, and grow with the Galactic Omnivore community.",
    popular: true,
    benefits: [
      "Apply to open community projects",
      "Monthly asset, music, and code packages",
      "Tutorials and learning resources",
      "Community events and member-only Discord access",
      "Premium community newsletter",
    ],
    pricing: {
      monthly: {
        amount: 10,
        period: "month",
        billingNote: "Billed monthly",
      },
      annual: {
        amount: 99,
        period: "year",
        billingNote: "Equivalent to €8.25/month",
        savings: "Save €21",
      },
    },
  },
  {
    id: "business",
    tier: "company",
    name: "GO Business",
    audience: "For studios and project creators",
    description:
      "Run projects, recruit collaborators, and use every Community membership benefit.",
    benefits: [
      "Everything included in GO Community",
      "Create and publish community projects",
      "Review applicants and build project teams",
      "Manage your active project portfolio",
      "Priority membership support",
    ],
    pricing: {
      monthly: {
        amount: 50,
        period: "month",
        billingNote: "Billed monthly",
      },
      annual: {
        amount: 480,
        period: "year",
        billingNote: "Equivalent to €40/month",
        savings: "Save €120",
      },
    },
  },
];
