import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { getProductConfig } from "@/lib/product-config";
import { MentorshipRequestWorkspace } from "@/components/mentors/MentorshipRequestWorkspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = createMetadata({ title: "Game Development Matchmaking", description: "Find GO projects and request mentorship from compatible approved mentors.", path: "/matchmaking" });

export default async function MatchmakingPage({ searchParams }) {
  const { mentor = "" } = await searchParams;
  const enabled = getProductConfig().featureFlags.mentorMatchmaking;
  return <main className="container mx-auto max-w-6xl px-4 py-12 md:py-16"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase text-primary">Matchmaking</p><h1 className="mt-3 text-4xl font-bold md:text-5xl">Find the right next collaboration</h1><p className="mt-4 max-w-3xl text-lg text-muted-foreground">Browse projects or request mentorship. GO suggests compatible available mentors, but you always choose one mentor or request assistance.</p></div><Button asChild variant="outline"><Link href="/projects"><FolderKanban className="mr-2 h-4 w-4" />Browse projects</Link></Button></div>{enabled ? <div className="mt-10"><MentorshipRequestWorkspace initialMentorId={String(mentor || "")} /></div> : <Card className="mt-10 border-primary/30"><CardContent className="flex items-center justify-between gap-4 p-8"><div><h2 className="text-xl font-semibold">Mentor matchmaking</h2><p className="mt-2 text-muted-foreground">Self-service mentorship requests will open after approved mentors and operating support are ready.</p></div><Badge>Coming Soon</Badge></CardContent></Card>}</main>;
}
