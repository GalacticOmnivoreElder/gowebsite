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
      "Periodic asset, music, and code resource drops",
      "Tutorials and learning resources",
      "Community events and member-only Discord access",
    ],
    pricing: {
      monthly: {
        amount: 500,
        period: "month",
        billingNote: "Billed monthly",
        checkoutUrl:
          "https://buy.polar.sh/polar_cl_3eQZAkgR7tt6AVntit4gkKMQJ6vM7p2jlwvLF0EyUMq",
      },
      annual: {
        amount: 4800,
        period: "year",
        billingNote: "Equivalent to 400 MKD/month",
        savings: "Save 1,200 MKD",
        checkoutUrl:
          "https://buy.polar.sh/polar_cl_dXXa5BGsLP8ukTHL5uFn6Ly8ijgz3VFqYAnHr4EvUxI",
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
        checkoutUrl:
          "https://buy.polar.sh/polar_cl_jXCPPseL1ZnPUhkxY7JJBjUk5CdzsimvTqVum2zuJgz",
      },
      annual: {
        amount: 29000,
        period: "year",
        billingNote: "Equivalent to 2,417 MKD/month",
        savings: "Save 6,988 MKD",
        checkoutUrl:
          "https://buy.polar.sh/polar_cl_UtMDVEYWTIf2MyIECvoclfxLXrXvXjwEcJZAO3i0SeK",
      },
    },
  },
];
