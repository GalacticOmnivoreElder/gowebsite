"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/firebase";
import { MentorApplicationStatusCard } from "@/components/mentors/MentorApplicationStatusCard";
import { Card, CardContent } from "@/components/ui/card";

export function MentorApplicationOverview() {
  const [state, setState] = useState({ loading: true, application: null, error: "" });

  const load = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return setState({ loading: false, application: null, error: "" });
    const response = await fetch("/api/mentorship/pilot/mentor-application", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Mentor application status could not be loaded.");
    setState({ loading: false, application: result.application || null, error: "" });
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = auth.onAuthStateChanged(() => {
      load().catch((error) => {
        if (active) setState({ loading: false, application: null, error: error.message });
      });
    });
    return () => { active = false; unsubscribe?.(); };
  }, [load]);

  if (state.loading) return <Card><CardContent className="p-5 text-sm text-muted-foreground">Loading mentor application status…</CardContent></Card>;
  if (state.error) return <Card><CardContent className="p-5 text-sm text-muted-foreground">{state.error}</CardContent></Card>;
  return <MentorApplicationStatusCard application={state.application} />;
}
