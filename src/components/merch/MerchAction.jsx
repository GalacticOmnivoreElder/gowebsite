"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MerchAction({ action }) {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  async function submit() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/merch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      setMessage(result.message); setDone(true);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-xl space-y-6 px-5 py-20"><h1 className="text-3xl font-bold">{action === "confirm" ? "Confirm your merch request" : "Manage your merch request"}</h1><p className="text-muted-foreground">{action === "confirm" ? "Confirming saves your latest choices and replaces any previous request. No payment or reservation is made." : "To change your choices, submit a new request and confirm it by email. To stop availability emails and remove your request, leave the waitlist below."}</p>{!done && <Button disabled={!token || busy} onClick={submit}>{busy ? "Please wait…" : action === "confirm" ? "Confirm my request" : "Leave the waitlist"}</Button>}{!token && <p>Open the link from your email, or submit a new request for a fresh link.</p>}<p role="status">{message}</p><Link className="block text-pink-400 underline" href="/merch">Back to GO Merch</Link></section>;
}
