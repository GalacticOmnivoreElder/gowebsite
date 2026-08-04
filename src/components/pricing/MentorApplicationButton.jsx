"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/firebase";

export function MentorApplicationButton({ applicationsOpen }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apply = async () => {
    if (!applicationsOpen) return;
    const user = auth.currentUser;
    if (!user) {
      window.location.assign("/login?redirect=%2Fmembership%3Fapply%3Dmentor");
      return;
    }

    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    setLoading(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/mentor-application/open", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) throw new Error(result.error || "Mentor applications are unavailable.");
      if (popup) popup.location.replace(result.url);
      else window.location.assign(result.url);
    } catch (applicationError) {
      popup?.close();
      setError(applicationError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="w-full" disabled={!applicationsOpen || loading} onClick={apply}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
        {applicationsOpen ? "Apply to become a mentor" : "Applications closed"}
      </Button>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
