"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MerchAction({ action }) {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const tokenRead = useRef(false);
  useEffect(() => {
    if (tokenRead.current) return;
    tokenRead.current = true;
    setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  async function submit() {
    if (!token || busy || done) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/merch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      setMessage(result.message); setDone(true);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  const confirming = action === "confirm";
  const heading = confirming
    ? done ? "Your GO merch request is confirmed" : "Confirm your GO merch request"
    : done ? "Reservation cancelled" : "Manage your GO T-shirt reservation";

  return (
    <section className="mx-auto max-w-xl space-y-6 px-5 py-12 sm:py-16">
      <h1 className="text-3xl font-bold leading-tight">{heading}</h1>
      {confirming ? <div role={done ? "status" : undefined} className="space-y-3 rounded-xl border-2 border-pink-400/70 bg-pink-400/10 p-5 text-base leading-7 sm:text-lg">
        <p className="font-semibold text-foreground">{done ? message : "Confirm your email to join the GO T-shirt waitlist."}</p>
        <p className="font-bold text-pink-800 dark:text-pink-200">This is not an order and does not reserve stock.</p>
      </div> : !done && <p className="rounded-xl border bg-muted/30 p-5 text-base font-medium leading-7 text-foreground">Cancel your request to remove your contact and delivery details and stop future availability emails.</p>}
      {!done && <Button className="min-h-12 px-6 text-base font-bold" disabled={!token || busy} onClick={submit}>{busy ? "Please wait…" : confirming ? "Confirm my request" : "Cancel reservation"}</Button>}
      {!token && <p className="text-base font-medium">Open the secure link from your email.</p>}
      {message && (!done || !confirming) && <p role={done ? "status" : "alert"} className={`rounded-lg border p-4 text-base font-semibold leading-7 ${done ? "border-pink-400/50 bg-pink-400/10 text-foreground" : "border-red-400/60 bg-red-400/10 text-red-600 dark:text-red-300"}`}>{message}</p>}
      <Link className="block font-medium text-pink-400 underline underline-offset-4" href="/merch">Back to GO Merch</Link>
    </section>
  );
}
