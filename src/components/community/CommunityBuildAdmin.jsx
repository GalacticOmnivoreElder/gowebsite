"use client";
import { useCallback, useEffect, useState } from "react";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

async function adminRequest(url, body) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in as a GO administrator");
  const response = await fetch(url, { method: body ? "POST" : "GET", headers: { Authorization: "Bearer " + token, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}
export function CommunityBuildAdmin() {
  const [board, setBoard] = useState(null);
  const [week, setWeek] = useState("");
  const [titles, setTitles] = useState("");
  const [outcome, setOutcome] = useState({ weekId: "", optionId: "", status: "selected", note: "", link: "" });
  const [stamp, setStamp] = useState({ userId: "", sourceId: "", sourceTitle: "", kind: "event", reason: "", spritePath: "" });
  const [passport, setPassport] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const data = await adminRequest("/api/admin/community-builds");
    setBoard(data); setWeek((value) => value || data.period.key);
  }, []);
  useEffect(() => auth.onAuthStateChanged(() => load().catch((error) => setMessage(error.message))), [load]);
  async function run(action) {
    setBusy(true); setMessage("");
    try { await action(); setMessage("Saved."); await load(); } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  const field = (label, value, onChange, type = "text") => <label className="block text-sm font-medium">{label}<Input className="mt-2" value={value} type={type} onChange={(event) => onChange(event.target.value)} /></label>;
  return <div className="space-y-8">
    <h1 className="text-3xl font-bold">Monday builds &amp; Passport stamps</h1>
    {message ? <p className="rounded-lg border p-4" role="status">{message}</p> : null}
    <form className="space-y-4 rounded-xl border bg-card p-6" onSubmit={(event) => { event.preventDefault(); run(() => adminRequest("/api/admin/community-builds", { action: "publish", weekId: week, options: titles.split("\n").map((title) => title.trim()).filter(Boolean).map((title) => ({ title })) })); }}>
      <h2 className="text-xl font-semibold">Publish build candidates</h2><p className="text-sm text-muted-foreground">Two to eight one-hour candidates. Options freeze after the first ballot. Voting closes Monday 07:00 and resets at 08:00, Europe/Warsaw.</p>
      <label className="block text-sm font-medium">Cycle<select className="mt-2 block w-full rounded-md border bg-background p-3" value={week} onChange={(event) => setWeek(event.target.value)}>{board ? [board.period, board.nextPeriod].map((period) => <option key={period.key} value={period.key}>Week of {period.key} · build {period.buildDate}</option>) : <option value="">Loading…</option>}</select></label>
      <label className="block text-sm font-medium">One feature title per line<Textarea className="mt-2 min-h-36" value={titles} onChange={(event) => setTitles(event.target.value)} placeholder={"Improve project filters\nMake Passport sharing clearer"} /></label>
      <Button disabled={busy || !board}>Publish candidates</Button>
    </form>
    <form className="space-y-4 rounded-xl border bg-card p-6" onSubmit={(event) => { event.preventDefault(); run(() => adminRequest("/api/admin/community-builds", { action: "outcome", ...outcome })); }}>
      <h2 className="text-xl font-semibold">Record the build outcome</h2>
      <label className="block text-sm font-medium">Build cycle<select className="mt-2 block w-full rounded-md border bg-background p-3" value={outcome.weekId} onChange={(event) => setOutcome({ ...outcome, weekId: event.target.value, optionId: "" })}><option value="">Choose a published cycle</option>{[board?.poll, board?.previous].filter(Boolean).map((poll) => <option key={poll.id} value={poll.id}>Week of {poll.id}</option>)}</select></label>
      <label className="block text-sm font-medium">Chosen feature<select className="mt-2 block w-full rounded-md border bg-background p-3" value={outcome.optionId} onChange={(event) => setOutcome({ ...outcome, optionId: event.target.value })}><option value="">Choose a candidate</option>{([board?.poll, board?.previous].find((poll) => poll?.id === outcome.weekId)?.options || []).map((option) => <option key={option.id} value={option.id}>{option.title} ({option.votes} votes)</option>)}</select></label>
      <label className="block text-sm font-medium">Status<select className="mt-2 block w-full rounded-md border bg-background p-3" value={outcome.status} onChange={(event) => setOutcome({ ...outcome, status: event.target.value })}>{["selected", "building", "completed", "deferred"].map((status) => <option key={status}>{status}</option>)}</select></label>
      <label className="block text-sm font-medium">Public update, including any tie or scope decision<Textarea className="mt-2" value={outcome.note} onChange={(event) => setOutcome({ ...outcome, note: event.target.value })} /></label>
      {field("Optional HTTPS release/update link", outcome.link, (value) => setOutcome({ ...outcome, link: value }), "url")}
      <Button disabled={busy}>Save public outcome</Button>
    </form>
    <form className="space-y-4 rounded-xl border bg-card p-6" onSubmit={(event) => { event.preventDefault(); run(() => adminRequest("/api/admin/passport-stamps", { action: "issue", ...stamp })); }}>
      <h2 className="text-xl font-semibold">Issue a verified event stamp</h2><p className="text-sm text-muted-foreground">Confirm attendance and current membership. Reuse the same event ID for every participant. Official asset-contribution stamps are reconciled automatically from publication records.</p>
      {field("Recipient's GO user ID", stamp.userId, (value) => setStamp({ ...stamp, userId: value }))}
      {field("Stable GO event ID", stamp.sourceId, (value) => setStamp({ ...stamp, sourceId: value }))}
      {field("Public event title", stamp.sourceTitle, (value) => setStamp({ ...stamp, sourceTitle: value }))}
      <label className="block text-sm font-medium">Stamp<select className="mt-2 block w-full rounded-md border bg-background p-3" value={stamp.kind} onChange={(event) => setStamp({ ...stamp, kind: event.target.value })}><option value="event">GO event participation</option><option value="lan_party">GO LAN party</option></select></label>
      {field("Optional local sprite strip (/stamps/name.png)", stamp.spritePath, (value) => setStamp({ ...stamp, spritePath: value }))}
      <label className="block text-sm font-medium">Internal verification note<Textarea className="mt-2" value={stamp.reason} onChange={(event) => setStamp({ ...stamp, reason: event.target.value })} /></label>
      <Button disabled={busy}>Issue official stamp</Button>
    </form>
    <section className="space-y-4 rounded-xl border bg-card p-6"><h2 className="text-xl font-semibold">Review or revoke a stamp</h2><Button type="button" variant="outline" disabled={busy || !stamp.userId} onClick={() => run(async () => setPassport(await adminRequest("/api/admin/community-builds?userId=" + encodeURIComponent(stamp.userId))))}>Load recipient&apos;s stamps</Button>{passport?.stamps?.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><span>{item.title} · {item.sourceTitle}</span><Button type="button" variant="destructive" disabled={busy} onClick={() => run(async () => { await adminRequest("/api/admin/passport-stamps", { action: "revoke", stampId: item.id, reason: stamp.reason }); setPassport(await adminRequest("/api/admin/community-builds?userId=" + encodeURIComponent(stamp.userId))); })}>Revoke with verification note</Button></div>)}</section>
  </div>;
}
