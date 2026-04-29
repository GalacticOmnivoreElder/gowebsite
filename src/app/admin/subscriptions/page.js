"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase";
import { format } from "date-fns";
import {
  getAdminCache,
  setAdminCache,
  clearAdminCache,
} from "@/lib/admin-data-cache";

const CACHE_KEY = "admin-subscriptions-v1";

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchSubscriptions = useCallback(async ({ skipCache = false } = {}) => {
    try {
      if (!skipCache) {
        const cached = getAdminCache(CACHE_KEY);
        if (cached) {
          setSubscriptions(cached);
          setLoading(false);
          return;
        }
      }

      setLoading(true);

      const [subscriptionsSnapshot, usersSnapshot] = await Promise.all([
        getDocs(collection(db, "subscriptions")),
        getDocs(collection(db, "users")),
      ]);

      const userById = new Map(
        usersSnapshot.docs.map((d) => [d.id, d.data()])
      );

      const subscriptionsData = [];

      for (const subDoc of subscriptionsSnapshot.docs) {
        const subData = subDoc.data();
        const u = subData.userId ? userById.get(subData.userId) : null;
        const userData = u
          ? {
              name: u.name || u.displayName || "N/A",
              email: u.email || "N/A",
            }
          : { name: "N/A", email: "N/A" };

        subscriptionsData.push({
          id: subDoc.id,
          userId: subData.userId,
          userName: userData.name,
          userEmail: userData.email,
          active: subData.active || false,
          startDate: subData.startDate
            ? new Date(subData.startDate.toDate())
            : null,
          endDate: subData.endDate ? new Date(subData.endDate.toDate()) : null,
          autoRenew: subData.autoRenew || false,
          createdAt: subData.createdAt
            ? new Date(subData.createdAt.toDate())
            : new Date(),
          duration: calculateDuration(subData),
        });
      }

      setAdminCache(CACHE_KEY, subscriptionsData);
      setSubscriptions(subscriptionsData);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const calculateDuration = (subscription) => {
    if (!subscription.startDate) return 0;

    const startDate = new Date(subscription.startDate.toDate());
    const endDate = subscription.endDate
      ? new Date(subscription.endDate.toDate())
      : new Date();

    return Math.max(
      0,
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        endDate.getMonth() -
        startDate.getMonth()
    );
  };

  const toggleSubscription = async (subscriptionId, currentStatus) => {
    try {
      setActionLoading(subscriptionId);

      await updateDoc(doc(db, "subscriptions", subscriptionId), {
        active: !currentStatus,
        updatedAt: serverTimestamp(),
        ...(currentStatus ? { endDate: serverTimestamp() } : { endDate: null }),
      });

      clearAdminCache("admin-");
      await fetchSubscriptions({ skipCache: true });
    } catch (error) {
      console.error("Error toggling subscription:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleAutoRenew = async (subscriptionId, currentStatus) => {
    try {
      setActionLoading(`renew-${subscriptionId}`);

      await updateDoc(doc(db, "subscriptions", subscriptionId), {
        autoRenew: !currentStatus,
        updatedAt: serverTimestamp(),
      });

      clearAdminCache("admin-");
      await fetchSubscriptions({ skipCache: true });
    } catch (error) {
      console.error("Error toggling auto-renew:", error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Subscriptions Management</h1>
        <Button
          onClick={() => {
            clearAdminCache(CACHE_KEY);
            fetchSubscriptions({ skipCache: true });
          }}
        >
          Refresh
        </Button>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableCaption>List of all subscriptions in the system</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Auto-Renew</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((subscription) => (
              <TableRow key={subscription.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{subscription.userName}</div>
                    <div className="text-sm text-muted-foreground">
                      {subscription.userEmail}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={subscription.active ? "success" : "secondary"}
                  >
                    {subscription.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {subscription.startDate
                    ? format(subscription.startDate, "MMM d, yyyy")
                    : "N/A"}
                </TableCell>
                <TableCell>
                  {subscription.endDate
                    ? format(subscription.endDate, "MMM d, yyyy")
                    : "N/A"}
                </TableCell>
                <TableCell>
                  {`${subscription.duration} month${
                    subscription.duration !== 1 ? "s" : ""
                  }`}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={subscription.autoRenew ? "default" : "outline"}
                  >
                    {subscription.autoRenew ? "Enabled" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant={subscription.active ? "destructive" : "success"}
                      size="sm"
                      onClick={() =>
                        toggleSubscription(subscription.id, subscription.active)
                      }
                      disabled={actionLoading === subscription.id}
                    >
                      {actionLoading === subscription.id ? (
                        <span className="animate-pulse">Processing...</span>
                      ) : subscription.active ? (
                        "Deactivate"
                      ) : (
                        "Activate"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleAutoRenew(subscription.id, subscription.autoRenew)
                      }
                      disabled={actionLoading === `renew-${subscription.id}`}
                    >
                      {actionLoading === `renew-${subscription.id}` ? (
                        <span className="animate-pulse">Processing...</span>
                      ) : subscription.autoRenew ? (
                        "Disable Auto-Renew"
                      ) : (
                        "Enable Auto-Renew"
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
