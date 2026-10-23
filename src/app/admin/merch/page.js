"use client";

import { useCallback, useEffect, useState } from "react";
import { goFetch } from "@/lib/go-client";
import { MERCH_AVAILABILITY_SIZES, MERCH_DESIGNS } from "@/lib/merch-core";
import { MERCH_OFFERS, describeMerchItem, getReservationItems } from "@/lib/merch-catalog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const control = "min-h-11 rounded-md border bg-background p-2";
const fulfillmentLabel = (value) => value === "pickup" ? "Office pickup" : value === "kiimo" ? "Kiimo delivery" : value === "cargo" ? "Cargo delivery" : value || "—";

export default function MerchAdmin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState(null);
  const [demandFilter, setDemandFilter] = useState("");
  const [reservationFilter, setReservationFilter] = useState("");

  const load = useCallback(async () => {
    try { setData(await goFetch("/api/admin/merch")); setError(""); }
    catch (requestError) { setError(requestError.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function prepare(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      setPrepared(await goFetch("/api/admin/merch", {
        action: "prepare",
        productId: "tshirt",
        offerId: form.get("offerId"),
        design: form.get("design"),
        sizes: form.getAll("sizes"),
        location: form.get("location"),
        details: form.get("details"),
        checkoutUrl: form.get("checkoutUrl"),
      }));
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function send(id) {
    setBusy(true); setError("");
    try {
      let result;
      do {
        result = await goFetch("/api/admin/merch", { action: "send", id });
        setMessage(`${result.delivery?.sent || 0} availability emails sent now; ${result.delivery?.failed || 0} temporary delivery failures will retry. ${result.queued} matching reservations queued so far.`);
      } while (!result.done);
      setPrepared(null); await load();
    } catch (requestError) { setError(requestError.message); await load(); }
    finally { setBusy(false); }
  }

  async function sendTest(id) {
    setBusy(true); setError("");
    try { const result = await goFetch("/api/admin/merch", { action: "test", id }); setMessage(result.message); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  function exportCsv() {
    const cell = (value) => `"${String(value ?? "").replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""')}"`;
    const rows = [["Email", "Telephone", "Status", "Offer", "Selected shirts", "Packages", "Total T-shirts", "Pricing", "Amount MKD", "City", "Fulfilment", "Delivery address"]];
    for (const item of data.requests) {
      if (item.reservation) {
        const reservation = item.reservation;
        rows.push([item.email, item.phone, item.status, reservation.offerName || "One T-shirt", getReservationItems(reservation).map(describeMerchItem).join(" | "), reservation.packageQuantity || reservation.quantity, reservation.quantity, reservation.proposedTotalPrice != null ? "Customer suggested total" : "Previously quoted total", reservation.proposedTotalPrice ?? reservation.totalPrice, reservation.city, fulfillmentLabel(reservation.fulfillment), reservation.address]);
      }
      for (const line of item.active?.lines || []) rows.push([item.email, "", item.status, "Legacy request", `${line.productId} / ${line.size}`, "", line.quantity, "", "", item.active.city, fulfillmentLabel(item.active.fulfillment), ""]);
    }
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(cell).join(",")).join("\r\n")], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = "go-t-shirt-reservations.csv"; link.click(); URL.revokeObjectURL(url);
  }

  const reservations = (data?.requests || []).filter((item) => item.reservation)
    .filter((item) => `${item.email} ${item.phone} ${item.reservation.offerName} ${getReservationItems(item.reservation).map(describeMerchItem).join(" ")} ${item.reservation.city} ${item.reservation.fulfillment}`.toLowerCase().includes(reservationFilter.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header><h1 className="text-3xl font-bold">GO T-shirt reservations</h1><p className="mt-2 text-muted-foreground">Reservations help plan production. No online payments or orders are taken.</p></header>
      {error && <p role="alert" className="text-red-400">{error}</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
      <Button onClick={load} disabled={busy} variant="outline">Refresh</Button>
      {!data ? <p>Loading reservations…</p> : <>
        {data.truncated && <p role="alert" className="rounded border border-amber-500/50 bg-amber-500/10 p-3 text-sm">Dashboard totals are partial because the safe 5,000-request read limit was reached.</p>}
        <div className="flex flex-wrap items-center gap-6">
          <p><strong>{data.summary.people}</strong> reservations</p>
          <p><strong>{data.summary.units}</strong> T-shirts requested</p>
          {data.summary.pending > 0 && <p><strong>{data.summary.pending}</strong> email confirmations pending</p>}
          <Button variant="outline" onClick={exportCsv}>Export reservations</Button>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">Demand by design, size, fit and fulfilment</h2>
          <label className="block text-sm">Filter demand<input className={`${control} ml-3`} value={demandFilter} onChange={(event) => setDemandFilter(event.target.value)} /></label>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Design / size / fit / location</th><th>People</th><th>Units</th></tr></thead><tbody>{Object.entries(data.summary.variants).filter(([key]) => key.toLowerCase().includes(demandFilter.toLowerCase())).map(([key, value]) => <tr key={key} className="border-t"><td className="p-2">{key}</td><td>{value.people}</td><td>{value.units}</td></tr>)}</tbody></table></div>
        </section>

        <section className="space-y-3">
          <div><h2 className="text-xl font-bold">Reservation contact and fulfilment</h2><p className="text-sm text-muted-foreground">Delivery addresses are visible to admins for arranging fulfilment. Include the address in CSV exports only when needed.</p></div>
          <label className="block text-sm">Filter reservations<input className={`${control} ml-3`} value={reservationFilter} onChange={(event) => setReservationFilter(event.target.value)} /></label>
          <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead><tr><th className="p-2">Contact</th><th>T-shirt</th><th>Location / fulfilment</th><th>Delivery address</th></tr></thead><tbody>{reservations.map((item) => <tr key={item.id} className="border-t align-top"><td className="p-2"><a className="underline" href={`mailto:${encodeURIComponent(item.email)}`}>{item.email}</a><br />{item.phone && <a className="text-muted-foreground underline" href={`tel:${encodeURIComponent(item.phone)}`}>{item.phone}</a>}</td><td>{getReservationItems(item.reservation).map((shirt, index) => <p key={index}>{describeMerchItem(shirt)}</p>)}<p className="text-muted-foreground">{item.reservation.packageQuantity || item.reservation.quantity} × {item.reservation.offerName || "One T-shirt"} · {item.reservation.quantity} T-shirts</p><p>{item.reservation.proposedTotalPrice != null ? "Suggested total" : "Previously quoted total"}: {Number(item.reservation.proposedTotalPrice ?? item.reservation.totalPrice ?? 0).toLocaleString("en-US")} MKD</p></td><td>{item.reservation.city}<br />{fulfillmentLabel(item.reservation.fulfillment)}</td><td>{item.reservation.address || "—"}</td></tr>)}</tbody></table>{reservations.length === 0 && <p className="py-4 text-sm text-muted-foreground">No matching reservations.</p>}</div>
        </section>

        <section className="rounded-lg border p-5">
          <h2 className="text-xl font-bold">Notify matching reservations</h2>
          <p className="my-3 text-sm text-muted-foreground">Send an availability update after stock and ordering details are confirmed. Emails are attempted immediately; temporary delivery failures retry automatically.</p>
          <form onSubmit={prepare} onChange={() => setPrepared(null)}><fieldset disabled={busy} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="grid gap-2">Offer<select className={control} name="offerId"><option value="all">All offers</option>{MERCH_OFFERS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="grid gap-2">Design<select className={control} name="design"><option value="all">All designs</option>{MERCH_DESIGNS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="grid gap-2">Location<select className={control} name="location"><option value="skopje">Skopje</option><option value="macedonia">Elsewhere in North Macedonia</option><option value="all">All locations</option></select></label>
            </div>
            <fieldset><legend>T-shirt sizes</legend><div className="flex flex-wrap gap-4 py-2">{MERCH_AVAILABILITY_SIZES.map((item) => <label key={item}><input type="checkbox" name="sizes" value={item} className="mr-2" />{item === "unsure" ? "Not sure (legacy requests)" : item}</label>)}</div></fieldset>
            <p className="text-xs text-muted-foreground">Both shirts in a package must match the selected designs and sizes. Use all designs for mixed packages.</p>
            <label className="grid gap-2">Checkout link (optional)<input className={control} type="url" name="checkoutUrl" maxLength={2083} placeholder="https://" /><span className="text-xs text-muted-foreground">Use a provider that supports physical merchandise. Match the offer and designs above to the product at checkout.</span></label>
            <label className="block">Confirmed availability and ordering instructions<Textarea name="details" required minLength={20} maxLength={2000} rows={4} className="mt-2" placeholder="Include stock availability, next steps, payment, and any confirmed delivery fees." /></label>
            <Button type="submit" disabled={busy}>Preview recipients</Button>
          </fieldset></form>
          {prepared && <div className="mt-5 space-y-3 rounded-md border p-4"><p className="font-semibold">{prepared.productName} is available</p><p className="whitespace-pre-wrap">{prepared.details}</p>{prepared.checkoutUrl && <a className="block break-all text-sm underline" href={prepared.checkoutUrl} target="_blank" rel="noopener noreferrer">Review checkout link</a>}<p className="text-sm">{prepared.count}{prepared.countIsMinimum ? "+" : ""} matching people before delivery suppression checks.</p><Button variant="outline" disabled={busy} onClick={() => sendTest(prepared.id)}>Send test to my email</Button> <Button disabled={busy || !prepared.count || prepared.countIsMinimum} onClick={() => send(prepared.id)}>{busy ? "Sending…" : "Send availability emails"}</Button></div>}
        </section>

        {data.batches.length > 0 && <section><h2 className="text-xl font-bold">Availability email batches</h2>{data.batches.map((batch) => <div key={batch.id} className="mt-3 rounded border p-3"><p>{batch.design === "all" ? "All designs" : batch.design} · {batch.state} · {batch.queued} emails queued</p><p className="text-sm">{Object.entries(batch.delivery).map(([status, count]) => `${status}: ${count}`).join(" · ") || "No delivery records yet"}</p>{batch.state === "sending" && <Button disabled={busy} onClick={() => send(batch.id)}>Resume batch</Button>}</div>)}</section>}

        {data.suggestions.length > 0 && <section><h2 className="text-xl font-bold">Future merchandise suggestions</h2>{data.suggestions.map((suggestion) => <div key={suggestion.id} className="mt-3 rounded border p-3"><h3 className="font-semibold">{suggestion.title}</h3>{suggestion.details && <p className="whitespace-pre-wrap">{suggestion.details}</p>}<p className="text-sm">{suggestion.status}</p>{suggestion.status === "new" && <Button variant="outline" onClick={async () => { try { await goFetch("/api/admin/merch", { action: "review_suggestion", id: suggestion.id }); await load(); } catch (requestError) { setError(requestError.message); } }}>Mark reviewed</Button>}</div>)}</section>}
      </>}
    </div>
  );
}
