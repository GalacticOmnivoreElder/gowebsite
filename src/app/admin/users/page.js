"use client";

import { useCallback, useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth } from "@/firebase";
import { format } from "date-fns";
import { UserPlus } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [reasons, setReasons] = useState({});
  const [message, setMessage] = useState("");

  // Single server-side read. Membership comes from the Polar user-doc model,
  // so there are no per-user client Firestore queries (that was an N+1 request
  // storm on the Firestore Listen channel).
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateMembership = async (userId, update, action) => {
    const reason = reasons[userId]?.trim();
    if (!reason) {
      setMessage("Enter an administrative reason before changing account controls.");
      return;
    }
    try {
      setActionLoading(`${userId}:${action}`);
      setMessage("");
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, ...update, reason }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Failed to update account controls");
      setReasons((current) => ({ ...current, [userId]: "" }));
      setMessage("Account controls updated and audited.");
      await fetchUsers();
    } catch (error) {
      console.error("Error toggling membership:", error);
      setMessage(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleMembership = (userId, currentStatus, membershipTier) =>
    updateMembership(
      userId,
      {
        activeMember: !currentStatus,
        membershipTier: membershipTier || "member",
      },
      "status"
    );

  const updateMembershipTier = (userId, membershipTier) =>
    updateMembership(userId, { membershipTier }, "tier");

  const updateMentorStatus = (userId, mentorStatus) =>
    updateMembership(userId, { mentorStatus }, "mentor-status");

  const updateMentorVisibility = (userId, mentorPublicProfileEnabled) =>
    updateMembership(userId, { mentorPublicProfileEnabled }, "mentor-visibility");

  const formatJoined = (joined) => {
    if (!joined) return "N/A";
    const date = new Date(joined);
    return Number.isNaN(date.getTime()) ? "N/A" : format(date, "MMM d, yyyy");
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
      {message ? <p role="status" className="rounded-md border p-3 text-sm">{message}</p> : null}

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
              <TableHead>Membership Tier</TableHead>
              <TableHead>Mentor Status</TableHead>
              <TableHead>Mentor Visibility</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{formatJoined(user.joined)}</TableCell>
                <TableCell>
                  <Badge variant={user.isAdmin ? "default" : "secondary"}>
                    {user.isAdmin ? "Admin" : "User"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isMember ? "success" : "secondary"}>
                    {user.isMember
                      ? user.subscriptionStatus || "Active"
                      : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="min-w-52">
                  <Select
                    value={user.membershipTier || "unassigned"}
                    onValueChange={(membershipTier) =>
                      updateMembershipTier(user.id, membershipTier)
                    }
                    disabled={actionLoading?.startsWith(`${user.id}:`) || !reasons[user.id]?.trim()}
                  >
                    <SelectTrigger className="h-9 w-48">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned" disabled>
                        Unassigned
                      </SelectItem>
                      <SelectItem value="member">Community Member</SelectItem>
                      <SelectItem value="company">Business Creator</SelectItem>
                    </SelectContent>
                  </Select>
                  {user.isMember && !user.membershipTier && (
                    <p className="mt-1 text-xs text-destructive">
                      Tier missing; Community permissions currently apply
                    </p>
                  )}
                </TableCell>
                <TableCell className="min-w-56">
                  <Select
                    value={user.mentorStatus || "none"}
                    onValueChange={(mentorStatus) => updateMentorStatus(user.id, mentorStatus)}
                    disabled={actionLoading?.startsWith(`${user.id}:`) || !reasons[user.id]?.trim()}
                  >
                    <SelectTrigger className="h-9 w-52"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not a mentor</SelectItem>
                      <SelectItem value="applicant">Mentor applicant</SelectItem>
                      <SelectItem value="approved">Approved mentor</SelectItem>
                      <SelectItem value="temporarily_unavailable">Temporarily unavailable</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="inactive">No longer active</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={user.mentorPublicProfileEnabled === true}
                      disabled={user.mentorStatus !== "approved" || actionLoading?.startsWith(`${user.id}:`) || !reasons[user.id]?.trim()}
                      onChange={(event) => updateMentorVisibility(user.id, event.target.checked)}
                    />
                    Public profile
                  </label>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex min-w-64 flex-col items-end gap-2">
                    <Input aria-label={`Administrative reason for ${user.name}`} placeholder="Reason required" value={reasons[user.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [user.id]: event.target.value }))} />
                    <Button
                      variant={user.isMember ? "destructive" : "success"}
                      size="sm"
                      onClick={() =>
                        toggleMembership(
                          user.id,
                          user.isMember,
                          user.membershipTier
                        )
                      }
                      disabled={actionLoading?.startsWith(`${user.id}:`) || !reasons[user.id]?.trim()}
                    >
                      {actionLoading === `${user.id}:status` ? (
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
