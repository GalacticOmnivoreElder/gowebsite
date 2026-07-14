"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "@/firebase";
import { Users, CreditCard, UserCheck, Calendar } from "lucide-react";
import { getAdminCache, setAdminCache } from "@/lib/admin-data-cache";

const CACHE_KEY = "admin-dashboard-stats";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeMembers: 0,
    totalSubscriptions: 0,
    revenueThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const cached = getAdminCache(CACHE_KEY);
    if (cached) {
      setStats(cached);
      setLoading(false);
      return;
    }
    fetchStats();
  }, [fetchStats]);

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
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="text-muted-foreground text-center py-8">
            Activity tracking will be implemented in a future update
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg shadow border border-border">
          <h2 className="text-xl font-semibold mb-4">Membership Growth</h2>
          <div className="text-muted-foreground text-center py-8">
            Charts and analytics will be implemented in a future update
          </div>
        </div>
      </div>
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
