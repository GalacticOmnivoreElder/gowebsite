"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, Shirt, ShoppingBag, Sticker, MapPin, Truck, Package, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const products = [
  { id: "tshirt", name: "GO T-shirt", note: "An everyday uniform for game creators.", icon: Shirt, apparel: true },
  { id: "hoodie", name: "GO Hoodie", note: "For late builds and early coffee runs.", icon: Shirt, apparel: true },
  { id: "tote", name: "GO Tote bag", note: "Take a little GO wherever you go.", icon: ShoppingBag },
  { id: "stickers", name: "GO Sticker pack", note: "Make your workspace part of the universe.", icon: Sticker },
];
const controlClass = "flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({ label, id, children }) {
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-medium">{label}</label>{children}</div>;
}

export default function MerchPage() {
  const [lines, setLines] = useState([]);
  const nextId = useRef(0);
  const [location, setLocation] = useState("skopje");
  const [fulfillment, setFulfillment] = useState("undecided");
  const [error, setError] = useState("");
  const [review, setReview] = useState(null);
  const [suggestionReviewed, setSuggestionReviewed] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestionBusy, setSuggestionBusy] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  async function send(body) {
    const response = await fetch("/api/merch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "We could not save your request. Please try again.");
    return result;
  }
  async function submitSuggestion(event) {
    event.preventDefault();
    if (suggestionBusy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSuggestionBusy(true); setSuggestionError(""); setSuggestionReviewed("");
    try {
      const result = await send({ action: "suggest", title: data.get("title"), details: data.get("details"), company: data.get("company") });
      form.reset(); setSuggestionReviewed(result.message);
    } catch (error) { setSuggestionError(error.message); } finally { setSuggestionBusy(false); }
  }
  const resultRef = useRef(null);

  function addLine(productId) {
    const key = nextId.current++;
    setLines((current) => [...current, { key, productId, size: "unsure", quantity: 1 }]);
    setReview(null);
    setError("");
  }
  function changeLine(key, update) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...update } : line));
    setReview(null);
  }
  async function submitRequest(event) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    if (!lines.length) {
      setError("Choose at least one merchandise item above.");
      document.getElementById("select-tshirt")?.focus();
      return;
    }
    const combined = new Map();
    for (const line of lines) {
      const key = `${line.productId}:${line.size}`;
      const quantity = Number(line.quantity);
      const total = (combined.get(key) || 0) + quantity;
      if (!Number.isInteger(quantity) || quantity < 1 || total > 10) {
        setError("Choose between 1 and 10 units in total for each item and size.");
        return;
      }
      combined.set(key, total);
    }
    setError("");
    setBusy(true); setReview(null);
    try {
      const result = await send({ email: data.get("email"), name: data.get("name"), city: data.get("city") || "", country: data.get("country") || "", location, fulfillment, consent: data.get("consent") === "on", company: data.get("company"), lines: lines.map(({ productId, size, quantity }) => ({ productId, size, quantity: Number(quantity) })) });
      setReview(result.message);
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }

  return (
    <div className="bg-background text-foreground">
      <section className="relative overflow-hidden border-b px-4 py-16 sm:px-6 sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="text-sm font-mono uppercase tracking-[0.2em] text-pink-400">GO Merch / First stop: Skopje</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">Made for the community.<br /><span className="text-pink-400">Shaped by you.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">What should GO make next? Help shape our first collection by telling us what you’d wear, carry, or stick on your laptop.</p>
            <Button asChild className="mt-8 min-h-11"><a href="#merch-selection">Explore the ideas <ArrowDown className="ml-2 h-4 w-4" aria-hidden="true" /></a></Button>
          </div>
          <div className="border-l-2 border-primary pl-6">
            <p className="text-xl font-semibold">Interest first. Production next.</p>
            <p className="mt-3 leading-7 text-muted-foreground">Join the waitlist. We’ll use your requests to plan quantities and email you when your items are available.</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:px-6">
        <form onSubmit={submitRequest} onChange={() => setReview(null)} aria-label="Merch waitlist"><fieldset disabled={busy} className="min-w-0"><div className="hidden" aria-hidden="true"><label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
          <section id="merch-selection" className="scroll-mt-24" aria-labelledby="selection-title">
            <p className="text-sm font-mono text-pink-400">01 / THE POSSIBILITIES</p>
            <h2 id="selection-title" className="mt-2 text-3xl font-bold">Pick your kind of GO.</h2>
            <p className="mt-3 text-muted-foreground">Proposed merchandise types. Final designs, colours, sizes, and prices are still to be decided.</p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {products.map(({ id, name, note, icon: Icon }) => {
                const selected = lines.some((line) => line.productId === id);
                return <label key={id} className={`relative flex cursor-pointer flex-col rounded-xl border p-5 transition-colors ${selected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/60"}`}>
                  <div className="flex items-center justify-between gap-3"><span className="text-xs uppercase tracking-wider text-muted-foreground">Proposed item</span><input id={`select-${id}`} type="checkbox" className="h-5 w-5 accent-pink-600" checked={selected} onChange={() => { if (selected) { setLines((current) => current.filter((line) => line.productId !== id)); setReview(null); } else addLine(id); }} aria-label={`Select ${name}`} /></div>
                  <div className="my-6 flex h-24 items-center justify-center rounded-lg border border-dashed border-primary/30 bg-background/50"><Icon className="h-14 w-14 text-pink-400" strokeWidth={1.2} aria-hidden="true" /></div>
                  <span className="text-xl font-semibold">{name}</span><span className="mt-2 text-sm leading-6 text-muted-foreground">{note}</span>
                  <span className="mt-5 text-sm text-pink-400">{selected ? "Selected" : "Select this idea"}</span>
                </label>;
              })}
            </div>
          </section>

          <section className="mt-10 rounded-xl border bg-card p-5 sm:p-8" aria-labelledby="request-title">
            <p className="text-sm font-mono text-pink-400">02 / YOUR INTEREST</p>
            <h2 id="request-title" className="mt-2 text-2xl font-bold">Make it yours.</h2>
            {!lines.length && <p className="mt-5 text-muted-foreground">Select an idea above to choose quantities and preferred sizes.</p>}
            <div className="mt-5 space-y-4">
              {lines.map((line) => {
                const product = products.find((item) => item.id === line.productId);
                return <fieldset key={line.key} className="rounded-lg border p-4"><legend className="px-2 font-semibold">{product.name}</legend>
                  <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
                    {product.apparel ? <Field id={`size-${line.key}`} label="Preferred size"><select id={`size-${line.key}`} className={controlClass} value={line.size} onChange={(e) => changeLine(line.key, { size: e.target.value })}><option value="unsure">Not sure yet</option>{["XS", "S", "M", "L", "XL", "XXL"].map((size) => <option key={size}>{size}</option>)}</select></Field> : <p className="text-sm text-muted-foreground">One proposed format. Design to be confirmed.</p>}
                    <Field id={`quantity-${line.key}`} label="Quantity (1–10)"><Input id={`quantity-${line.key}`} className="min-h-11" type="number" inputMode="numeric" min="1" max="10" step="1" required value={line.quantity} onChange={(e) => changeLine(line.key, { quantity: e.target.value })} /></Field>
                    <Button type="button" variant="outline" className="min-h-11" aria-label={`Remove ${product.name} request line`} onClick={() => { setLines((current) => current.filter((item) => item.key !== line.key)); setReview(null); }}>Remove</Button>
                  </div>
                  {product.apparel && <Button type="button" variant="link" className="mt-2 min-h-11 px-0" onClick={() => addLine(product.id)}>Add another size of {product.name}</Button>}
                </fieldset>;
              })}
            </div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <Field id="merch-email" label="Email"><Input name="email" id="merch-email" type="email" required maxLength={254} placeholder="you@example.com" className="min-h-11" /></Field>
              <Field id="merch-name" label="First name (optional)"><Input name="name" id="merch-name" maxLength={80} className="min-h-11" /></Field>
              <Field id="merch-location" label="Where are you based?"><select id="merch-location" className={controlClass} value={location} onChange={(e) => { setLocation(e.target.value); setFulfillment("undecided"); }}><option value="skopje">Skopje</option><option value="macedonia">Elsewhere in North Macedonia</option><option value="international">Another country</option></select></Field>
              <Field id="merch-fulfillment" label="Preferred collection or delivery"><select id="merch-fulfillment" className={controlClass} value={fulfillment} onChange={(e) => setFulfillment(e.target.value)}><option value="undecided">Not sure yet</option><option value="pickup">Office pickup in Skopje</option>{location === "skopje" ? <option value="kiimo">Kiimo delivery within Skopje</option> : <option value="cargo">Paid delivery by arrangement</option>}</select></Field>
              {location !== "skopje" && <Field id="merch-city" label="City"><Input name="city" id="merch-city" required maxLength={100} className="min-h-11" /></Field>}
              {location === "international" && <Field id="merch-country" label="Country"><Input name="country" id="merch-country" required maxLength={100} className="min-h-11" /></Field>}
            </div>
            <p className="mt-5 text-sm text-muted-foreground">No address or phone number needed now. Delivery arrangements and charges will be confirmed later.</p>
            <label className="mt-6 flex items-start gap-3 text-sm leading-6"><input name="consent" type="checkbox" required className="mt-1 h-5 w-5 shrink-0 accent-pink-600" />Email me about availability and next steps for the GO merchandise I request. I can stop these updates at any time.</label>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">A request does not place an order or reserve stock. No payment is required, and availability is not guaranteed. We use your email and choices to manage this waitlist, separately from the newsletter. <Link href="/privacy" className="underline underline-offset-4">Privacy policy</Link></p>
            {error && <p className="mt-4 text-sm text-red-400" role="alert">{error}</p>}
            <Button type="submit" disabled={busy} className="mt-6 min-h-11">{busy ? "Saving…" : "Join the waitlist"}</Button>
            <div aria-live="polite">{review && <div ref={resultRef} tabIndex={-1} className="mt-5 rounded-lg border border-primary/50 bg-primary/10 p-4 focus:outline-none focus:ring-2 focus:ring-ring"><p className="font-semibold">{review}</p></div>}</div>
          </section>
        </fieldset></form>

        <section className="grid gap-8 border-t pt-12 lg:grid-cols-2" aria-labelledby="suggestion-title">
          <div><Lightbulb className="h-8 w-8 text-pink-400" aria-hidden="true" /><h2 id="suggestion-title" className="mt-4 text-3xl font-bold">Something else in mind?</h2><p className="mt-4 max-w-md leading-7 text-muted-foreground">Tell us what else you’d like us to make.</p></div>
          <form aria-label="Suggest merchandise" className="space-y-5" onChange={() => setSuggestionReviewed("")} onSubmit={submitSuggestion}><fieldset disabled={suggestionBusy} className="min-w-0 space-y-5"><div className="hidden" aria-hidden="true"><label>Company<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
            <Field id="suggestion-name" label="What would you like GO to make?"><Input name="title" id="suggestion-name" required pattern=".*\S.*" maxLength={120} className="min-h-11" placeholder="For example, a GO desk mat" /></Field>
            <Field id="suggestion-details" label="Tell us more (optional)"><Textarea name="details" id="suggestion-details" maxLength={1000} rows={4} placeholder="What would make it special? Please leave out personal details." /></Field>
            <Button type="submit" variant="outline" disabled={suggestionBusy} className="min-h-11">{suggestionBusy ? "Sending…" : "Send suggestion"}</Button>{suggestionError && <p role="alert" className="text-red-400 text-sm">{suggestionError}</p>}
            <div role="status">{suggestionReviewed && <p className="rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">{suggestionReviewed}</p>}</div>
          </fieldset></form>
        </section>

        <section aria-labelledby="delivery-title"><h2 id="delivery-title" className="text-3xl font-bold">Delivery & pickup</h2><div className="mt-6 grid gap-6 sm:grid-cols-3">{[[Truck, "Kiimo in Skopje", "Local delivery through Kiimo, with any charge confirmed when you order."], [MapPin, "Pick up at GO", "Collect from our Skopje offices by arrangement."], [Package, "Outside Skopje", "Paid cargo or another delivery option, agreed individually before dispatch."]].map(([Icon, title, description]) => <div key={title}><Icon className="h-6 w-6 text-pink-400" aria-hidden="true" /><h3 className="mt-3 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p></div>)}</div></section>
      </div>
    </div>
  );
}
