"use client";
import { useEffect, useState } from "react";
import { Award, Gamepad2, PackageOpen } from "lucide-react";
import styles from "./PassportStamps.module.css";

function Stamp({ stamp, onToggleVisibility, visibilityBusy = false }) {
  const [playing, setPlaying] = useState(false);
  const Icon = stamp.kind === "lan_party" ? Gamepad2 : stamp.kind === "asset_pack" ? PackageOpen : Award;
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setPlaying(false), 900);
    return () => clearTimeout(timer);
  }, [playing]);
  return <div className="min-w-0 rounded-xl border border-primary/25 bg-card p-5 text-center">
    <button type="button" onClick={() => setPlaying(true)} aria-label={"Animate " + stamp.title + " stamp"} className={styles.stamp + (playing ? " " + styles.playing : "")}>
      {stamp.spritePath ? <span aria-hidden="true" className={styles.art} style={{ backgroundImage: "url(" + stamp.spritePath + ")" }} /> : <Icon aria-hidden="true" className="h-10 w-10" />}
      <span aria-hidden="true" className={styles.spark}>✦</span>
    </button>
    <p className="mt-4 font-semibold">{stamp.title}</p>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{stamp.sourceTitle}</p>
    {stamp.issuedAt ? <p className="mt-2 text-xs text-muted-foreground">Earned {new Date(stamp.issuedAt).toLocaleDateString("en-GB", { timeZone: "Europe/Warsaw", year: "numeric", month: "short", day: "numeric" })}</p> : null}
    {onToggleVisibility ? <button type="button" className="mt-3 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted" disabled={visibilityBusy} onClick={() => onToggleVisibility(stamp)}>{visibilityBusy ? "Saving…" : stamp.displayed === false ? "Show on public Passport" : "Hide from public Passport"}</button> : null}
    <span className="mt-3 inline-block rounded-full border border-primary/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">Official GO stamp</span>
  </div>;
}
export function PassportStamps({ passport, onToggleVisibility, visibilityBusy = false }) {
  if (!passport) return null;
  const stamps = (passport.stamps || []).filter((stamp) => onToggleVisibility || stamp.displayed !== false);
  return <section aria-labelledby="official-stamps-heading" className="mt-8">
    <h2 id="official-stamps-heading" className="text-2xl font-bold">GameDev Passport · GO stamps</h2>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">Official recognition of published contributions and verified GO participation. Tap a stamp to bring it to life. The animation is just for fun.</p>
    {stamps.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{stamps.map((stamp) => <Stamp key={stamp.id} stamp={stamp} onToggleVisibility={onToggleVisibility} visibilityBusy={visibilityBusy} />)}</div> : <p className="mt-5 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">No official GO stamps are currently shown here.</p>}
    {passport.contributions?.length ? <div className="mt-6"><h3 className="font-semibold">Published asset contributions</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">{passport.contributions.map((pack) => <li key={pack.id}>{pack.title}</li>)}</ul></div> : null}
  </section>;
}
