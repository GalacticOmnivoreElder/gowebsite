"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";

function dateLabel(value) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}
function Outcome({ poll }) {
  if (!poll?.outcome) return null;
  const candidate = poll.options.find((option) => option.id === poll.outcome.optionId);
  return <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5"><p className="text-xs font-semibold uppercase text-primary">{poll.outcome.status}</p><h3 className="mt-2 text-xl font-semibold">{candidate?.title}</h3><p className="mt-3 whitespace-pre-wrap leading-7 text-muted-foreground">{poll.outcome.note}</p>{poll.outcome.link ? <a href={poll.outcome.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary underline">See the build update</a> : null}</div>;
}
export function MondayBuildBoard() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch("/api/community-builds", { headers: token ? { Authorization: "Bearer " + token } : {}, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setData(result);
  }, []);
  useEffect(() => {
    const refresh = () => load().catch((error) => setMessage(error.message));
    const unsubscribe = auth.onAuthStateChanged(refresh);
    const timer = setInterval(refresh, 60000);
    return () => { unsubscribe(); clearInterval(timer); };
  }, [load]);
  async function vote(event) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true); setMessage("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/community-builds", { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify({ weekId: data.period.key, optionId: selected }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage("Your vote is recorded. Thank you for helping shape Monday's build.");
    } catch (error) { setMessage(error.message); } finally { await load().catch(() => {}); setBusy(false); }
  }
  if (!data) return <p role="status" className="rounded-xl border p-6">{message || "Loading this week's build…"}</p>;
  const canVote = data.availableVotes === 1 && Boolean(data.poll);
  return <div className="space-y-10">
    <section aria-labelledby="this-week-heading" className="rounded-xl border border-primary/30 bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><p className="text-sm text-primary">Next build · {dateLabel(data.period.closesAt)}</p><h2 id="this-week-heading" className="mt-3 text-2xl font-bold">{data.period.inBuildSession ? "Monday build in progress" : "What should we build next?"}</h2></div>
        <div className="rounded-lg border px-4 py-3 text-center"><p className="font-mono text-3xl text-primary">{data.availableVotes}</p><p className="text-xs text-muted-foreground">vote available this week</p></div>
      </div>
      <p className="mt-5 max-w-3xl leading-7 text-muted-foreground">One active GO membership and an officially published GO asset pack unlock one vote each week. Votes expire at Monday 07:00 and refresh at 08:00, Europe/Warsaw. Additional packs do not add votes.</p>
      {data.eligibility.reason ? <p className="mt-5 rounded-lg bg-muted/40 p-4 text-sm">{data.eligibility.reason}</p> : null}
      {data.votedOptionId ? <p className="mt-5 text-sm font-semibold text-primary">Your vote is recorded for this cycle.</p> : null}
      {!data.poll ? <div className="mt-6 rounded-lg border border-dashed p-6"><h3 className="font-semibold">This week&apos;s candidates are being prepared</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">GO will publish a small set of features suitable for the one-hour build. Your allowance is ready when you qualify and voting is open.</p></div> : <form onSubmit={vote} className="mt-7">
        <fieldset disabled={!canVote || busy}>
          <legend className="mb-4 font-semibold">Choose one feature</legend>
          <div className="space-y-3">{data.poll.options.map((option) => <label key={option.id} className="flex min-h-20 cursor-pointer items-start gap-4 rounded-lg border p-5 has-[:checked]:border-primary has-[:disabled]:cursor-default">
            <input className="mt-1 h-4 w-4 accent-[#ca2280]" type="radio" name="build-candidate" value={option.id} checked={data.votedOptionId ? data.votedOptionId === option.id : selected === option.id} onChange={() => setSelected(option.id)} />
            <span className="min-w-0 flex-1"><span className="block font-semibold">{option.title}</span>{option.description ? <span className="mt-2 block text-sm leading-6 text-muted-foreground">{option.description}</span> : null}</span>
            <span className="shrink-0 font-mono text-primary">{option.votes}<span className="sr-only"> votes</span></span>
          </label>)}</div>
        </fieldset>
        <p className="mt-4 text-sm text-muted-foreground">{data.poll.totalVotes} votes recorded. A submitted vote is final for this week.</p>
        {canVote ? <Button type="submit" size="lg" className="mt-5" disabled={!selected || busy}>{busy ? "Recording your vote…" : "Use my weekly vote"}</Button> : null}
        {!data.period.votingOpen ? <p className="mt-5 text-sm">Voting is closed during the Monday build. The next cycle opens at 08:00.</p> : null}
      </form>}
      <Outcome poll={data.poll} />
      {message ? <p role="status" className="mt-5 text-sm">{message}</p> : null}
      <div className="mt-6 flex flex-wrap gap-3">{!data.authenticated ? <Button asChild><Link href="/login?redirect=%2Fcommunity-builds">Sign in</Link></Button> : null}<Button asChild variant="outline"><Link href="/profile?tab=asset-packs">Contribute an asset pack</Link></Button><Button asChild variant="outline"><Link href="/profile?tab=passport">Open your Passport</Link></Button></div>
    </section>
    {data.previous ? <section aria-labelledby="previous-build-heading"><h2 id="previous-build-heading" className="text-2xl font-bold">The previous Monday build</h2><p className="mt-3 text-sm text-muted-foreground">{dateLabel(data.previous.period.closesAt)} · {data.previous.totalVotes} votes recorded</p><Outcome poll={data.previous} />{!data.previous.outcome ? <p className="mt-4 text-muted-foreground">The host&apos;s build update is still to be added.</p> : null}</section> : null}
  </div>;
}
