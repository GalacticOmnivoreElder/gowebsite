"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { PassportStamps } from "./PassportStamps";

export function PassportWorkspace() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) { setData(null); return; }
    const response = await fetch("/api/passport", { headers: { Authorization: "Bearer " + token }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setData(result);
  }, []);
  useEffect(() => auth.onAuthStateChanged(() => load().catch((error) => setMessage(error.message))), [load]);
  async function reconcile() {
    setBusy(true); setMessage("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/passport", { method: "POST", headers: { Authorization: "Bearer " + token } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(result.awarded ? "Your contribution stamps have been added." : "Your contribution stamps are up to date.");
      await load();
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  return <div className="rounded-xl border bg-card p-6 sm:p-8">
    <h1 className="text-3xl font-bold">Your GameDev Passport</h1>
    <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">I remember the creators who help bring new worlds to life. Your Passport is free; official GO stamps mark published asset contributions and GO event participation verified while you are a member. Your earned history stays with your Passport.</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <Button asChild variant="outline"><Link href="/profile/cv">Edit your free Passport</Link></Button>
      <Button asChild variant="outline"><Link href="/community-builds">Choose my next build</Link></Button>
      {data?.activeMember ? <Button disabled={busy} onClick={reconcile}>Check published contribution stamps</Button> : <Button asChild><Link href="/membership">Explore GO membership</Link></Button>}
    </div>
    {data?.activeMember && data.contributions?.length ? <p className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm font-semibold">Your published offering has earned a seat at my build table: one feature vote each week while your membership and contribution qualify.</p> : null}
    <p className="mt-4 text-sm text-muted-foreground">Your existing profile and Passport visibility settings control public display.</p>
    {message ? <p className="mt-4 text-sm" role="status">{message}</p> : null}
    {!data && !message ? <p className="mt-6" role="status">Loading your Passport…</p> : null}
    <PassportStamps passport={data} />
  </div>;
}
