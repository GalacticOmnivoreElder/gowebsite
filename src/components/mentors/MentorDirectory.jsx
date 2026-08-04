"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialFilters = { search: "", discipline: "", skill: "", level: "", language: "", format: "", availability: "", accepting: "" };

function SelectFilter({ label, value, options, onChange }) {
  return <label className="space-y-1 text-sm"><span className="font-medium">{label}</span><select className="w-full rounded-md border bg-background px-3 py-2" value={value} onChange={(event) => onChange(event.target.value)}><option value="">All</option>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>;
}

export function MentorDirectory() {
  const [mentors, setMentors] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const load = useCallback(async () => {
    setError("");
    const response = await fetch("/api/mentors", { cache: "no-store" });
    const result = await response.json().catch(() => []);
    if (!response.ok) throw new Error(result.error || "Mentors could not be loaded");
    setMentors(result);
  }, []);
  useEffect(() => { load().catch((loadError) => setError(loadError.message)); }, [load]);

  const options = useMemo(() => {
    const unique = (field) => [...new Set((mentors || []).flatMap((mentor) => mentor[field] || []))].sort();
    return { disciplines: unique("disciplines"), skills: unique("skills"), levels: unique("supportedStudentLevels"), languages: unique("languages"), formats: unique("mentorshipFormats") };
  }, [mentors]);
  const visible = useMemo(() => (mentors || []).filter((mentor) => {
    const includes = (field, value) => !value || (mentor[field] || []).includes(value);
    return (!filters.search || `${mentor.displayName} ${mentor.biography}`.toLowerCase().includes(filters.search.toLowerCase())) && includes("disciplines", filters.discipline) && includes("skills", filters.skill) && includes("supportedStudentLevels", filters.level) && includes("languages", filters.language) && includes("mentorshipFormats", filters.format) && (!filters.availability || mentor.generalAvailability === filters.availability) && (!filters.accepting || mentor.currentlyAcceptingStudents === (filters.accepting === "true"));
  }), [mentors, filters]);

  if (!mentors && !error) return <div className="py-16 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /><p className="mt-3 text-sm text-muted-foreground">Loading approved mentors…</p></div>;
  if (error) return <Card className="mt-10"><CardContent className="p-8 text-center"><p className="text-destructive" role="alert">{error}</p><Button className="mt-4" variant="outline" onClick={() => load().catch((loadError) => setError(loadError.message))}>Try again</Button></CardContent></Card>;
  return <div className="mt-10 space-y-8"><section aria-label="Mentor filters" className="rounded-lg border bg-card p-5"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><label className="space-y-1 text-sm"><span className="font-medium">Name or biography</span><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} /></div></label><SelectFilter label="Discipline" value={filters.discipline} options={options.disciplines} onChange={(value) => setFilters((current) => ({ ...current, discipline: value }))} /><SelectFilter label="Skill" value={filters.skill} options={options.skills} onChange={(value) => setFilters((current) => ({ ...current, skill: value }))} /><SelectFilter label="Student level" value={filters.level} options={options.levels} onChange={(value) => setFilters((current) => ({ ...current, level: value }))} /><SelectFilter label="Language" value={filters.language} options={options.languages} onChange={(value) => setFilters((current) => ({ ...current, language: value }))} /><SelectFilter label="Format" value={filters.format} options={options.formats} onChange={(value) => setFilters((current) => ({ ...current, format: value }))} /><SelectFilter label="Availability" value={filters.availability} options={["accepting", "limited", "unavailable"]} onChange={(value) => setFilters((current) => ({ ...current, availability: value }))} /><SelectFilter label="Accepting students" value={filters.accepting} options={["true", "false"]} onChange={(value) => setFilters((current) => ({ ...current, accepting: value }))} /></div><Button className="mt-4" variant="ghost" onClick={() => setFilters(initialFilters)}>Clear filters</Button></section>{visible.length ? <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{visible.map((mentor) => <Card key={mentor.id} className="flex flex-col"><CardHeader><div className="flex items-center gap-4">{mentor.profileImage ? <Image unoptimized src={mentor.profileImage} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">{mentor.displayName.slice(0, 1)}</div>}<div><CardTitle>{mentor.displayName}</CardTitle><Badge className="mt-2" variant={mentor.generalAvailability === "accepting" ? "default" : "secondary"}>{mentor.generalAvailabilityLabel}</Badge></div></div></CardHeader><CardContent className="flex flex-1 flex-col"><p className="line-clamp-4 text-sm text-muted-foreground">{mentor.biography}</p><div className="mt-4 flex flex-wrap gap-2">{mentor.disciplines.slice(0, 3).map((value) => <Badge key={value} variant="outline">{value}</Badge>)}</div><Button asChild className="mt-6"><Link href={`/mentors/${mentor.id}`}>View mentor profile</Link></Button></CardContent></Card>)}</div> : <Card><CardContent className="p-10 text-center text-muted-foreground">No approved mentors match these filters.</CardContent></Card>}</div>;
}
