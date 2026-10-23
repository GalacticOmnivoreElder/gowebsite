"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { MERCH_OFFERS, MERCH_VARIANTS, describeMerchItem } from "@/lib/merch-catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
const controlClass = "flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";


function Field({ label, id, children }) {
  return <div className="space-y-1.5"><label htmlFor={id} className="block text-sm font-medium">{label}</label>{children}</div>;
}

function createSubmissionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function MerchPage() {
  const [offerId, setOfferId] = useState("single");
  const [shirts, setShirts] = useState([
    { design: "main", fit: "male", size: "M" },
    { design: "alternate", fit: "male", size: "M" },
  ]);
  const [activeShirt, setActiveShirt] = useState(0);
  const [quantity, setQuantity] = useState("1");
  const [location, setLocation] = useState("skopje");
  const [fulfillment, setFulfillment] = useState("pickup");
  const [busy, setBusy] = useState(false);
  const [suggestionBusy, setSuggestionBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [suggestionError, setSuggestionError] = useState("");
  const resultRef = useRef(null);
  const submissionIdRef = useRef(null);
  const offer = MERCH_OFFERS.find((item) => item.id === offerId) || MERCH_OFFERS[0];
  const selectedShirt = shirts[activeShirt];
  const count = Math.max(1, Number(quantity) || 1);

  const maxQuantity = Math.floor(10 / offer.shirtCount);

  function updateShirt(update) {
    setShirts((current) => current.map((shirt, index) => index === activeShirt ? { ...shirt, ...update } : shirt));
  }

  async function send(body) {
    const response = await fetch("/api/merch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "We could not save your request. Please try again.");
    return result;
  }

  async function submitReservation(event) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(""); setMessage("");
    try {
      const submission = {
        email: data.get("email"), phone: data.get("phone"), offerId,
        items: shirts.slice(0, offer.shirtCount), quantity: Number(quantity),
        proposedTotalPrice: Number(data.get("proposedTotalPrice")),
        location, city: location === "skopje" ? "Skopje" : data.get("city"),
        fulfillment, address: fulfillment === "delivery" ? data.get("address") : "",
        consent: data.get("consent") === "on", company: data.get("company"),
      };
      const signature = JSON.stringify(submission);
      if (submissionIdRef.current?.signature !== signature) submissionIdRef.current = { id: createSubmissionId(), signature };
      const result = await send({ ...submission, submissionId: submissionIdRef.current.id });
      submissionIdRef.current = null;
      setMessage(result.message);
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function submitSuggestion(event) {
    event.preventDefault();
    if (suggestionBusy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSuggestionBusy(true); setSuggestionError(""); setSuggestionMessage("");
    try {
      const result = await send({ action: "suggest", title: data.get("title"), details: data.get("details"), company: data.get("suggestionCompany") });
      form.reset(); setSuggestionMessage(result.message);
    } catch (requestError) { setSuggestionError(requestError.message); }
    finally { setSuggestionBusy(false); }
  }

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-6 sm:py-9">
        <header>
          <p className="text-xs font-mono uppercase tracking-[0.18em] text-pink-400">GO Merch · First collection</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">The GO T-shirt</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose your shirts, suggest your price and confirm your email. We’ll email you when they’re available.</p>
        </header>

        <form onSubmit={submitReservation} aria-label="Reserve GO T-shirts">
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            <div className="hidden" aria-hidden="true"><label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label></div>

            <fieldset>
              <legend className="sr-only">Choose an offer</legend>
              <div className="grid grid-cols-2 gap-3">
                {MERCH_OFFERS.map((item) => {
                  return <label key={item.id} className={`cursor-pointer rounded-lg border px-3 py-3 text-sm focus-within:ring-2 focus-within:ring-ring ${offerId === item.id ? "border-pink-400 bg-pink-400/10" : "border-border"}`}>
                    <input type="radio" name="offer" className="sr-only" value={item.id} checked={offerId === item.id} onChange={() => { setOfferId(item.id); setActiveShirt(0); setQuantity((current) => String(Math.min(Number(current) || 1, Math.floor(10 / item.shirtCount)))); }} />
                    <span className="block font-semibold">{item.name}</span>
                  </label>;
                })}
              </div>
            </fieldset>

            {offer.shirtCount === 2 && <div className="grid grid-cols-2 gap-3" role="group" aria-label="Choose which shirt to customise">
              {shirts.map((shirt, index) => <button key={index} type="button" aria-pressed={activeShirt === index} onClick={() => setActiveShirt(index)} className={`rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeShirt === index ? "border-pink-400 bg-pink-400/5" : "border-border"}`}><span className="block font-semibold">Shirt {index + 1}</span><span className="mt-0.5 block text-xs text-muted-foreground">{describeMerchItem(shirt)}</span></button>)}
            </div>}

            <fieldset>
              <legend className="mb-3 text-base font-semibold">{offer.shirtCount === 2 ? `Choose shirt ${activeShirt + 1}` : "Choose your T-shirt"}</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {MERCH_VARIANTS.map((item, index) => {
                  const selected = selectedShirt.design === item.design && selectedShirt.fit === item.fit;
                  return <label key={item.id} className={`relative cursor-pointer overflow-hidden rounded-lg border transition-colors focus-within:ring-2 focus-within:ring-ring ${selected ? "border-pink-400 ring-1 ring-pink-400" : "border-border hover:border-pink-400/60"}`}>
                    <input className="sr-only" type="radio" name="variant" value={item.id} checked={selected} onChange={() => updateShirt({ design: item.design, fit: item.fit })} />
                    <span className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border bg-background" aria-hidden="true">{selected && <Check className="h-3 w-3 text-pink-400" />}</span>
                    <span className="relative block aspect-square bg-white"><Image src={item.image} alt={`${item.name} GO T-shirt, ${item.fitLabel.toLowerCase()} fit`} fill sizes="(max-width: 639px) calc(50vw - 22px), (max-width: 1024px) calc(25vw - 22px), 230px" className="object-contain p-1.5" preload={index === 0} /></span>
                    <span className="block px-3 py-2 text-sm"><span className="block font-semibold">{item.name}</span><span className="text-xs text-muted-foreground">{item.fitLabel}</span></span>
                  </label>;
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3">
              <Field id="merch-size" label={offer.shirtCount === 2 ? `Size · shirt ${activeShirt + 1}` : "Size"}><select id="merch-size" name="size" className={controlClass} value={selectedShirt.size} onChange={(event) => updateShirt({ size: event.target.value })}>{sizes.map((size) => <option key={size}>{size}</option>)}</select></Field>
              <Field id="merch-quantity" label={offer.shirtCount === 2 ? "Quantity · packages" : "Quantity"}><Input id="merch-quantity" name="quantity" type="number" inputMode="numeric" min="1" max={maxQuantity} step="1" required className="min-h-11" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></Field>
              <div className="col-span-2 sm:col-span-1"><Field id="merch-price" label="Your total price (MKD)"><Input id="merch-price" name="proposedTotalPrice" type="number" inputMode="numeric" min="1" max="1000000" step="1" required aria-describedby="merch-price-help" className="min-h-11" /></Field></div>
            </div>

            <p id="merch-price-help" className="text-xs text-muted-foreground">Suggest a total for all {count * offer.shirtCount} selected T-shirt{count * offer.shirtCount === 1 ? "" : "s"}, excluding delivery. This is a price suggestion, not a confirmed purchase price.</p>

            <div className="grid gap-6 border-t pt-5 md:grid-cols-2">
              <section className="space-y-3" aria-labelledby="contact-title">
                <h2 id="contact-title" className="text-base font-semibold">Contact</h2>
                <Field id="merch-email" label="Email"><Input name="email" id="merch-email" type="email" autoComplete="email" required maxLength={254} className="min-h-11" placeholder="you@example.com" /></Field>
                <Field id="merch-phone" label="Telephone"><Input name="phone" id="merch-phone" type="tel" autoComplete="tel" required maxLength={32} className="min-h-11" placeholder="+389 70 000 000" /></Field>
              </section>
              <section className="space-y-3" aria-labelledby="collection-title">
                <h2 id="collection-title" className="text-base font-semibold">Pickup or delivery</h2>
                <Field id="merch-location" label="Location"><select id="merch-location" name="location" className={controlClass} value={location} onChange={(event) => { setLocation(event.target.value); if (event.target.value !== "skopje") setFulfillment("delivery"); }}><option value="skopje">Skopje</option><option value="north_macedonia">Elsewhere in North Macedonia</option></select></Field>
                {location === "north_macedonia" && <Field id="merch-city" label="City"><Input id="merch-city" name="city" required maxLength={100} autoComplete="address-level2" className="min-h-11" /></Field>}
                <Field id="merch-fulfillment" label="Collection method"><select id="merch-fulfillment" name="fulfillment" className={controlClass} value={fulfillment} onChange={(event) => setFulfillment(event.target.value)}><option value="pickup" disabled={location !== "skopje"}>GO office pickup · Skopje</option><option value="delivery">{location === "skopje" ? "Kiimo delivery" : "Cargo delivery by arrangement"}</option></select></Field>
                {fulfillment === "delivery" && <Field id="merch-address" label="Delivery address"><Input id="merch-address" name="address" required maxLength={300} autoComplete="street-address" className="min-h-11" placeholder="Street, building and apartment" /></Field>}
                <p className="text-xs leading-5 text-muted-foreground">Pickup is free. Delivery is paid separately to the courier; cargo fees outside Skopje are agreed before dispatch.</p>
              </section>
            </div>

            <div className="space-y-3 border-t pt-4">
              <label className="flex items-start gap-2.5 text-xs leading-5"><input name="consent" type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0 accent-pink-600" /><span>I agree GO may use my email and phone to manage this T-shirt reservation and contact me about fulfilment. <Link href="/privacy" className="underline underline-offset-2">Privacy policy</Link></span></label>
              <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={busy} className="min-h-11">{busy ? "Saving…" : "Reserve T-shirts"}</Button><p className="text-xs text-muted-foreground">No payment now. We’ll email purchase details when available.</p></div>
              {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
              <div aria-live="polite">{message && <p ref={resultRef} tabIndex={-1} role="status" className="rounded-lg border border-pink-400/50 bg-pink-400/10 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">{message}</p>}</div>
            </div>
          </fieldset>
        </form>

        <details className="border-t pt-4">
          <summary className="cursor-pointer text-sm font-semibold">Suggest future GO merchandise</summary>
          <form className="mt-3 max-w-xl space-y-3" onSubmit={submitSuggestion}>
            <div className="hidden" aria-hidden="true"><label>Company<input name="suggestionCompany" tabIndex={-1} autoComplete="off" /></label></div>
            <Field id="suggestion-title" label="What should we make?"><Input name="title" id="suggestion-title" required pattern=".*\S.*" maxLength={120} className="min-h-11" placeholder="For example, a GO cap" /></Field>
            <Field id="suggestion-details" label="More detail (optional)"><Textarea name="details" id="suggestion-details" maxLength={1000} rows={2} /></Field>
            {suggestionError && <p role="alert" className="text-sm text-red-400">{suggestionError}</p>}
            <div role="status">{suggestionMessage && <p className="text-sm">{suggestionMessage}</p>}</div>
            <Button type="submit" variant="outline" disabled={suggestionBusy}>{suggestionBusy ? "Sending…" : "Send suggestion"}</Button>
          </form>
        </details>
      </div>
    </main>
  );
}
