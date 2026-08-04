"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MentorDetail({ mentorId }) {
  const [mentor, setMentor] = useState(null);
  const load = useCallback(async () => {
    const response = await fetch(`/api/mentors/${encodeURIComponent(mentorId)}`, { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    setMentor(response.ok ? result : { error: result.error || "Mentor profile unavailable" });
  }, [mentorId]);

  useEffect(() => {
    load().catch(() => setMentor({ error: "Mentor profile unavailable" }));
  }, [load]);

  if (!mentor) return <div className="container py-16"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;
  if (mentor.error) return <div className="container py-16 text-center" role="alert">{mentor.error}</div>;

  return (
    <main className="container mx-auto max-w-5xl px-4 py-12">
      <Button asChild variant="ghost"><Link href="/mentors">Back to mentors</Link></Button>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="flex items-center gap-5">
            {mentor.profileImage
              ? <Image unoptimized src={mentor.profileImage} alt="" width={96} height={96} className="h-24 w-24 rounded-full object-cover" />
              : <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">{mentor.displayName.slice(0, 1)}</div>}
            <div><h1 className="text-4xl font-bold">{mentor.displayName}</h1><Badge className="mt-3">Approved mentor</Badge></div>
          </div>
          <p className="mt-8 whitespace-pre-wrap leading-7 text-muted-foreground">{mentor.biography}</p>
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Disciplines and skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">{[...mentor.disciplines, ...mentor.skills].map((value) => <Badge key={value} variant="outline">{value}</Badge>)}</div>
          </section>
          {mentor.portfolioLinks.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold">Portfolio</h2>
              <div className="mt-3 space-y-2">{mentor.portfolioLinks.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary underline">{link.label}<ExternalLink className="h-4 w-4" /></a>)}</div>
            </section>
          )}
          {mentor.mentorReferences?.length > 0 && <section className="mt-8"><h2 className="text-xl font-semibold">Mentor references</h2><p className="mt-1 text-sm text-muted-foreground">Direct excerpts shared with the author&apos;s consent, approved by GO, and selected by this mentor.</p><div className="mt-4 space-y-3">{mentor.mentorReferences.map((reference, index) => <Card key={`${reference.sharedAt || "reference"}-${index}`}><CardContent className="space-y-3 p-5"><blockquote className="whitespace-pre-wrap leading-7">“{reference.text}”</blockquote><div className="flex flex-wrap gap-2">{reference.qualities.map((quality) => <Badge key={quality} variant="outline">{quality.replaceAll("_", " ")}</Badge>)}</div><p className="text-xs text-muted-foreground">{reference.attribution}</p></CardContent></Card>)}</div></section>}
        </div>
        <Card className="h-fit">
          <CardHeader><CardTitle>Mentorship profile</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div><p className="font-medium">General availability</p><p className="text-muted-foreground">{mentor.generalAvailabilityLabel}</p></div>
            <div><p className="font-medium">Formats</p><p className="capitalize text-muted-foreground">{mentor.mentorshipFormats.join(", ")}</p></div>
            <div><p className="font-medium">Supported levels</p><p className="capitalize text-muted-foreground">{mentor.supportedStudentLevels.map((value) => value.replaceAll("_", " ")).join(", ")}</p></div>
            <div><p className="font-medium">Languages</p><p className="text-muted-foreground">{mentor.languages.join(", ")}</p></div>
            <div><p className="font-medium">Time zone</p><p className="text-muted-foreground">{mentor.timeZone}</p></div>
            <p className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">Exact availability and private contact information are shared only inside an authorized mentorship engagement.</p>
            <Button asChild className="w-full"><Link href={`/matchmaking?mentor=${encodeURIComponent(mentor.id || mentorId)}`}>Request mentorship</Link></Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
