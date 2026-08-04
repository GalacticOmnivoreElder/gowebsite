"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Clapperboard, GraduationCap, Loader2 } from "lucide-react";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LearningDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/me/learning", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Learning dashboard unavailable");
        setData(result);
      } catch (loadError) {
        setError(loadError.message);
      }
    });
    return unsubscribe;
  }, []);
  if (!data && !error) return <Loader2 className="mx-auto h-8 w-8 animate-spin" />;
  return (
    <div className="space-y-6">
      {error && <Card><CardContent className="p-8 text-center text-destructive">{error}</CardContent></Card>}
      {data?.trainingAssignments?.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" />Assigned mentor preparation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.trainingAssignments.map((assignment) => (
              <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
                <div><p className="font-semibold">{assignment.contentTitle}</p><p className="mt-1 text-sm text-muted-foreground">{assignment.reason}</p>{assignment.expiresAt && <Badge className="mt-2" variant="outline">Access until {new Date(assignment.expiresAt).toLocaleDateString()}</Badge>}</div>
                <Button asChild><Link href={assignment.contentType === "video_bundle" ? `/video-bundles/${assignment.contentSlug}` : `/education/${assignment.contentSlug}`}>Open preparation</Link></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />Courses and workshops</CardTitle></CardHeader><CardContent className="space-y-3">{data?.enrollments?.map((enrollment) => <div key={enrollment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"><div><p className="font-semibold">{enrollment.itemTitle}</p><Badge className="mt-2 capitalize">{enrollment.state.replaceAll("_", " ")}</Badge></div><Button asChild variant="outline"><Link href={`/education/${enrollment.itemSlug}`}>Open</Link></Button></div>)}{data?.enrollments?.length === 0 && <p className="py-6 text-center text-muted-foreground">No course or workshop enrollments yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clapperboard className="h-5 w-5" />Video bundle progress</CardTitle></CardHeader><CardContent className="space-y-3">{data?.videoProgress?.map((progress) => <div key={progress.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"><div><p className="font-semibold">{progress.bundleTitle}</p><p className="mt-1 text-sm text-muted-foreground">{progress.completedLessonIndexes?.length || 0} lessons marked complete{progress.manuallyCompleted ? " · Bundle complete" : ""}</p></div><Button asChild variant="outline"><Link href={`/video-bundles/${progress.bundleSlug}`}>Continue</Link></Button></div>)}{data?.videoProgress?.length === 0 && <p className="py-6 text-center text-muted-foreground">No video bundle progress yet.</p>}</CardContent></Card>
    </div>
  );
}
