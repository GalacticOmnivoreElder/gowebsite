"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GOALS = [
  ["game-jam", "Join a game jam team"],
  ["prototype", "Build a prototype"],
  ["ongoing-project", "Join an ongoing project"],
  ["learning", "Learn through collaboration"],
  ["portfolio", "Make portfolio work"],
];

function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export default function MatchmakingWorkspace() {
  const [data, setData] = useState(null);
  const [skills, setSkills] = useState([]);
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const token = useCallback(async () => auth.currentUser?.getIdToken(), []);
  const load = useCallback(async () => {
    const idToken = await token();
    if (!idToken) { setSignedIn(false); setData(null); return; }
    setSignedIn(true);
    const [response, skillsResponse] = await Promise.all([
      fetch("/api/matchmaking", { headers: { Authorization: `Bearer ${idToken}` }, cache: "no-store" }),
      fetch("/api/skills", { cache: "no-store" }),
    ]);
    const [result, catalog] = await Promise.all([response.json(), skillsResponse.json()]);
    if (!response.ok) throw new Error(result.error || "Matchmaking could not be loaded.");
    setData(result);
    setSkills((catalog.skills || []).filter((skill) => skill.active).map((skill) => skill.name));
    setForm({
      ...result.profile,
      timeZone: result.profile.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    });
  }, [token]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => load().catch((error) => setMessage(error.message)));
    return unsubscribe;
  }, [load]);

  async function save(event) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const idToken = await token();
      const response = await fetch("/api/matchmaking", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Preferences could not be saved.");
      setMessage(form.optedIn ? "Your matchmaking preferences are saved." : "You are hidden from new match suggestions.");
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function respond(action, peerId) {
    setBusy(true); setMessage("");
    try {
      const idToken = await token();
      const response = await fetch("/api/matchmaking", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ action, peerId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your match response could not be saved.");
      setMessage(action === "accept" ? result.state === "matched" ? "You both accepted. Your match is ready." : "Accepted. The other creator must also accept." : action === "block" ? "This creator will no longer appear in your matches." : "You asked GO to show a different creator.");
      await load();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  if (!signedIn) return <main className="container max-w-4xl px-4 py-12"><Card><CardHeader><CardTitle>GO Team Matchmaking</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-muted-foreground">Sign in to opt in, set your team goals, and review compatible creators.</p><Button asChild><Link href="/login?returnTo=%2Fmatchmaking">Sign in to continue</Link></Button></CardContent></Card></main>;
  if (!form || !data) return <main className="container max-w-5xl space-y-4 px-4 py-12" aria-labelledby="matchmaking-loading-heading">
    <h1 id="matchmaking-loading-heading" className="sr-only">GO Team Matchmaking</h1>
    {message ? <p role="alert" className="rounded-lg border p-4 text-sm">{message}</p> : <p role="status">Loading GO matchmaking…</p>}
    {message ? <Button variant="outline" onClick={() => load().catch((error) => setMessage(error.message))}>Try again</Button> : null}
  </main>;

  const fieldClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";
  return <main className="container max-w-6xl space-y-8 px-4 py-8 sm:py-12">
    <header className="max-w-3xl space-y-3">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">GO collaboration service</p>
      <h1 className="text-4xl font-bold">Find your next team</h1>
      <p className="leading-7 text-muted-foreground">GO compares the skill tags, interests, availability and time zone you choose to share. Suggestions include their reasons. Nobody is assigned to a team unless both people accept.</p>
      <p className="text-sm text-muted-foreground">Verified attendance earns a Passport badge. This version records jam milestones without blocking any career progression step.</p>
    </header>

    <Card>
      <CardHeader><CardTitle>Matchmaking preferences</CardTitle></CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={save}>
          <label className="flex items-start gap-3 rounded-lg border p-4 text-sm"><input type="checkbox" className="mt-1" checked={form.optedIn === true} onChange={(event) => setForm({ ...form, optedIn: event.target.checked })} /><span><span className="font-medium">Show me in GO matchmaking</span><span className="mt-1 block text-muted-foreground">Your name, selected skill tags, team goal, time zone and project availability are shown only to other creators who opted in.</span></span></label>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm"><span className="font-medium">My GO skill tags</span><span className="block rounded-md border bg-muted/20 p-3 text-muted-foreground">{form.skills?.length ? form.skills.join(" · ") : "Add skill tags to your GO profile before looking for collaborators."}</span><Link className="text-primary underline underline-offset-4" href="/profile">Update profile skills</Link></label>
            <label className="space-y-2 text-sm"><span className="font-medium">Team goal</span><select className={fieldClass} value={form.goal || ""} onChange={(event) => setForm({ ...form, goal: event.target.value })}><option value="">Choose a goal</option>{GOALS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <fieldset className="space-y-2 text-sm"><legend className="font-medium">Skills I’d like on my team</legend><div className="max-h-52 space-y-2 overflow-y-auto rounded-md border p-3">{skills.map((skill) => <label key={skill} className="flex items-center gap-2"><input type="checkbox" checked={(form.seekingSkills || []).includes(skill)} onChange={() => setForm({ ...form, seekingSkills: toggleValue(form.seekingSkills || [], skill) })} /><span>{skill}</span></label>)}</div><span className="block text-xs text-muted-foreground">Uses GO’s existing skill catalogue. Pick up to 20.</span></fieldset>
            <fieldset className="space-y-2 text-sm"><legend className="font-medium">Shared interests</legend><div className="max-h-52 space-y-2 overflow-y-auto rounded-md border p-3">{skills.map((skill) => <label key={skill} className="flex items-center gap-2"><input type="checkbox" checked={(form.interests || []).includes(skill)} onChange={() => setForm({ ...form, interests: toggleValue(form.interests || [], skill) })} /><span>{skill}</span></label>)}</div></fieldset>
            <label className="space-y-2 text-sm"><span className="font-medium">Time zone shared with opted-in creators</span><input className={fieldClass} maxLength={80} value={form.timeZone || ""} onChange={(event) => setForm({ ...form, timeZone: event.target.value })} placeholder="Europe/Warsaw" /></label>
            <div className="space-y-2 text-sm"><span className="font-medium">Project availability</span><p className="rounded-md border bg-muted/20 p-3 text-muted-foreground">{form.availability === "available" ? "Marked available for projects in your GO profile." : form.availability === "unavailable" ? "Marked not currently available in your GO profile." : "Not specified in your GO profile."}</p><Link className="text-primary underline underline-offset-4" href="/profile">Update availability</Link></div>
          </div>
          <label className="flex items-start gap-3 rounded-lg border p-4 text-sm"><input type="checkbox" className="mt-1" checked={form.shareAppetite === true} onChange={(event) => setForm({ ...form, shareAppetite: event.target.checked })} /><span><span className="font-medium">Use my GO Discord hunger role for matching</span><span className="mt-1 block text-muted-foreground">This shares only the current Hungry / One More Bite / Full role with other opted-in candidates. GO never reads Discord messages. Disconnecting Discord removes the signal.</span></span></label>
          <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save preferences"}</Button>
        </form>
      </CardContent>
    </Card>

    {data.profile?.optedIn ? <>
      <section className="space-y-4" aria-labelledby="match-suggestions-heading"><div><h2 id="match-suggestions-heading" className="text-2xl font-bold">Suggested creators</h2><p className="mt-1 text-sm text-muted-foreground">Choose Accept to send a match request. Your contact details stay private unless you have separately made them public.</p></div>
        {data.suggestions?.length ? <div className="grid gap-4 md:grid-cols-2">{data.suggestions.map((person) => <Card key={person.id}><CardHeader><CardTitle>{person.name}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm">{GOALS.find(([goal]) => goal === person.goal)?.[1] || "Open to collaboration"}</p><p className="text-sm text-muted-foreground">Skills: {person.skills.join(" · ") || "Not listed"}</p><p className="text-sm text-muted-foreground">Looking for: {person.seekingSkills.join(" · ") || "Open to ideas"}</p><ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{person.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => respond("accept", person.id)}>Accept match</Button><Button variant="outline" disabled={busy} onClick={() => respond("decline", person.id)}>Show someone else</Button><Button variant="ghost" disabled={busy} onClick={() => respond("block", person.id)}>Block</Button></div></CardContent></Card>)}</div> : <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No suitable opted-in creators are available right now. Keep your preferences updated and check again later.</p>}
      </section>

      {data.requests?.length ? <section className="space-y-4"><h2 className="text-2xl font-bold">Match requests</h2><div className="grid gap-4 md:grid-cols-2">{data.requests.map((request) => <Card key={request.id}><CardHeader><CardTitle>{request.peer.name}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{request.acceptedByMe ? "You accepted. Waiting for the other creator." : "This creator accepted your suggested match."}</p><ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{request.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>{!request.acceptedByMe ? <Button disabled={busy} onClick={() => respond("accept", request.peer.id)}>Accept match</Button> : null}<Button className="ml-2" variant="outline" disabled={busy} onClick={() => respond("decline", request.peer.id)}>Decline</Button><Button className="ml-2" variant="ghost" disabled={busy} onClick={() => respond("block", request.peer.id)}>Block</Button></CardContent></Card>)}</div></section> : null}

      {data.matches?.length ? <section className="space-y-4"><h2 className="text-2xl font-bold">Your accepted matches</h2><div className="grid gap-4 md:grid-cols-2">{data.matches.map((match) => <Card key={match.id}><CardHeader><CardTitle>{match.peer.name}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Both creators accepted. You can now review each other’s GO profiles.</p><ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{match.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><Button asChild variant="outline"><Link href={match.peer.profileUrl}>View GO profile</Link></Button><Button className="ml-2" variant="ghost" disabled={busy} onClick={() => respond("block", match.peer.id)}>End match and block</Button></CardContent></Card>)}</div></section> : null}
    </> : <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">You are currently hidden from new suggestions. Opt in above whenever you’re ready.</p>}
    {message ? <p className="text-sm" role="status">{message}</p> : null}
  </main>;
}
