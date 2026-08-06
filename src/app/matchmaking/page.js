import Link from "next/link";
import { FolderKanban, ShieldCheck } from "lucide-react";
import { getMentorshipPilotConfig } from "@/lib/product-config";
import { MentorshipPilotRequestWorkspace } from "@/components/mentors/MentorshipPilotRequestWorkspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = createMetadata({ title: "GO Mentorship", description: "Submit a clear goal for the controlled Galactic Omnivore mentorship pilot.", path: "/matchmaking" });

export default async function MatchmakingPage({ searchParams }) {
  const config = getMentorshipPilotConfig();
  const enabled = config.featureFlags.mentorshipSystem && config.featureFlags.mentorshipRequests;
  return <main className="container mx-auto max-w-6xl px-4 py-12 md:py-16"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase text-primary">GO Mentorship</p><h1 className="mt-3 text-4xl font-bold md:text-5xl">Find guidance for your next playable milestone</h1><p className="mt-4 max-w-3xl text-lg text-muted-foreground">Submit a clear mentorship goal and GO will review your request. When a suitable approved mentor is available, we may suggest a connection. The mentor decides whether to accept each application.</p></div><Button asChild variant="outline"><Link href="/projects"><FolderKanban className="mr-2 h-4 w-4" />Browse projects</Link></Button></div><div className="mt-8 grid gap-4 md:grid-cols-3"><Card><CardContent className="p-5"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="mt-3 font-semibold">Human-reviewed</h2><p className="mt-1 text-sm text-muted-foreground">GO reviews requests and controls which approved mentors are suggested.</p></CardContent></Card><Card><CardContent className="p-5"><h2 className="font-semibold">Bounded scope</h2><p className="mt-1 text-sm text-muted-foreground">Agree a clear goal, format, schedule, and expectations before the engagement starts.</p></CardContent></Card><Card><CardContent className="p-5"><h2 className="font-semibold">Limited pilot</h2><p className="mt-1 text-sm text-muted-foreground">Access is controlled while GO validates safeguarding, capacity, and operating support.</p></CardContent></Card></div>{enabled ? <div className="mt-10"><MentorshipPilotRequestWorkspace /></div> : <Card className="mt-10 border-primary/30"><CardContent className="space-y-3 p-8"><Badge>Controlled pilot</Badge><h2 className="text-xl font-semibold">Mentorship requests are not open to the public yet</h2><p className="max-w-3xl text-muted-foreground">GO is preparing the first approved mentor group and review process. During the pilot, access is application-based and limited to invited participants. We do not promise a mentor or a particular outcome.</p><Button asChild variant="outline"><Link href="/about">Review GO&apos;s approach</Link></Button></CardContent></Card>}</main>;
}
