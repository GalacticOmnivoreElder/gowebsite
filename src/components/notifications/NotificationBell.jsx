"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return setUnread(0);
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (response.ok) setUnread((await response.json()).unreadCount || 0);
      } catch {
        setUnread(0);
      }
    });
    return unsubscribe;
  }, []);
  return <Button asChild variant="ghost" size="icon" className="relative" aria-label={unread ? `${unread} unread notifications` : "Notifications"}><Link href="/profile?tab=notifications"><Bell className="h-5 w-5" />{unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1 text-center text-[10px] font-bold text-primary-foreground">{Math.min(unread, 99)}</span>}</Link></Button>;
}
