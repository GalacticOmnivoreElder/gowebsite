export const MENTOR_VERIFICATION_NOTICE =
  "Before you can begin producing courses, workshops, video bundles, or assets, or connect with community members requesting mentorship, you must complete an interview with GO and be verified. Purchasing GO Mentor membership does not automatically verify you.";

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
    id: "mentor",
    tier: "mentor",
    name: "GO Mentor",
    audience: "For mentors and educators",
    description:
      "Tier I membership for sharing your experience with the GO community.",
    verificationNotice: MENTOR_VERIFICATION_NOTICE,
    benefits: [
      "Member resources and asset packs as they are released",
      "Educational workshops and learning activities",
      "Portfolio feedback and mentorship opportunities",
      "Member collaboration and networking channels",
      "Produce courses, workshops, video bundles, and assets after interview and GO verification",
      "Connect with members requesting mentorship after interview and GO verification",
    ],
    pricing: {
      monthly: {
        amount: 1499,
        period: "month",
        billingNote: "Billed monthly",
        checkoutUrl:
          "https://buy.polar.sh/polar_cl_F7jYBdfopsZYvauWl8TbQjAoXTLOAh9MVIXid0Tyfpt",
      },
      annual: {
        amount: 14999,
        period: "year",
        billingNote: "Billed annually",
        savings: "Save 2,989 MKD",
        checkoutUrl:
          "https://buy.polar.sh/polar_cl_qMaoqwArF92Nt3LxzvMy1oHVV14K2PT7YleYz1EaS5D",
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
