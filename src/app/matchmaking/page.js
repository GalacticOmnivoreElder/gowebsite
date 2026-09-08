import Link from "next/link";
import { Search, ShieldCheck, Users } from "lucide-react";
import { getMentorshipPilotConfig, getProductConfig } from "@/lib/product-config";
import { MentorDirectory } from "@/components/mentors/MentorDirectory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = createMetadata({
  title: "GO Mentorship",
  description: "Explore verified Galactic Omnivore mentors and apply for structured mentorship.",
  path: "/matchmaking",
});

export default function MentorshipPage() {
  const product = getProductConfig();
  const pilot = getMentorshipPilotConfig();
  const enabled = product.featureFlags.mentorDirectory && pilot.featureFlags.mentorshipSystem && pilot.featureFlags.publicMentorBrowsing;

  return (
    <main className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-sm font-semibold uppercase text-primary">GO Mentorship</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-bold md:text-5xl">Find an official GO mentor for your next milestone</h1>
          <p className="mt-4 max-w-3xl text-lg text-muted-foreground">Browse mentors who have completed GO review and an interview. Choose someone with an available slot, then send a private application for GO to review and forward. Applications are open to eligible GO members from their private profile.</p>
        </div>
        <Button asChild variant="outline"><Link href="/profile?tab=mentorships"><Users className="mr-2 h-4 w-4" />My mentorships</Link></Button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-5"><Search className="h-5 w-5 text-primary" /><h2 className="mt-3 font-semibold">Choose a mentor</h2><p className="mt-1 text-sm text-muted-foreground">Filter official profiles by discipline, skills, level, language, format, and availability.</p></CardContent></Card>
        <Card><CardContent className="p-5"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="mt-3 font-semibold">GO reviews the request</h2><p className="mt-1 text-sm text-muted-foreground">Staff check fit, consent, safety, and current mentor capacity before forwarding it.</p></CardContent></Card>
        <Card><CardContent className="p-5"><Users className="h-5 w-5 text-primary" /><h2 className="mt-3 font-semibold">The mentor decides</h2><p className="mt-1 text-sm text-muted-foreground">The selected mentor reviews the shared application and may accept or decline.</p></CardContent></Card>
      </div>

      {enabled ? <MentorDirectory /> : (
        <Card className="mt-10 border-primary/30"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-8"><div><h2 className="text-xl font-semibold">Official mentor directory</h2><p className="mt-2 text-muted-foreground">The directory is temporarily unavailable.</p></div><Badge>Temporarily unavailable</Badge></CardContent></Card>
      )}
    </main>
  );
}
