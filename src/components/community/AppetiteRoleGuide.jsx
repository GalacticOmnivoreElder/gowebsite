"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const appetiteRoles = [
  {
    id: "hungry",
    name: "Hungry",
    color: "bg-emerald-400",
    text: "Green signal. The Omnivore is ready for another published game.",
  },
  {
    id: "one_more_bite",
    name: "One More Bite",
    color: "bg-amber-300",
    text: "Yellow signal. One more release would make a fine feast.",
  },
  {
    id: "full",
    name: "Full",
    color: "bg-rose-500",
    text: "Red signal. The Omnivore has feasted and is full for now.",
  },
];

export function AppetiteRoleGuide() {
  const [signal, setSignal] = useState(null);

  useEffect(() => {
    let current = true;
    async function loadSignal() {
      try {
        const response = await fetch("/api/community-appetite", { cache: "no-store" });
        const result = await response.json();
        if (current) setSignal(response.ok ? result : { status: "unavailable" });
      } catch {
        if (current) setSignal({ status: "unavailable" });
      }
    }
    loadSignal();
    const timer = setInterval(loadSignal, 300000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, []);

  const headline = {
    loading: "I am reading the community appetite.",
    hungry: "I am hungry for another game.",
    one_more_bite: "One more bite will make a feast.",
    full: "I am full from the games you have published.",
    mixed: "The community appetite is split.",
    quiet: "My appetite signal is waiting for its first role.",
    setup_needed: "My appetite roles are not connected yet.",
    unavailable: "My appetite signal is temporarily unavailable.",
  }[signal?.status || "loading"];
  const signalColor = {
    hungry: "bg-emerald-400",
    one_more_bite: "bg-amber-300",
    full: "bg-rose-500",
    mixed: "bg-primary",
  }[signal?.status] || "bg-white/30";

  return (
    <section
      aria-labelledby="appetite-heading"
      className="rounded-2xl border border-primary/30 bg-[#120d13] p-6 sm:p-8"
    >
      <div className="max-w-3xl">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
          The appetite signal
        </p>
        <h2 id="appetite-heading" className="mt-3 text-2xl font-bold sm:text-3xl">
          How hungry is the Galactic Omnivore?
        </h2>
        <p className="mt-4 leading-7 text-white/70">
          The community sets my appetite through GO Discord roles. Your choice
          tells the galaxy whether I am ready for another release, craving one
          more bite, or full from the feast.
        </p>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4" aria-live="polite">
        <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${signalColor}`} aria-hidden="true" />
        <div>
          <p className="font-semibold text-white">{headline}</p>
          {signal?.configured && signal.total > 0 ? (
            <p className="mt-1 text-xs text-white/55">Based on {signal.total} recently synced Discord appetite role{signal.total === 1 ? "" : "s"} from linked GO members.</p>
          ) : signal?.status === "quiet" ? (
            <p className="mt-1 text-xs text-white/55">No linked GO members have a single appetite role synced yet.</p>
          ) : signal?.status === "mixed" ? (
            <p className="mt-1 text-xs text-white/55">No appetite role is leading. The color key below shows the community signal.</p>
          ) : null}
        </div>
      </div>

      {signal?.configured && signal.total > 0 ? (
        <div className="mt-5" role="img" aria-label={`Community appetite: ${appetiteRoles.map((role) => `${role.name} ${signal.counts?.[role.id] || 0}`).join(", ")}`}>
          <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
            {appetiteRoles.map((role) => (
              <span
                key={role.id}
                className={role.color}
                style={{ width: `${((signal.counts?.[role.id] || 0) / signal.total) * 100}%` }}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-white/45">The leading role sets my signal. A tie means the community appetite is split.</p>
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {appetiteRoles.map((role) => (
          <article key={role.name} className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${role.color}`} aria-hidden="true" />
              <h3 className="font-semibold text-white">{role.name}</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/60">{role.text}</p>
            {signal?.configured ? <p className="mt-3 font-mono text-xs text-white/45">{signal.counts?.[role.id] || 0} linked creator{signal.counts?.[role.id] === 1 ? "" : "s"}</p> : null}
          </article>
        ))}
      </div>

      <p className="mt-5 text-sm leading-6 text-white/55">
        {signal?.configured
          ? "Choose exactly one appetite role in Discord. The live reading counts recently synced roles from GO accounts linked to Discord."
          : "GO is preparing the three appetite roles in Discord. Choose one once the role selector is available."}{" "}
        <Link
          href="https://discord.gg/ZbSShxu6K4"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 font-semibold text-primary underline-offset-4 hover:underline"
        >
          Join GO on Discord
        </Link>
      </p>
    </section>
  );
}
