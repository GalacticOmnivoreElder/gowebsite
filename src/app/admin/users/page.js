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
  setDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/firebase";
import { format } from "date-fns";
import {
  getAdminCache,
  setAdminCache,
  clearAdminCache,
} from "@/lib/admin-data-cache";

const CACHE_KEY = "admin-users-v1";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchUsers = useCallback(async ({ skipCache = false } = {}) => {
    try {
      if (!skipCache) {
        const cached = getAdminCache(CACHE_KEY);
        if (cached) {
          setUsers(cached);
          setLoading(false);
          return;
        }
      }

      setLoading(true);

      const [usersSnapshot, subsSnapshot] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "subscriptions")),
      ]);

      const subsByUserId = new Map();
      for (const d of subsSnapshot.docs) {
        const data = d.data();
        const uid = data.userId;
        if (uid && !subsByUserId.has(uid)) {
          subsByUserId.set(uid, { id: d.id, data });
        }
      }

      const usersData = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const pair = subsByUserId.get(userDoc.id);
        const subscriptionData = pair ? pair.data : null;
        const subscriptionId = pair ? pair.id : null;

        usersData.push({
          id: userDoc.id,
          name: userData.name || userData.displayName || "N/A",
          email: userData.email || "N/A",
          joined: userData.createdAt
            ? new Date(userData.createdAt.toDate())
            : new Date(),
          isMember: subscriptionData ? subscriptionData.active : false,
          memberSince:
            subscriptionData && subscriptionData.startDate
              ? new Date(subscriptionData.startDate.toDate())
              : null,
          memberDuration: subscriptionData
            ? calculateDuration(subscriptionData)
            : 0,
          subscriptionId,
          isAdmin: userData.admin === true,
        });
      }

      setAdminCache(CACHE_KEY, usersData);
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const calculateDuration = (subscription) => {
    if (!subscription.startDate) return 0;

    const startDate = new Date(subscription.startDate.toDate());
    const now = new Date();

    return Math.max(
      0,
      (now.getFullYear() - startDate.getFullYear()) * 12 +
        now.getMonth() -
        startDate.getMonth()
    );
  };

  const toggleMembership = async (userId, currentStatus, subscriptionId) => {
    try {
      setActionLoading(userId);
      const currentMonthGameId = "toxic-sewers-april-2025"; // Hardcoded for now

      if (currentStatus) {
        if (subscriptionId) {
          await updateDoc(doc(db, "subscriptions", subscriptionId), {
            active: false,
            endDate: serverTimestamp(),
          });

          const userDocRef = doc(db, "users", userId);
          await updateDoc(userDocRef, {
            unlockedPackages: arrayRemove(currentMonthGameId),
          });
        }
      } else {
        if (subscriptionId) {
          await updateDoc(doc(db, "subscriptions", subscriptionId), {
            active: true,
            startDate: serverTimestamp(),
            endDate: null,
          });

          const userDocRef = doc(db, "users", userId);
          await updateDoc(userDocRef, {
            unlockedPackages: arrayUnion(currentMonthGameId),
          });
        } else {
          const subscriptionRef = collection(db, "subscriptions");
          const newSubscriptionId = doc(subscriptionRef).id;
          await setDoc(doc(db, "subscriptions", newSubscriptionId), {
            userId: userId,
            active: true,
            startDate: serverTimestamp(),
            endDate: null,
            autoRenew: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          const userDocRef = doc(db, "users", userId);
          await updateDoc(userDocRef, {
            unlockedPackages: arrayUnion(currentMonthGameId),
          });
        }
      }

      clearAdminCache("admin-");
      await fetchUsers({ skipCache: true });
    } catch (error) {
      console.error("Error toggling membership:", error);
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
        <h1 className="text-3xl font-bold">Users Management</h1>
        <Button
          onClick={() => {
            clearAdminCache(CACHE_KEY);
            fetchUsers({ skipCache: true });
          }}
        >
          Refresh
        </Button>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableCaption>List of all users in the system</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Membership Status</TableHead>
              <TableHead>Member Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{format(user.joined, "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <Badge variant={user.isAdmin ? "default" : "secondary"}>
                    {user.isAdmin ? "Admin" : "User"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isMember ? "success" : "secondary"}>
                    {user.isMember ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.isMember
                    ? `${user.memberDuration} month${
                        user.memberDuration !== 1 ? "s" : ""
                      }`
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Button
                      variant={user.isMember ? "destructive" : "success"}
                      size="sm"
                      onClick={() =>
                        toggleMembership(
                          user.id,
                          user.isMember,
                          user.subscriptionId
                        )
                      }
                      disabled={actionLoading === user.id}
                    >
                      {actionLoading === user.id ? (
                        <span className="animate-pulse">Processing...</span>
                      ) : user.isMember ? (
                        "Deactivate"
                      ) : (
                        "Activate"
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
