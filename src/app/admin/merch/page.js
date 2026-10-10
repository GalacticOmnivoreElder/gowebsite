"use client";
import { useEffect, useState } from "react";
import { goFetch } from "@/lib/go-client";
import { MERCH_PRODUCTS, MERCH_SIZES } from "@/lib/merch-core";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const control = "min-h-11 rounded-md border bg-background p-2";
export default function MerchAdmin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState(null);
  const [filter, setFilter] = useState("");
  async function load() { try { setData(await goFetch("/api/admin/merch")); } catch (error) { setError(error.message); } }
  useEffect(() => { load(); }, []);
  async function prepare(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    try { setPrepared(await goFetch("/api/admin/merch", { action: "prepare", productId: form.get("productId"), sizes: form.getAll("sizes"), location: form.get("location"), details: form.get("details") })); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  async function send(id) {
    setBusy(true); setError("");
    try {
      let result;
      do { result = await goFetch("/api/admin/merch", { action: "send", id }); setMessage(`${result.queued} notifications queued.`); } while (!result.done);
      setPrepared(null); await load();
    } catch (error) { setError(error.message); await load(); } finally { setBusy(false); }
  }
  async function sendTest(id) {
    setBusy(true); setError("");
    try { const result = await goFetch("/api/admin/merch", { action: "test", id }); setMessage(result.message); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  function exportCsv() {
    const cell = (value) => `"${String(value ?? "").replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
    const rows = [["Email", "Status", "Item", "Size", "Units", "City", "Country", "Fulfillment"]];
    for (const item of data.requests) for (const line of item.active?.lines || []) rows.push([item.email, item.status, line.productId, line.size, line.quantity, item.active.city, item.active.country, item.active.fulfillment]);
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(cell).join(",")).join("\r\n")], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = "go-merch-demand.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <div className="mx-auto max-w-6xl space-y-8"><h1 className="text-3xl font-bold">GO Merch</h1><p className="text-muted-foreground">Confirmed interest guides purchasing; it does not represent paid orders.</p>{error && <p role="alert" className="text-red-400">{error}</p>}<p role="status">{message}</p><Button onClick={load} disabled={busy}>Refresh</Button>{!data ? <p>Loading demand…</p> : <>
    {data.truncated && <p role="alert" className="rounded border border-amber-500/50 bg-amber-500/10 p-3 text-sm">The dashboard reached its safe 5,000-request read limit. Export and summary totals are partial; narrow or archive the waitlist before sending.</p>}
    <div className="flex flex-wrap gap-6"><p><strong>{data.summary.people}</strong> confirmed people</p><p><strong>{data.summary.units}</strong> requested units</p><p><strong>{data.summary.pending}</strong> pending confirmations / changes</p><Button variant="outline" onClick={exportCsv}>Export confirmed demand</Button></div>
    <section className="space-y-3"><h2 className="text-xl font-bold">Demand by item, size, city, and fulfillment</h2><label className="block">Filter demand<input className={`${control} ml-3`} value={filter} onChange={(event) => setFilter(event.target.value)} /></label><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Variant / location / preference</th><th>People</th><th>Units</th></tr></thead><tbody>{Object.entries(data.summary.variants).filter(([key]) => key.toLowerCase().includes(filter.toLowerCase())).map(([key, value]) => <tr key={key} className="border-t"><td className="p-2">{key}</td><td>{value.people}</td><td>{value.units}</td></tr>)}</tbody></table></div></section>
      <section className="rounded-lg border p-5"><h2 className="text-xl font-bold">Notify availability</h2><p className="my-3 text-sm text-muted-foreground">Enter confirmed price, ordering contact, and delivery or pickup instructions. Only matching confirmed requests receive this email. Unknown sizes must be selected explicitly.</p><form onSubmit={prepare} onChange={() => setPrepared(null)}><fieldset disabled={busy} className="space-y-4"><div className="flex flex-wrap gap-4"><label className="grid gap-2">Item<select className={control} name="productId">{MERCH_PRODUCTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="grid gap-2">Location<select className={control} name="location"><option value="skopje">Skopje</option><option value="macedonia">Elsewhere in North Macedonia</option><option value="international">Another country</option><option value="all">All locations</option></select></label></div><fieldset><legend>Available sizes / format</legend><div className="flex flex-wrap gap-4 py-2">{MERCH_SIZES.map((size) => <label key={size}><input type="checkbox" name="sizes" value={size} className="mr-2" />{size === "unsure" ? "No size / not sure" : size}</label>)}</div></fieldset><label className="block">Price and ordering instructions<Textarea name="details" required minLength={20} maxLength={2000} rows={5} className="mt-2" /></label><Button type="submit">Preview recipients and email</Button></fieldset></form>{prepared && <div className="mt-5 space-y-3 rounded-md border p-4"><p className="font-semibold">{prepared.productName} is available</p><p className="whitespace-pre-wrap">{prepared.details}</p><p>Your waitlist request is not an order or reservation. Follow the instructions above to arrange your purchase.</p><p className="text-sm">The email includes a personal leave-waitlist link.</p><p>{prepared.count}{prepared.countIsMinimum ? "+" : ""} matching people before delivery suppression checks.</p><Button variant="outline" disabled={busy} onClick={() => sendTest(prepared.id)}>Send test to my email</Button> <Button disabled={busy || !prepared.count || prepared.countIsMinimum} onClick={() => send(prepared.id)}>{busy ? "Queuing…" : "Send availability emails"}</Button></div>}</section>
    <section><h2 className="text-xl font-bold">Notifications</h2><p className="text-sm text-muted-foreground">Queued messages are processed by the email worker. Queued does not mean delivered.</p>{data.batches.map((batch) => <div key={batch.id} className="mt-3 rounded border p-3"><p>{batch.productId} · {batch.state} · {batch.queued} queued</p><p className="text-sm">{Object.entries(batch.delivery).map(([status, count]) => `${status}: ${count}`).join(" · ") || "No delivery records yet"}</p>{batch.state === "sending" && <Button disabled={busy} onClick={() => send(batch.id)}>Resume sending</Button>}</div>)}</section>
    <section><h2 className="text-xl font-bold">Latest 100 suggestions</h2>{data.suggestions.map((suggestion) => <div key={suggestion.id} className="mt-3 rounded border p-3"><h3 className="font-semibold">{suggestion.title}</h3><p className="whitespace-pre-wrap">{suggestion.details}</p><p className="text-sm">{suggestion.status}</p>{suggestion.status === "new" && <Button variant="outline" onClick={async () => { try { await goFetch("/api/admin/merch", { action: "review_suggestion", id: suggestion.id }); await load(); } catch (error) { setError(error.message); } }}>Mark reviewed</Button>}</div>)}</section>
  </>}</div>;
}
