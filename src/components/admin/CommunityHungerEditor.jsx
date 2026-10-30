"use client";

import { useEffect, useState } from "react";
import { auth } from "@/firebase";

const initial = { capacity: "", commitments: "", interest: "", explanation: "", reviewedOn: "", reason: "" };
export default function CommunityHungerEditor() {
  const [form, setForm] = useState(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/community-hunger", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then((data) => { if (data.hunger) setForm({ ...initial, ...data.hunger }); }).catch(() => setMessage("Could not load the current hunger information.")); }, []);
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/admin/community-hunger", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setForm((current) => ({ ...current, reason: "" })); setMessage("Hunger information saved.");
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border p-5"><h2 className="text-xl font-semibold">How hungry is Galactic Omnivore?</h2><p className="text-sm">Use a qualitative assessment. Identify sources and limitations for any community-interest claims.</p><form className="space-y-3" onSubmit={save}>
    {[["capacity", "Current capacity"], ["commitments", "Current commitments"], ["interest", "Community interest and its sources"], ["explanation", "Explanation"], ["reason", "Reason for this change"]].map(([key, label]) => <label className="block" key={key}>{label}<textarea required maxLength={key === "reason" ? 1000 : 2000} className="mt-1 block w-full rounded border bg-background p-2" value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}
    <label className="block">Last reviewed<input required type="date" className="mt-1 block rounded border bg-background p-2" value={form.reviewedOn} onChange={(event) => setForm({ ...form, reviewedOn: event.target.value })} /></label><button disabled={busy} className="rounded bg-primary px-4 py-2 text-primary-foreground">{busy ? "Saving…" : "Save assessment"}</button><p role="status">{message}</p>
  </form></section>;
}
