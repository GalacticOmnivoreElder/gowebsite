import { Users } from "lucide-react";
import { getProductConfig } from "@/lib/product-config";
import { MentorDirectory } from "@/components/mentors/MentorDirectory";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = createMetadata({
  title: "Approved Mentors",
  description: "Discover approved Galactic Omnivore mentors by discipline, skills, level, language, and format.",
  path: "/mentors",
});

export default function MentorsPage() {
  const enabled = getProductConfig().featureFlags.mentorDirectory;
  return (
    <main className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
      <div className="flex items-start gap-4">
        <Users className="mt-1 h-9 w-9 text-primary" />
        <div>
          <p className="text-sm font-semibold uppercase text-primary">Mentor Programme</p>
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">Approved mentors</h1>
          <p className="mt-4 max-w-3xl text-muted-foreground">Explore public mentor profiles without exposing private schedules, contact details, or internal approval records.</p>
        </div>
      </div>
      {enabled ? <MentorDirectory /> : <Card className="mt-10 border-primary/30"><CardContent className="flex items-center justify-between gap-4 p-8"><div><h2 className="text-xl font-semibold">Mentor directory</h2><p className="mt-2 text-muted-foreground">The directory will open when the first approved public mentor profile is ready.</p></div><Badge>Coming Soon</Badge></CardContent></Card>}
    </main>
  );
}
