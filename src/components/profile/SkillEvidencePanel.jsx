"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";

export default function SkillEvidencePanel({ userId, isOwner, projects = [] }) {
  const [data, setData] = useState(null);
  const [skill, setSkill] = useState("");
  const [source, setSource] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const headers = {};
    if (auth.currentUser) headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
    const response = await fetch(`/api/skill-evidence?userId=${encodeURIComponent(userId)}`, { headers, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Skill evidence could not be loaded.");
    setData(result);
    setSkill((current) => current || result.selfReportedSkills?.[0] || "");
    const projectId = projects.find((item) => item.id)?.id;
    setSource((current) => current || (projectId ? `project:${projectId}` : result.mentorshipSources?.[0]?.id ? `mentorship:${result.mentorshipSources[0].id}` : ""));
  }, [userId, projects]);

  useEffect(() => { load().catch((error) => setMessage(error.message)); }, [load]);

  async function submit(body) {
    setBusy(true); setMessage("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/skill-evidence", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Skill evidence could not be saved.");
      setMessage(body.action === "request" ? "Validation request added. Your collaborator or mentor can review it from this profile." : "Skill validation recorded.");
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  if (!data) return <div className="mt-4 space-y-2 text-sm text-muted-foreground">
    {message ? <p role="alert">{message}</p> : <p role="status">Loading skill evidence…</p>}
    {message ? <Button size="sm" variant="outline" onClick={() => load().catch((error) => setMessage(error.message))}>Try again</Button> : null}
  </div>;
  const summaries = data.skillSummary || [];
  const maximumUse = Math.max(1, ...summaries.map((item) => item.verifiedUseCount));
  const sources = [
    ...projects.filter((item) => item.id).map((item) => ({ id: item.id, type: "project", key: `project:${item.id}`, label: item.title || "GO project" })),
    ...(data.mentorshipSources || []).map((item) => ({ id: item.id, type: "mentorship", key: `mentorship:${item.id}`, label: item.label })),
  ];

  return <section className="mt-5 border-t border-white/10 pt-5" aria-labelledby="skill-evidence-heading">
    <div><h3 id="skill-evidence-heading" className="font-semibold">Skill evidence</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Profile tags are self-reported. Verified project use and mentor or collaborator validation are counted separately; these counts do not claim proficiency.</p></div>
    {summaries.length ? <div className="mt-4 space-y-3" role="list" aria-label="Skill usage and validation summary">{summaries.map((item) => <div key={item.skill} role="listitem" className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(110px,0.7fr)_minmax(140px,1.2fr)_minmax(160px,1fr)] sm:items-center">
      <div className="font-medium">{item.skill}{item.selfReported ? <span className="ml-2 text-xs text-muted-foreground">Self-reported</span> : null}</div>
      <div className="h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${item.skill}: ${item.verifiedUseCount} verified project uses`}><div className="h-full rounded-full bg-primary" style={{ width: `${item.verifiedUseCount ? Math.max(8, item.verifiedUseCount / maximumUse * 100) : 0}%` }} /></div>
      <p className="text-xs text-muted-foreground">{item.verifiedUseCount} verified project use{item.verifiedUseCount === 1 ? "" : "s"} · {item.validationCount} validation{item.validationCount === 1 ? "" : "s"}</p>
    </div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">No skill tags or validation evidence yet.</p>}

    {data.evidence?.length ? <ul className="mt-5 space-y-2">{data.evidence.map((entry) => <li key={entry.id} className="rounded-lg border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="font-medium">{entry.skill}</span><span className="ml-2 text-muted-foreground">· {entry.status === "validated" ? `Validated through ${entry.sourceLabel}` : "Waiting for a collaborator to review"}</span>{entry.status === "validated" && entry.validator?.name ? <p className="mt-1 text-xs text-muted-foreground">Validated by {entry.validator.name}{entry.validatedAt ? ` · ${new Date(entry.validatedAt).toLocaleDateString()}` : ""}</p> : null}</div>{entry.canValidate ? <Button size="sm" variant="outline" disabled={busy} onClick={() => submit({ action: "validate", evidenceId: entry.id })}>Validate this skill</Button> : null}</div></li>)}</ul> : null}

    {isOwner ? <div className="mt-5 rounded-lg border border-dashed p-4"><h4 className="font-medium">Request skill validation</h4>{sources.length ? <div className="mt-3 flex flex-col gap-3 sm:flex-row"><label className="sr-only" htmlFor={`evidence-skill-${userId}`}>Skill to validate</label><select id={`evidence-skill-${userId}`} className="rounded-md border bg-background px-3 py-2 text-sm" value={skill} onChange={(event) => setSkill(event.target.value)}>{data.selfReportedSkills.map((value) => <option key={value}>{value}</option>)}</select><label className="sr-only" htmlFor={`evidence-source-${userId}`}>Project or mentorship</label><select id={`evidence-source-${userId}`} className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm" value={source} onChange={(event) => setSource(event.target.value)}>{sources.map((item) => <option key={item.key} value={item.key}>{item.type === "mentorship" ? "Mentorship · " : "Project · "}{item.label}</option>)}</select><Button disabled={busy || !skill || !source} onClick={() => { const selected = sources.find((item) => item.key === source); submit({ action: "request", skill, sourceType: selected.type, sourceId: selected.id }); }}>Request validation</Button></div> : <p className="mt-2 text-sm text-muted-foreground">Join a GO project or start an active mentorship before requesting a collaborator validation. <Link href="/projects" className="text-primary underline underline-offset-4">Explore projects</Link></p>}</div> : null}
    {message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}
  </section>;
}
