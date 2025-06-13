import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const SAMPLE_PROJECTS = [
  {
    title: "Pixel Perfect Platformer",
    thumbnail:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&h=400&fit=crop",
    categoryTags: ["Indie", "Platformer", "Pixel Art"],
    type: "Game Development",
    description: `# Pixel Perfect Platformer

A challenging 2D platformer inspired by classic games like Super Meat Boy and Celeste. 

## Features
- Tight, responsive controls
- Hand-crafted pixel art
- Original chiptune soundtrack
- 50+ challenging levels
- Speed-running mechanics

## Looking For
We're seeking talented developers to help bring this vision to life!`,
    visibility: "Public",
    goal: "Create an engaging 2D platformer that captures the essence of classic arcade games while adding modern polish and accessibility features.",
    status: "live",
    duration: 180,
    budget: 50000,
    compensationType: "Revenue Share",
    requiredRoles: [
      "2D Artist",
      "Programmer",
      "Sound Designer",
      "Game Designer",
    ],
    linkedProjects: [],
  },
  {
    title: "Fantasy RPG Adventure",
    thumbnail:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&h=400&fit=crop",
    categoryTags: ["RPG", "Fantasy", "Story-Rich"],
    type: "Game Development",
    description: `# Fantasy RPG Adventure

An epic fantasy RPG with deep storytelling and tactical combat.

## Vision
Create a narrative-driven RPG that combines classic turn-based combat with modern storytelling techniques.

## Current Progress
- Basic combat system implemented
- Character creation system
- Initial story outline complete

## Next Steps
- Implement dialogue system
- Create world map
- Design and implement magic system`,
    visibility: "Public",
    goal: "Develop a story-rich RPG that appeals to both classic RPG fans and newcomers to the genre.",
    status: "live",
    duration: 365,
    budget: 150000,
    compensationType: "Paid",
    requiredRoles: [
      "Writer",
      "3D Artist",
      "Programmer",
      "UI/UX Designer",
      "Composer",
    ],
    linkedProjects: [],
  },
  {
    title: "Mobile Puzzle Game",
    thumbnail:
      "https://images.unsplash.com/photo-1556438758-8d49568ce18e?w=600&h=400&fit=crop",
    categoryTags: ["Mobile", "Puzzle", "Casual"],
    type: "Game Development",
    description: `# Mobile Puzzle Game

A relaxing puzzle game for mobile devices with innovative mechanics.

## Concept
Players solve increasingly complex puzzles by manipulating geometric shapes and colors.

## Target Audience
- Casual mobile gamers
- Puzzle enthusiasts
- All ages

## Monetization
- Free to play with optional hints
- Cosmetic upgrades
- Level packs`,
    visibility: "Public",
    goal: "Launch a successful mobile puzzle game that reaches 100K+ downloads in the first year.",
    status: "live",
    duration: 120,
    budget: 25000,
    compensationType: "Revenue Share",
    requiredRoles: ["Unity Developer", "UI/UX Designer", "2D Artist"],
    linkedProjects: [],
  },
  {
    title: "VR Horror Experience",
    thumbnail:
      "https://images.unsplash.com/photo-1592478411213-6153e4ebc696?w=600&h=400&fit=crop",
    categoryTags: ["VR", "Horror", "Immersive"],
    type: "Game Development",
    description: `# VR Horror Experience

An immersive VR horror experience that pushes the boundaries of virtual reality storytelling.

## WARNING: This project contains mature themes and is intended for adult audiences only.

## Technical Requirements
- VR headset compatibility (Quest 2, Index, etc.)
- Spatial audio integration
- Hand tracking support
- Haptic feedback systems

## Team Requirements
- Experience with VR development
- Understanding of horror game design principles
- Ability to work with mature content`,
    visibility: "Private",
    goal: "Create a groundbreaking VR horror experience that showcases the potential of virtual reality for storytelling.",
    status: "live",
    duration: 240,
    budget: 80000,
    compensationType: "Paid",
    requiredRoles: [
      "VR Developer",
      "3D Artist",
      "Sound Designer",
      "Game Designer",
    ],
    linkedProjects: [],
  },
  {
    title: "Educational Math Game",
    thumbnail:
      "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&h=400&fit=crop",
    categoryTags: ["Educational", "Math", "Kids"],
    type: "Game Development",
    description: `# Educational Math Game

Making math fun and engaging for children aged 6-12.

## Educational Goals
- Improve arithmetic skills
- Build confidence in mathematics
- Gamify learning through rewards and progression

## Features
- Adaptive difficulty
- Parent/teacher dashboard
- Progress tracking
- Multiplayer challenges

## Impact
We aim to help thousands of children develop a love for mathematics through engaging gameplay.`,
    visibility: "Public",
    goal: "Develop an educational game that significantly improves children's math skills while keeping them engaged and motivated.",
    status: "live",
    duration: 200,
    budget: 40000,
    compensationType: "Portfolio/Experience",
    requiredRoles: [
      "Unity Developer",
      "UI/UX Designer",
      "Educational Consultant",
      "2D Artist",
    ],
    linkedProjects: [],
  },
];

async function getUserFromToken(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if projects already exist
    const existingProjects = await adminDb
      .collection("projects")
      .limit(1)
      .get();
    if (!existingProjects.empty) {
      return NextResponse.json(
        {
          error:
            "Projects already exist. Use DELETE first to clear existing projects.",
        },
        { status: 400 }
      );
    }

    const createdProjects = [];

    for (const projectData of SAMPLE_PROJECTS) {
      const newProject = {
        ...projectData,
        owner: user.uid,
        admins: [user.uid],
        teamMembers: [user.uid],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await adminDb.collection("projects").add(newProject);
      createdProjects.push({
        id: docRef.id,
        ...newProject,
        createdAt: newProject.createdAt.toISOString(),
        updatedAt: newProject.updatedAt.toISOString(),
      });
    }

    return NextResponse.json({
      message: `Successfully created ${createdProjects.length} sample projects`,
      projects: createdProjects,
    });
  } catch (error) {
    console.error("Error seeding projects:", error);
    return NextResponse.json(
      { error: "Failed to seed projects", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get all projects
    const projectsSnapshot = await adminDb.collection("projects").get();

    if (projectsSnapshot.empty) {
      return NextResponse.json({
        message: "No projects to delete",
      });
    }

    // Delete all projects
    const batch = adminDb.batch();
    projectsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return NextResponse.json({
      message: `Successfully deleted ${projectsSnapshot.docs.length} projects`,
    });
  } catch (error) {
    console.error("Error deleting projects:", error);
    return NextResponse.json(
      { error: "Failed to delete projects", details: error.message },
      { status: 500 }
    );
  }
}
