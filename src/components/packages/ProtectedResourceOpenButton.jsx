"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/firebase";

export function ProtectedResourceOpenButton({ assetIndex, resourceId }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  const openResource = async () => {
    setOpening(true);
    setError("");
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in again to open this resource.");
      const token = await user.getIdToken();
      const response = await fetch(`/resources/${encodeURIComponent(resourceId)}/open`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assetIndex }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.openUrl) {
        throw new Error(result.error || "This resource is currently unavailable.");
      }
      if (popup) popup.location.replace(result.openUrl);
      else window.location.assign(result.openUrl);
    } catch (openError) {
      popup?.close();
      setError(openError.message);
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" className="w-full" disabled={opening} onClick={openResource}>
        {opening ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {opening ? "Opening..." : "Open resource"}
      </Button>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}
