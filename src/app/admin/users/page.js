"use client";

import { useState, useEffect } from "react";
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
  getDoc,
  setDoc,
  serverTimestamp,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
import { format } from "date-fns";
import { Pencil, Trash, UserPlus } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);

      const usersData = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();

        // Get subscription data if exists
        const subscriptionsRef = collection(db, "subscriptions");
        const q = query(subscriptionsRef, where("userId", "==", userDoc.id));
        const subscriptionSnapshot = await getDocs(q);

        let subscriptionData = null;
        if (!subscriptionSnapshot.empty) {
          subscriptionData = subscriptionSnapshot.docs[0].data();
        }

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
          subscriptionId: subscriptionData
            ? subscriptionSnapshot.docs[0].id
            : null,
          isAdmin: userData.admin === true,
        });
      }

      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (subscription) => {
    if (!subscription.startDate) return 0;

    const startDate = new Date(subscription.startDate.toDate());
    const now = new Date();

    // Calculate months between dates
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

      if (currentStatus) {
        // Deactivate membership
        if (subscriptionId) {
          await updateDoc(doc(db, "subscriptions", subscriptionId), {
            active: false,
            endDate: serverTimestamp(),
          });
        }
      } else {
        // Activate membership
        if (subscriptionId) {
          // Update existing subscription
          await updateDoc(doc(db, "subscriptions", subscriptionId), {
            active: true,
            startDate: serverTimestamp(),
            endDate: null,
          });
        } else {
          // Create new subscription
          const subscriptionRef = collection(db, "subscriptions");
          await setDoc(doc(subscriptionRef), {
            userId: userId,
            active: true,
            startDate: serverTimestamp(),
            endDate: null,
            autoRenew: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Refresh users list
      await fetchUsers();
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
        <div className="flex gap-2">
          <Button onClick={fetchUsers}>Refresh</Button>
          <Button variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
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
                  <div className="flex justify-end gap-2">
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
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4" />
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
