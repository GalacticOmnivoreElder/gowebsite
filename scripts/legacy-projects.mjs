import { createHash } from "node:crypto";

export const LEGACY_SOURCE = "provided_experience_template";
export const LEGACY_SCHEMA_VERSION = 1;

export const LEGACY_PROJECTS = [
  {
    submissionId: "GO-EXPERIENCE-001",
    title: 'The Human Rights Game "Navigator"',
    sourceGroup: "Navigator",
    sourceTitle: 'THE HUMAN RIGHTS GAME “NAVIGATOR”',
    location: "Skopje, Republic of North Macedonia; Online",
    period: "September-December 2024 (development); 10-24 December 2024 (active phase)",
    startedOn: "2024-09-01",
    completedOn: "2024-12-24",
    type: "Game Development",
    categoryTags: ["Web", "Educational", "Programming", "Human Rights", "Cultural Heritage"],
    description: `# The Human Rights Game "Navigator"

Navigator is a browser-based educational game that introduces young people in North Macedonia to international human rights principles through gamified, digital-first learning. Galactic Omnivore led the technical development, game design, and integration with the Europe House of North Macedonia website.

The experience used scenario-based learning in Macedonian and Albanian, with a competitive format designed for public high schools and supported by EU member state embassies.

## Results

- Delivered the software and gamification economy design and integrated it with the existing Europe House web platform.
- Engaged more than 50,000 players across the game's editions.
- Strengthened critical thinking and legal knowledge through interactive human-rights scenarios.
- Demonstrated the social and educational value of game-based learning.`,
    goal: "Increase awareness and understanding of international human rights principles among youth and students in North Macedonia through gamified, digital-first learning.",
    duration: 120,
    budget: 9720,
    budgetCurrency: "EUR",
    donors: [
      { name: "Europe House of North Macedonia", amount: 4790, currency: "EUR" },
      { name: "The UN Office in North Macedonia", amount: 2500, currency: "EUR" },
    ],
    compensationType: "Paid",
    requiredRoles: ["Game Designer", "Programmer", "C# Developer", "Unity Developer", "UI/UX Designer", "Writer", "Narrative Designer", "QA Tester", "Project Manager", "Producer"],
    results: [
      "More than 50,000 players engaged across the game's editions.",
      "Bilingual scenario-based learning delivered in Macedonian and Albanian.",
      "Technical and gamification systems integrated with the Europe House web platform.",
    ],
  },
  {
    submissionId: "GO-EXPERIENCE-002",
    title: "Navigator 2 - Educational Game on Human Rights",
    sourceGroup: "Navigator",
    sourceTitle: 'NAVIGATOR” - EDUCATIONAL GAME ON HUMAN RIGHTS',
    location: "Skopje, Republic of North Macedonia; Online",
    period: "August-November 2025 (development); 25 November-14 December 2025 (active phase)",
    startedOn: "2025-08-01",
    completedOn: "2025-12-14",
    type: "Game Development",
    categoryTags: ["Web", "Educational", "Programming", "Human Rights", "Civic Education"],
    description: `# Navigator 2 - Educational Game on Human Rights

Navigator 2 extended the original human-rights learning experience into a multilingual, digital-first game for young people in North Macedonia. The project combined interactive questions, friendly competition, and a dedicated Orange Planet focused on gender-based violence during the 16 Days of Activism campaign.

The game was designed to make formal and non-formal learning more accessible while encouraging civic engagement, inclusion, and collaboration among the EU, UN agencies, youth legal organisations, game developers, and local embassies.

## Results

- Around 450,000 human-rights questions were answered during the three-week event.
- The complete experience was available in Macedonian and Albanian.
- Human-rights education, civic participation, and gender-equality themes were delivered through interactive gameplay.`,
    goal: "Promote human-rights education, gender-equality awareness, and youth civic engagement through an inclusive bilingual educational game.",
    duration: 136,
    budget: 13875,
    budgetCurrency: "EUR",
    donors: [
      { name: "The UN Office in North Macedonia", amount: 4500, currency: "EUR" },
      { name: "Europe House of North Macedonia", amount: 6600, currency: "EUR" },
    ],
    compensationType: "Paid",
    requiredRoles: ["Game Designer", "Programmer", "C# Developer", "Unity Developer", "UI/UX Designer", "Writer", "Narrative Designer", "QA Tester", "Project Manager", "Producer", "Animator"],
    linkedSubmissionIds: ["GO-EXPERIENCE-001"],
    results: [
      "Around 450,000 human-rights questions answered during the three-week event.",
      "Bilingual delivery in Macedonian and Albanian.",
      "Dedicated gameplay addressing gender-based violence and civic engagement.",
    ],
  },
  {
    submissionId: "GO-EXPERIENCE-003",
    title: "How Shari Became a Member of Parliament - Animated Video",
    sourceGroup: "Parliamentary Support Programme",
    sourceTitle: 'Parliamentary Support Programme - PSP / “How Shari Became a Member of Parliament” - Animated Video',
    location: "Skopje, Republic of North Macedonia; MRT Assembly Channel",
    period: "15 October-21 December 2025",
    startedOn: "2025-10-15",
    completedOn: "2025-12-21",
    type: "Art & Design",
    categoryTags: ["Educational", "Art", "Writing & Narrative", "Civic Education"],
    description: `# How Shari Became a Member of Parliament

This child-friendly animated video project introduced students to democratic participation, the role of the Assembly, and the responsibilities connected to elections and public decision-making. The story connected everyday problems in a school or neighbourhood to petitions, debate, voting, cooperation, and institutional response.

The production was developed for the Parliamentary Support Programme and prepared for broadcast and educational use through the Macedonian Radio-Television Assembly Channel.

## Results

- Students were introduced to shared problems, public-interest institutions, elections, voting, petitions, and debate.
- The project encouraged responsibility, honesty, participation, cooperation, initiative, advocacy, and care for the community.
- The final educational concept showed that active citizenship extends beyond elections and political office.`,
    goal: "Help children understand democratic institutions and recognise practical ways they can participate in improving their school, neighbourhood, and community.",
    duration: 68,
    budget: 12000,
    budgetCurrency: "EUR",
    donors: [{ name: "National Democratic Institute of North Macedonia", amount: 8706, currency: "EUR" }],
    compensationType: "Paid",
    requiredRoles: ["Project Manager", "Producer", "Writer", "Narrative Designer", "2D Artist", "Animator", "Composer", "Sound Designer", "QA Tester"],
    results: [
      "Child-friendly democratic education prepared for broadcast and classroom use.",
      "Coverage of institutions, elections, petitions, debate, cooperation, and civic responsibility.",
      "Active citizenship presented through practical, age-appropriate storytelling.",
    ],
  },
  {
    submissionId: "GO-EXPERIENCE-004",
    title: "Passion to Profession Game Jam - Neighborhood White Hats",
    sourceGroup: "Passion to Profession Game Jam",
    sourceTitle: "Passion to Profession Game Jam - Neighborhood White Hats",
    location: "Skopje, Republic of North Macedonia; Online",
    period: "1-26 December 2025",
    startedOn: "2025-12-01",
    completedOn: "2025-12-26",
    type: "Game Development",
    categoryTags: ["Game Development", "Educational", "Indie", "Civic Education"],
    description: `# Passion to Profession Game Jam - Neighborhood White Hats

Neighborhood White Hats was a civic and integrity-focused game jam that challenged teams to turn social themes into playable prototypes. The initiative combined mentoring, teamwork, and rapid prototyping so participants could deliver complete games under a shared creative brief.

## Results

- 26 participants registered across 7 teams.
- All teams completed and submitted a playable prototype.
- Civic themes were integrated into 100% of the submissions.
- Five award categories were granted.`,
    goal: "Generate playable prototypes that embed civic and integrity-based mechanics while giving participants practical experience in collaborative game development.",
    duration: 26,
    budget: 3500,
    budgetCurrency: "EUR",
    donors: [{ name: "National Democratic Institute of North Macedonia", amount: 1500, currency: "EUR" }],
    compensationType: "Portfolio/Experience",
    requiredRoles: ["Game Designer", "Programmer", "C# Developer", "Unity Developer", "2D Artist", "3D Artist", "UI/UX Designer", "Animator", "Sound Designer", "Composer", "Writer", "QA Tester", "Project Manager", "Producer"],
    results: [
      "26 participants formed 7 teams.",
      "Seven playable prototypes were submitted with a 100% completion rate.",
      "Every submission incorporated a civic theme.",
    ],
  },
  {
    submissionId: "GO-EXPERIENCE-005",
    title: "MUGI - Macedonian Union of Game Industries",
    sourceGroup: "MUGI",
    sourceTitle: "MUGI - Macedonian Union of Game Industries",
    location: "Skopje, Republic of North Macedonia",
    period: "1 January 2025-31 December 2026",
    startedOn: "2025-01-01",
    completedOn: "2026-12-31",
    type: "Other",
    categoryTags: ["Game Development", "Educational", "Community", "Project Management"],
    description: `# MUGI - Macedonian Union of Game Industries

MUGI was created as a unified representative body for the local gaming ecosystem, with a focus on professionalising the sector, retaining talent, and connecting the Macedonian game industry with the wider European digital market.

## Results

- MUGI was established in January 2025.
- The marketing strategy was deployed, the official website was launched, and active social and Discord channels were established.
- The MUGI Annual Industry Report mapped sector trends including revenue, workforce inflation, and strategic deficits.
- The Passion to Profession educational series delivered 8 specialised sessions and 8 practical workshops.
- The December 2025 MUGI Game Jam was delivered as part of the sector-building programme.`,
    goal: "Professionalise and represent the Macedonian gaming ecosystem while retaining local talent, building skills, and connecting the sector to the European digital market.",
    duration: 730,
    budget: 151750,
    budgetCurrency: "EUR",
    donors: [{ name: "Swedish International Development Cooperation Agency (Sida)", amount: 41000, currency: "EUR" }],
    compensationType: "Paid",
    requiredRoles: ["Project Manager", "Producer", "Marketing Specialist", "Writer", "Game Designer", "Programmer"],
    results: [
      "MUGI established as a representative body in January 2025.",
      "Eight specialised sessions and eight practical workshops delivered through Passion to Profession.",
      "Industry report, marketing infrastructure, website, social channels, and a game jam delivered.",
    ],
  },
  {
    submissionId: "GO-EXPERIENCE-006",
    title: "ENGGD - Empowering the Next Generation of Game Developers",
    sourceGroup: "ENGGD",
    sourceTitle: "ENGGD - Empowering the Next Generation of Game Developers",
    location: "Skopje, Republic of North Macedonia; Online",
    period: "1 December 2023-8 June 2024",
    startedOn: "2023-12-01",
    completedOn: "2024-06-08",
    type: "Game Development",
    categoryTags: ["Educational", "Game Development", "Programming", "Art", "Community"],
    description: `# ENGGD - Empowering the Next Generation of Game Developers

ENGGD provided structured, hands-on education across game design, 2D and 3D art, audio, narrative design, production, and Unity/C# programming. The programme connected aspiring creators into teams, translated theory into prototypes, and used regional game jams to build practical experience.

The project also focused on portfolio growth, visibility, mentorship, and a supportive nonpartisan community for emerging developers in North Macedonia and the wider region.

## Results

- More than 79 participants completed structured educational modules and applied their knowledge in a culminating game jam.
- Participants created 11 games.
- More than 150 participants received soft-skills training on topics from the gaming industry.`,
    goal: "Build practical game-development skills, collaborative experience, and credible portfolios for emerging creators in North Macedonia and the wider region.",
    duration: 191,
    budget: 22070,
    budgetCurrency: "EUR",
    donors: [
      { name: "USAID", amount: 8301, currency: "EUR" },
      { name: "HALKBANK", amount: 1100, currency: "EUR" },
    ],
    compensationType: "Paid",
    requiredRoles: ["Game Designer", "Programmer", "C# Developer", "Unity Developer", "2D Artist", "3D Artist", "UI/UX Designer", "Animator", "Sound Designer", "Composer", "Writer", "Narrative Designer", "QA Tester", "Project Manager", "Producer"],
    results: [
      "More than 79 participants completed the structured modules and culminating game jam.",
      "Eleven games were created by participants.",
      "More than 150 participants received soft-skills training.",
    ],
  },
  {
    submissionId: "GO-EXPERIENCE-007",
    title: "HerDeed",
    sourceGroup: "HerDeed",
    sourceTitle: "Herdeed",
    location: "Skopje, Republic of North Macedonia; Online",
    period: "February 2026-ongoing in the source template; marked completed for this import per the user's request",
    startedOn: "2026-02-01",
    completedOn: null,
    type: "Art & Design",
    categoryTags: ["Web", "VR/AR", "Educational", "Human Rights", "Cultural Heritage"],
    description: `# HerDeed

HerDeed is a digital heritage and public-history project focused on gender equality and the visibility of women's contributions to human rights, science, democracy, and social movements. It combines research, documentation, and interactive digital monuments so overlooked women innovators and movement leaders can be encountered in accessible public spaces.

## Results

- A functional digital archive and monument platform was established to present historical women innovators and activists.
- The project expanded public awareness and educational use of digital monuments.
- Local civil-society and youth networks were strengthened for dialogue around gender-inclusive public history.`,
    goal: "Promote gender equality and preserve the histories of overlooked women through accessible digital monuments, archives, and educational public spaces.",
    duration: 212,
    budget: 7000,
    budgetCurrency: "EUR",
    donors: [{ name: "Community Project", amount: 0, currency: "EUR" }],
    compensationType: "Portfolio/Experience",
    requiredRoles: ["Game Designer", "Programmer", "Unity Developer", "3D Artist", "UI/UX Designer", "Animator", "Writer", "Narrative Designer", "Sound Designer", "QA Tester", "Project Manager", "Producer"],
    results: [
      "Interactive digital archive and monument platform established.",
      "Digital public-history resources created around overlooked women innovators and activists.",
      "Youth and civil-society capacity strengthened for gender-inclusive historical narratives.",
    ],
  },
  {
    submissionId: "GO-EXPERIENCE-008",
    title: "Glagolica: Macedonian Glagolitic in VR",
    sourceGroup: "Glagolica",
    sourceTitle: "Glagolitic VR Exhibition",
    location: "Skopje, Republic of North Macedonia; Online",
    period: "January 2023-ongoing in the source template; marked completed for this import per the user's request",
    startedOn: "2023-01-01",
    completedOn: null,
    type: "Art & Design",
    categoryTags: ["VR/AR", "Educational", "Cultural Heritage", "Macedonian Heritage", "Interactive Art"],
    description: `# Glagolica: Macedonian Glagolitic in VR

Glagolica is an immersive cultural-heritage project that brings Macedonian Glagolitic letters into virtual reality. Instead of presenting the alphabet as static symbols, the project turns each letter into a spatial experience: a place to enter, observe, hear, and interact with.

The experience explores how game development, VR, and digital-heritage tools can preserve history in a way that feels immediate, accessible, and memorable. The project has been developed through iterative prototypes, international showcases, workshops, and exhibition preparation.`,
    goal: "Create an immersive VR experience that transforms Macedonian Glagolitic letters into explorable virtual environments and connects audiences with cultural heritage through spatial storytelling.",
    duration: 40,
    budget: 30000,
    budgetCurrency: "EUR",
    donors: [{ name: "A1 MK", amount: 500, currency: "EUR" }],
    compensationType: "Portfolio/Experience",
    requiredRoles: ["Game Designer", "Unity Developer", "3D Artist", "Sound Designer", "Narrative Designer", "QA Tester", "Programmer", "UI/UX Designer", "Composer", "Project Manager", "Producer", "Writer", "Animator"],
    results: [
      "Interactive VR exhibition platform developed around Glagolitic letterforms.",
      "Prototype work showcased through international exhibitions and workshops.",
      "Cross-sector collaboration connected cultural research, artistic direction, and game development.",
    ],
    existingProjectTitle: "Glagolica: Macedonian Glagolitic in VR",
  },
  {
    submissionId: "GO-EXPERIENCE-009",
    title: "Galactic Omnivore Digital Platform",
    sourceGroup: "Galactic Omnivore Digital Platform",
    sourceTitle: "Galactic Omnivore Digital Platform",
    location: "Skopje, Republic of North Macedonia; Online",
    period: "December 2023-ongoing in the source template; marked completed for this import per the user's request",
    startedOn: "2023-12-01",
    completedOn: null,
    type: "Programming",
    categoryTags: ["Web", "Programming", "Community", "Educational", "Human Rights"],
    description: `# Galactic Omnivore Digital Platform

The Galactic Omnivore Digital Platform is an open, community-driven space for independent creators in North Macedonia and the wider region. It supports collaborative tools, transparent governance, digital skill-building, and the creation and publication of interactive projects addressing social, cultural, and democratic themes.

The platform is designed to make game development and digital media production more accessible to underrepresented voices while promoting fair crediting, clear project terms, and egalitarian collaboration.

## Results

- A growing network of independent creators was equipped to produce, share, and publish interactive projects.
- Open infrastructure was established around transparent, community-driven digital labour practices.
- Local creators strengthened their technical, collaborative, and organisational capacity.`,
    goal: "Foster democratic participation, digital inclusion, and freedom of expression by giving independent creators open access to collaborative tools, transparent governance, and digital skill-building.",
    duration: 1005,
    budget: 20000,
    budgetCurrency: "EUR",
    donors: [],
    compensationType: "Portfolio/Experience",
    requiredRoles: ["Programmer", "UI/UX Designer", "Writer", "Marketing Specialist", "Project Manager", "Producer"],
    results: [
      "Independent creators equipped to produce and publish interactive projects.",
      "Transparent, community-driven infrastructure established.",
      "Technical, collaborative, and organisational capacity strengthened across the local creator network.",
    ],
  },
];

export function deterministicProjectId(submissionId) {
  return `legacy-${createHash("sha256")
    .update(`go-legacy-project:v1:${submissionId}`)
    .digest("hex")
    .slice(0, 24)}`;
}

export function deterministicSourceProjectId(sourceGroup) {
  return `legacy-source-${createHash("sha256")
    .update(`go-legacy-source:v1:${sourceGroup}`)
    .digest("hex")
    .slice(0, 24)}`;
}
