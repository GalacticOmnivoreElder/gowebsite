import Link from "next/link";
import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusCopy = {
  draft: { label: "Draft", detail: "Your application has not been submitted yet.", stage: 0 },
  submitted: { label: "Submitted / under review", detail: "GO is reviewing your application before arranging an interview.", stage: 1 },
  needs_information: { label: "More information needed", detail: "GO needs an update before review can continue.", stage: 1 },
  approved: { label: "Approved mentor", detail: "Your interview and verification are complete.", stage: 3 },
  paused: { label: "Mentorship paused", detail: "Your mentor activity is currently paused.", stage: 3 },
  rejected: { label: "Application closed", detail: "GO has completed its review of this application.", stage: 1 },
  suspended: { label: "Mentor access suspended", detail: "Your mentor access is currently suspended.", stage: 3 },
  archived: { label: "Application archived", detail: "This mentor application is archived.", stage: 1 },
};

const stages = ["Application", "GO review", "Interview", "Verified mentor"];

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

export function MentorApplicationStatusCard({ application, compact = false }) {
  if (!application) return null;
  const copy = statusCopy[application.status] || statusCopy.draft;
  const updatedAt = formatDate(application.updatedAt || application.submittedAt);

  return (
    <Card className="border-primary/25">
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Mentor application</p>
            <CardTitle className="mt-1">{copy.label}</CardTitle>
          </div>
          <Badge variant={application.status === "approved" ? "default" : "outline"}>{String(application.status || "draft").replaceAll("_", " ")}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{copy.detail}</p>
        {!compact ? (
          <ol aria-label="Mentor application progress" className="grid gap-2 sm:grid-cols-4">
            {stages.map((stage, index) => {
              const complete = index <= copy.stage;
              const Icon = complete ? CheckCircle2 : Circle;
              return <li key={stage} className={`flex items-center gap-2 rounded-md border p-2 text-xs ${complete ? "border-primary/30 bg-primary/5" : "text-muted-foreground"}`}><Icon className="h-4 w-4 shrink-0" />{stage}</li>;
            })}
          </ol>
        ) : null}
        {application.customerMessage ? (
          <div className="rounded-md border bg-muted/35 p-3 text-sm"><p className="font-medium">Message from GO</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{application.customerMessage}</p></div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm"><span className="font-medium">Next step:</span> <span className="text-muted-foreground">{application.nextAction}</span></p>
          {updatedAt ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Updated {updatedAt}</span> : null}
        </div>
        {["draft", "needs_information"].includes(application.status) ? <Button asChild size="sm"><Link href="/profile?tab=mentor">Open mentor application</Link></Button> : null}
        {application.status === "approved" ? <div className="flex flex-wrap gap-2"><Button asChild size="sm"><Link href="/profile?tab=mentor">Manage mentor profile</Link></Button><Button asChild size="sm" variant="outline"><Link href="/profile?tab=mentor#public-mentor-preview">View public preview</Link></Button></div> : null}
      </CardContent>
    </Card>
  );
}
