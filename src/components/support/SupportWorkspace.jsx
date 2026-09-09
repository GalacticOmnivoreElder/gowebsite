"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { auth } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const categories = ["account", "billing", "membership", "mentorship", "learning", "projects", "resources", "technical", "other"];
const emptyForm = { category: "technical", subject: "", message: "", attachmentText: "" };
const formatDate = (value) => value ? new Date(value).toLocaleString() : "";

export function SupportWorkspace() {
  const searchParams = useSearchParams();
  const requestedTicket = searchParams.get("ticket") || "";
  const [requests, setRequests] = useState(null);
  const [selectedId, setSelectedId] = useState(requestedTicket);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const request = useCallback(async (url, options = {}) => {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(url, { ...options, cache: "no-store", headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Support request failed");
    return result;
  }, []);

  const load = useCallback(async () => {
    const result = await request("/api/support");
    setRequests(result.requests || []);
    if (!selectedId && result.requests?.length) setSelectedId(result.requests[0].id);
  }, [request, selectedId]);

  const loadDetail = useCallback(async (ticketId) => {
    if (!ticketId) return setDetail(null);
    const result = await request(`/api/support/${ticketId}`);
    setDetail(result);
  }, [request]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => load().catch((error) => setMessage(error.message)));
    return unsubscribe;
  }, [load]);

  useEffect(() => {
    loadDetail(selectedId).catch((error) => setMessage(error.message));
  }, [loadDetail, selectedId]);

  const attachments = useMemo(() => form.attachmentText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean), [form.attachmentText]);

  async function createTicket() {
    setBusy(true); setMessage("");
    try {
      const result = await request("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, attachments }) });
      setForm(emptyForm); setSelectedId(result.ticket.id); setMessage("Support request created. GO will keep its status here."); await load(); await loadDetail(result.ticket.id);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function act(action, payload = {}) {
    if (!selectedId) return;
    setBusy(true); setMessage("");
    try {
      await request(`/api/support/${selectedId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...payload }) });
      setReply(""); setMessage("Support request updated."); await load(); await loadDetail(selectedId);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">GO Support</h2><p className="mt-1 text-sm text-muted-foreground">Create and follow account, membership, billing, and platform requests without leaving GO.</p></div>
    {message ? <p role="status" className="rounded-md border p-3 text-sm">{message}</p> : null}
    <Card><CardHeader><CardTitle>Create a support request</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2"><label className="text-sm"><span className="mb-1 block font-medium">Category</span><select className="w-full rounded-md border bg-background px-3 py-2" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{categories.map((category) => <option key={category} value={category}>{category.replaceAll("_", " ")}</option>)}</select></label><label className="text-sm"><span className="mb-1 block font-medium">Subject</span><Input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} /></label></div>
      <label className="block text-sm"><span className="mb-1 block font-medium">How can GO help?</span><textarea className="min-h-28 w-full rounded-md border bg-background px-3 py-2" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} /></label>
      <label className="block text-sm"><span className="mb-1 block font-medium">Attachment links (optional)</span><textarea className="min-h-20 w-full rounded-md border bg-background px-3 py-2" placeholder="One private HTTPS link per line" value={form.attachmentText} onChange={(event) => setForm((current) => ({ ...current, attachmentText: event.target.value }))} /><span className="mt-1 block text-xs text-muted-foreground">Use links you control and avoid passwords or payment credentials.</span></label>
      <Button disabled={busy || form.subject.trim().length < 5 || form.message.trim().length < 10} onClick={createTicket}>Create request</Button>
    </CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <section><h3 className="mb-3 text-lg font-semibold">Your requests</h3>{requests === null ? <p>Loading requests...</p> : requests.length ? <div className="space-y-2">{requests.map((ticket) => <button key={ticket.id} onClick={() => setSelectedId(ticket.id)} className={`w-full rounded-md border p-3 text-left ${selectedId === ticket.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}><div className="flex items-start justify-between gap-2"><span className="font-medium">{ticket.subject}</span><Badge variant="outline">{ticket.status.replaceAll("_", " ")}</Badge></div><p className="mt-2 text-xs text-muted-foreground">Updated {formatDate(ticket.updatedAt)}</p></button>)}</div> : <p className="rounded-md border p-5 text-sm text-muted-foreground">No support requests yet.</p>}</section>
      <section>{detail ? <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{detail.ticket.subject}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{detail.ticket.category} · opened {formatDate(detail.ticket.createdAt)}</p></div><Badge>{detail.ticket.status.replaceAll("_", " ")}</Badge></div></CardHeader><CardContent className="space-y-5">
        <div className="space-y-3">{detail.messages.map((item) => <div key={item.id} className={`rounded-md border p-4 ${item.authorRole === "staff" ? "border-primary/30 bg-primary/5" : ""}`}><div className="flex justify-between gap-3"><span className="text-sm font-semibold">{item.authorRole === "staff" ? "GO Support" : "You"}</span><span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm">{item.body}</p>{item.attachments?.length ? <div className="mt-3 space-y-1">{item.attachments.map((url) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-primary hover:underline">Attachment</a>)}</div> : null}</div>)}</div>
        {detail.ticket.status !== "closed" ? <><label className="block text-sm"><span className="mb-1 block font-medium">Add a reply</span><textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2" value={reply} onChange={(event) => setReply(event.target.value)} /></label><div className="flex flex-wrap gap-2"><Button disabled={busy || reply.trim().length < 2} onClick={() => act("reply", { message: reply })}>Send reply</Button><Button disabled={busy} variant="outline" onClick={() => act("close")}>Close request</Button></div></> : <Button disabled={busy} onClick={() => act("reopen")}>Reopen request</Button>}
      </CardContent></Card> : <p className="rounded-md border p-6 text-center text-muted-foreground">Select a request to see its history.</p>}</section>
    </div>
  </div>;
}
