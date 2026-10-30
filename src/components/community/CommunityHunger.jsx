"use client";

import { useEffect, useState } from "react";

export default function CommunityHunger() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("Loading assessment…");
  useEffect(() => { fetch("/api/community-hunger", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then((result) => { setData(result.hunger); setStatus(result.hunger ? "" : "No assessment has been published yet."); }).catch(() => setStatus("The assessment is temporarily unavailable.")); }, []);
  return <details className="rounded-xl border p-5"><summary className="cursor-pointer text-xl font-semibold">How hungry is Galactic Omnivore?</summary><p className="mt-3 text-sm text-muted-foreground">An admin-maintained qualitative assessment, not a numerical score or a commitment to deliver.</p>{status ? <p className="mt-3" role="status">{status}</p> : <dl className="mt-4 grid gap-4 sm:grid-cols-2">{[["Current capacity", data.capacity], ["Current commitments", data.commitments], ["Community interest and sources", data.interest], ["Explanation", data.explanation]].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{value}</dd></div>)}<div><dt className="font-semibold">Last reviewed</dt><dd><time dateTime={data.reviewedOn}>{data.reviewedOn}</time></dd></div></dl>}</details>;
}
