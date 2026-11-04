"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let active = true;
    let currentUser = null;
    const refresh = async () => {
      const user = currentUser;
      if (!user || document.visibilityState === "hidden") return;
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          if (active && currentUser === user) setUnread(data.unreadCount || 0);
        }
      } catch {
        // Keep the last known count until the next refresh.
      }
    };
    const unsubscribe = auth.onAuthStateChanged((user) => {
      currentUser = user;
      setUnread(0);
      if (user) refresh();
    });
    const interval = window.setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("notifications-updated", refresh);
    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("notifications-updated", refresh);
    };
  }, []);
  return <Button asChild variant="ghost" size="icon" className="relative" aria-label={unread ? `${unread} unread notifications` : "Notifications"}><Link href="/profile?tab=notifications"><Bell className="h-5 w-5" />{unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1 text-center text-[10px] font-bold text-primary-foreground">{Math.min(unread, 99)}{unread > 99 ? "+" : ""}</span>}</Link></Button>;
}
