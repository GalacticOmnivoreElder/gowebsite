"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import MobxStore from "@/mobx";
import { auth } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/reusable-ui/LoadingSpinner";
import { Sparkles, CheckCircle, Pencil } from "lucide-react";

async function authedFetch(url, method, body) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function sectionBody(section) {
  const c = section.content_json || {};
  switch (section.section_type) {
    case "summary":
      return <p className="text-muted-foreground">{c.text}</p>;
    case "skills":
      return (
        <p className="text-muted-foreground">
          {c.primary_role} · <span className="capitalize">{c.skill_level}</span>
          {c.secondary_roles?.length ? ` · ${c.secondary_roles.join(", ")}` : ""}
        </p>
      );
    case "tools":
      return (
        <div className="flex flex-wrap gap-2">
          {(c.tools || []).length ? c.tools.map((t) => <Badge key={t} variant="secondary">{t}</Badge>) : <span className="text-muted-foreground text-sm">No tools listed</span>}
        </div>
      );
    case "projects":
      return (c.projects || []).length ? (
        <ul className="space-y-2">
          {c.projects.map((p, i) => (
            <li key={i} className="text-sm">
              <span className="font-medium text-foreground">{p.title}</span>
              {p.role ? ` — ${p.role}` : ""}
              {p.description ? <span className="text-muted-foreground"> · {p.description}</span> : ""}
            </li>
          ))}
        </ul>
      ) : <span className="text-muted-foreground text-sm">No projects yet</span>;
    case "portfolio":
      return (c.links || []).length ? (
        <ul className="space-y-1 text-sm">
          {c.links.map((l, i) => (
            <li key={i}><a className="text-primary hover:underline" href={typeof l === "string" ? l : l.url} target="_blank" rel="noreferrer">{typeof l === "string" ? l : l.url}</a></li>
          ))}
        </ul>
      ) : <span className="text-muted-foreground text-sm">No links</span>;
    case "availability":
      return (
        <p className="text-muted-foreground text-sm">
          {c.available_for_projects ? "Available for projects" : "Not seeking projects"}
          {c.available_for_paid_work ? " · Open to paid work" : ""}
        </p>
      );
    case "interests":
      return (
        <p className="text-muted-foreground text-sm">
          {(c.looking_for || []).join(", ") || "—"}
        </p>
      );
    case "contact":
      return (
        <p className="text-muted-foreground text-sm">
          {c.display_name}
          {c.discord_username ? ` · Discord: ${c.discord_username}` : ""}
          {c.location ? ` · ${c.location}` : ""}
        </p>
      );
    default:
      return null;
  }
}

const CvPage = observer(() => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cv, setCv] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draftSummary, setDraftSummary] = useState("");
  const [draftTitle, setDraftTitle] = useState("");

  useEffect(() => {
    if (!MobxStore.isReady) return;
    if (!MobxStore.user) {
      router.replace("/login?redirect=/cv");
      return;
    }
    (async () => {
      try {
        const data = await authedFetch("/api/me/cv", "GET");
        if (!data.cv) {
          router.replace("/onboarding");
          return;
        }
        setCv(data.cv);
        setDraftSummary(data.cv.summary || "");
        setDraftTitle(data.cv.title || "");
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [MobxStore.isReady, MobxStore.user, router]);

  const run = async (label, fn) => {
    setBusy(label);
    setError("");
    try {
      const data = await fn();
      if (data?.cv) {
        setCv(data.cv);
        setDraftSummary(data.cv.summary || "");
        setDraftTitle(data.cv.title || "");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }
  if (!cv) return null;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold font-heading">Your GO CV</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={cv.status === "active" ? "default" : "secondary"}>
                {cv.status === "active" ? "Published" : "Draft"}
              </Badge>
              {cv.status !== "active" && (
                <span className="text-sm text-muted-foreground">Publish to use it when applying to projects.</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!!busy} onClick={() => run("regen", () => authedFetch("/api/me/cv", "POST"))}>
              <Sparkles className="w-4 h-4 mr-2" />
              {busy === "regen" ? "Regenerating…" : "Regenerate"}
            </Button>
            {cv.status !== "active" && (
              <Button disabled={!!busy} onClick={() => run("publish", () => authedFetch("/api/me/cv", "PUT"))}>
                <CheckCircle className="w-4 h-4 mr-2" />
                {busy === "publish" ? "Publishing…" : "Approve & Publish"}
              </Button>
            )}
          </div>
        </div>

        {(cv.suggested_improvements?.length || cv.missing_information?.length) ? (
          <Card className="border-amber-500/30">
            <CardContent className="pt-6">
              <p className="font-medium mb-2">Suggestions to strengthen your CV</p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {cv.suggested_improvements?.map((s, i) => <li key={`s${i}`}>{s}</li>)}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading">
              {editing ? (
                <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
              ) : (
                cv.title
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
              <Pencil className="w-4 h-4 mr-1" /> {editing ? "Done" : "Edit"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {editing ? (
              <div className="space-y-3">
                <Label>Summary</Label>
                <Textarea rows={4} value={draftSummary} onChange={(e) => setDraftSummary(e.target.value)} />
                <div className="space-y-2">
                  <CheckRow checked={cv.visibility_project_creators} onChange={(v) => setCv({ ...cv, visibility_project_creators: v })} label="Visible to project creators" />
                  <CheckRow checked={cv.visibility_public} onChange={(v) => setCv({ ...cv, visibility_public: v })} label="Public profile" />
                </div>
                <Button
                  disabled={!!busy}
                  onClick={() =>
                    run("save", () =>
                      authedFetch("/api/me/cv", "PATCH", {
                        title: draftTitle,
                        summary: draftSummary,
                        visibility_project_creators: cv.visibility_project_creators,
                        visibility_public: cv.visibility_public,
                      })
                    ).then(() => setEditing(false))
                  }
                >
                  {busy === "save" ? "Saving…" : "Save changes"}
                </Button>
              </div>
            ) : (
              (cv.sections || []).map((section, i) => (
                <div key={i}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {section.title}
                  </h3>
                  {sectionBody(section)}
                </div>
              ))
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="outline" onClick={() => router.push("/projects")}>
            Use this CV to apply to projects
          </Button>
        </div>
      </div>
    </div>
  );
});

function CheckRow({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export default CvPage;
