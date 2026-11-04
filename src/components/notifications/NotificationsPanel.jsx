"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NotificationsPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    const response = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Notifications unavailable");
    setData(result);
    setError("");
  }, []);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState !== "hidden") load().catch((err) => setError(err.message)); };
    const unsubscribe = auth.onAuthStateChanged(refresh);
    const interval = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => { unsubscribe(); window.clearInterval(interval); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);
  const mark = async (notificationId, actionUrl) => {
    setBusy(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Please sign in to update notifications.");
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(notificationId ? { notificationId } : { all: true }) });
      if (!response.ok) throw new Error("Could not mark notifications as read. Please try again.");
      window.dispatchEvent(new Event("notifications-updated"));
      if (actionUrl) window.location.assign(actionUrl);
      else await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  if (!data && !error) return <Loader2 className="mx-auto h-8 w-8 animate-spin" />;
  return <Card><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notifications {data?.unreadCount ? `(${data.unreadCount} unread)` : ""}</CardTitle>{data?.unreadCount > 0 && <Button size="sm" variant="outline" disabled={busy} onClick={() => mark()}><CheckCheck className="mr-2 h-4 w-4" />Mark all read</Button>}</div></CardHeader><CardContent className="space-y-3">{error && <p role="alert" className="text-destructive">{error}</p>}{data?.notifications?.map((notification) => <button key={notification.id} disabled={busy} onClick={() => mark(notification.id, notification.actionUrl)} className={`w-full rounded-md border p-4 text-left transition-colors hover:bg-muted/30 ${notification.readAt ? "opacity-70" : "border-primary/40 bg-primary/5"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{notification.title}</p><p className="mt-1 text-sm text-muted-foreground">{notification.message}</p></div>{!notification.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}</div><p className="mt-2 text-xs text-muted-foreground">{notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ""}</p></button>)}{data?.notifications?.length === 0 && <p className="py-8 text-center text-muted-foreground">No notifications yet.</p>}</CardContent></Card>;
}
