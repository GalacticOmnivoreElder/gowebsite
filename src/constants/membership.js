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
