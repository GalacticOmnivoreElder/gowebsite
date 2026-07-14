"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db, auth } from "@/firebase";
import {
  Users,
  CreditCard,
  UserCheck,
  Calendar,
  FolderOpen,
  Activity,
} from "lucide-react";
import { getAdminCache, setAdminCache } from "@/lib/admin-data-cache";

const CACHE_KEY = "admin-dashboard-stats";

function relativeTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const ACTIVITY_ICON = {
  project: FolderOpen,
  user: Users,
  order: CreditCard,
  subscription: UserCheck,
};

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeMembers: 0,
    totalSubscriptions: 0,
    revenueThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    recentActivity: [],
    membershipGrowth: [],
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      const usersCollection = collection(db, "users");
      const usersSnapshot = await getCountFromServer(usersCollection);
      const totalUsers = usersSnapshot.data().count;

      // Membership now lives on the user doc (Polar model): users.activeMember.
      const activeMembersSnapshot = await getCountFromServer(
        query(usersCollection, where("activeMember", "==", true))
      );
      const activeMembers = activeMembersSnapshot.data().count;

      // Anyone who has ever had a Polar customer created (active or churned).
      let totalSubscriptions = activeMembers;
      try {
        const withBillingSnapshot = await getCountFromServer(
          query(usersCollection, where("polarCustomerId", "!=", null))
        );
        totalSubscriptions = withBillingSnapshot.data().count;
      } catch (e) {
        // "!=" needs the field present/indexed; fall back to active count.
        console.warn("Subscription count fallback:", e?.message);
      }

      const payload = {
        totalUsers,
        activeMembers,
        totalSubscriptions,
        revenueThisMonth: activeMembers * 9.99,
      };
      setAdminCache(CACHE_KEY, payload);
      setStats(payload);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/dashboard-analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load analytics");
      const data = await response.json();
      setAnalytics({
        recentActivity: data.recentActivity || [],
        membershipGrowth: data.membershipGrowth || [],
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = getAdminCache(CACHE_KEY);
    if (cached) {
      setStats(cached);
      setLoading(false);
    } else {
      fetchStats();
    }
    fetchAnalytics();
  }, [fetchStats, fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users className="h-8 w-8 text-blue-500" />}
          color="bg-blue-500/10 dark:bg-blue-500/20"
          iconColor="text-blue-500"
        />
        <StatCard
          title="Active Members"
          value={stats.activeMembers}
          icon={<UserCheck className="h-8 w-8 text-green-500" />}
          color="bg-green-500/10 dark:bg-green-500/20"
          iconColor="text-green-500"
        />
        <StatCard
          title="Total Subscriptions"
          value={stats.totalSubscriptions}
          icon={<CreditCard className="h-8 w-8 text-purple-500" />}
          color="bg-purple-500/10 dark:bg-purple-500/20"
          iconColor="text-purple-500"
        />
        <StatCard
          title="Revenue (Monthly)"
          value={`$${stats.revenueThisMonth.toFixed(2)}`}
          icon={<Calendar className="h-8 w-8 text-amber-500" />}
          color="bg-amber-500/10 dark:bg-amber-500/20"
          iconColor="text-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </h2>
          {analyticsLoading ? (
            <ActivitySkeleton />
          ) : (
            <RecentActivity items={analytics.recentActivity} />
          )}
        </div>

        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <h2 className="text-xl font-semibold mb-4">Membership Growth</h2>
          {analyticsLoading ? (
            <ActivitySkeleton />
          ) : (
            <MembershipGrowthChart data={analytics.membershipGrowth} />
          )}
        </div>
      </div>
    </div>
  );
}

function RecentActivity({ items }) {
  if (!items?.length) {
    return (
      <div className="text-muted-foreground text-center py-8">
        No recent activity yet.
      </div>
    );
  }
  return (
    <ul className="space-y-3 max-h-80 overflow-auto pr-1">
      {items.map((item) => {
        const Icon = ACTIVITY_ICON[item.type] || Activity;
        return (
          <li key={item.id} className="flex items-start gap-3">
            <span className="mt-0.5 p-2 rounded-full bg-muted text-muted-foreground shrink-0">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{item.title}</p>
              {item.subtitle && (
                <p className="text-xs text-muted-foreground truncate">
                  {item.subtitle}
                </p>
              )}
            </div>
            <time className="text-xs text-muted-foreground whitespace-nowrap">
              {relativeTime(item.timestamp)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}

function MembershipGrowthChart({ data }) {
  if (!data?.length) {
    return (
      <div className="text-muted-foreground text-center py-8">
        Not enough data yet.
      </div>
    );
  }
  const max = Math.max(1, ...data.flatMap((d) => [d.signups, d.members]));

  return (
    <div>
      <div className="flex items-end gap-3 h-48">
        {data.map((d) => (
          <div
            key={d.key}
            className="flex-1 flex flex-col items-center justify-end gap-2 h-full"
          >
            <div className="flex items-end justify-center gap-1 w-full h-full">
              <div
                title={`${d.signups} new signups`}
                className="w-3 rounded-t bg-blue-500 transition-all"
                style={{
                  height: `${(d.signups / max) * 100}%`,
                  minHeight: d.signups > 0 ? "3px" : "0",
                }}
              />
              <div
                title={`${d.members} new paying members`}
                className="w-3 rounded-t bg-green-500 transition-all"
                style={{
                  height: `${(d.members / max) * 100}%`,
                  minHeight: d.members > 0 ? "3px" : "0",
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-blue-500" /> New signups
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-green-500" /> New paying members
        </span>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 bg-muted rounded" />
            <div className="h-3 w-1/2 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ title, value, icon, color, iconColor }) {
  return (
    <div className="bg-card rounded-lg shadow p-6 border border-border">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color}`}>
          <div className={iconColor}>{icon}</div>
        </div>
        <div className="ml-4">
          <h3 className="text-muted-foreground text-sm">{title}</h3>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}
