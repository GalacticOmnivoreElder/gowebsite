"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Download, Loader2, Lock, Play, RotateCcw } from "lucide-react";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function OpenButton({ bundleId, targetType, linkIndex = 0, children }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const open = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    setOpening(true); setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/video-bundles/${encodeURIComponent(bundleId)}/open`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ targetType, linkIndex }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.openUrl) throw new Error(result.error || "Video link unavailable");
      if (popup) popup.location.replace(result.openUrl); else window.location.assign(result.openUrl);
    } catch (openError) { popup?.close(); setError(openError.message); } finally { setOpening(false); }
  };
  return <div><Button className="w-full" variant="outline" disabled={opening} onClick={open}>{opening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}{children}</Button>{error && <p className="mt-1 text-xs text-destructive">{error}</p>}</div>;
}

export function VideoBundleDetail({ slug }) {
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const headers = {};
    if (auth.currentUser) headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
    const response = await fetch(`/api/video-bundles/${encodeURIComponent(slug)}`, { headers, cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    setBundle(response.ok ? result : { error: result.error || "Video bundle unavailable" }); setLoading(false);
  }, [slug]);
  useEffect(() => { const unsubscribe = auth.onAuthStateChanged(() => load().catch(() => setBundle({ error: "Video bundle unavailable" }))); return unsubscribe; }, [load]);

  const progress = async (action, lessonIndex) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    const response = await fetch(`/api/video-bundles/${encodeURIComponent(slug)}/progress`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action, lessonIndex }) });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Progress updated." : result.error || "Progress could not be updated.");
    if (response.ok) await load();
  };

  if (loading) return <div className="container py-16"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;
  if (!bundle || bundle.error) return <div className="container py-16 text-center">{bundle?.error || "Video bundle unavailable"}</div>;
  const completed = new Set(bundle.progress?.completedLessonIndexes || []);
  return (
    <main className="container mx-auto max-w-5xl px-4 py-12"><Button variant="ghost" asChild className="mb-6"><Link href="/video-bundles">Back to video bundles</Link></Button><div className="flex flex-wrap gap-2"><Badge>Community learning</Badge><Badge variant="outline">{bundle.intendedLevel}</Badge></div><h1 className="mt-4 text-4xl font-bold">{bundle.title}</h1><p className="mt-2 text-muted-foreground">With {bundle.instructorName}</p><p className="mt-7 whitespace-pre-wrap leading-7 text-muted-foreground">{bundle.description}</p>{bundle.learningObjective && <section className="mt-8"><h2 className="text-xl font-semibold">Learning objective</h2><p className="mt-2 text-muted-foreground">{bundle.learningObjective}</p></section>}
      {!bundle.hasAccess && <Card className="mt-8 border-primary/30"><CardContent className="flex flex-col items-center gap-4 p-8 text-center"><Lock className="h-8 w-8 text-primary" /><p>{bundle.isAuthenticated ? "Active Community or Business membership is required." : "Sign in to check your video-bundle access."}</p><Button asChild><Link href={bundle.isAuthenticated ? "/membership" : `/login?redirect=${encodeURIComponent(`/video-bundles/${slug}`)}`}>{bundle.isAuthenticated ? "Review membership" : "Sign in"}</Link></Button></CardContent></Card>}
      {bundle.hasAccess && <div className="mt-8 space-y-5">{bundle.progress && <div className="rounded-md border bg-muted/20 p-4"><p className="font-medium">{bundle.progress.completionPercentage}% complete</p><div className="mt-2 h-2 overflow-hidden rounded bg-muted"><div className="h-full bg-primary" style={{ width: `${bundle.progress.completionPercentage}%` }} /></div></div>}{bundle.hasCompleteBundleLink && <OpenButton bundleId={bundle.id} targetType="bundle">Open complete bundle</OpenButton>}{bundle.lessons.map((lesson) => <Card key={lesson.linkIndex}><CardHeader><div className="flex items-start justify-between gap-3"><CardTitle className="text-lg">{lesson.linkIndex + 1}. {lesson.title}</CardTitle>{completed.has(lesson.linkIndex) && <Badge><Check className="mr-1 h-3 w-3" />Complete</Badge>}</div></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{lesson.description}</p><OpenButton bundleId={bundle.id} targetType="lesson" linkIndex={lesson.linkIndex}>Open lesson</OpenButton><Button size="sm" variant="ghost" onClick={() => progress(completed.has(lesson.linkIndex) ? "uncomplete_lesson" : "complete_lesson", lesson.linkIndex)}>{completed.has(lesson.linkIndex) ? <RotateCcw className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}{completed.has(lesson.linkIndex) ? "Mark incomplete" : "Mark complete"}</Button></CardContent></Card>)}{bundle.supportingFiles.map((file) => <OpenButton key={file.linkIndex} bundleId={bundle.id} targetType="supporting_file" linkIndex={file.linkIndex}><Download className="mr-2 h-4 w-4" />{file.title}</OpenButton>)}<Button onClick={() => progress(bundle.progress?.manuallyCompleted ? "uncomplete_bundle" : "complete_bundle")}>{bundle.progress?.manuallyCompleted ? "Mark bundle incomplete" : "Mark bundle complete"}</Button>{message && <p className="text-sm" role="status">{message}</p>}</div>}
    </main>
  );
}
