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

const emptyFilters = { name: "", email: "", joinedFrom: "", joinedTo: "", role: "all", status: "all", tier: "all", mentor: "all", visibility: "all" };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [reasons, setReasons] = useState({});
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const statuses = [...new Set(users.map((user) => user.isMember ? (user.subscriptionStatus || "Active") : "Inactive"))].sort();
  const filteredUsers = users.filter((user) => {
    const joined = user.joined ? new Date(user.joined) : null;
    const joinedDay = joined && !Number.isNaN(joined.getTime()) ? format(joined, "yyyy-MM-dd") : "";
    const status = user.isMember ? (user.subscriptionStatus || "Active") : "Inactive";
    return String(user.name || "").toLowerCase().includes(filters.name.trim().toLowerCase())
      && String(user.email || "").toLowerCase().includes(filters.email.trim().toLowerCase())
      && (!filters.joinedFrom || (joinedDay && joinedDay >= filters.joinedFrom))
      && (!filters.joinedTo || (joinedDay && joinedDay <= filters.joinedTo))
      && (filters.role === "all" || (user.isAdmin ? "admin" : "user") === filters.role)
      && (filters.status === "all" || status === filters.status)
      && (filters.tier === "all" || (user.membershipTier || "unassigned") === filters.tier)
      && (filters.mentor === "all" || (user.mentorStatus || "none") === filters.mentor)
      && (filters.visibility === "all" || (user.mentorPublicProfileEnabled === true ? "public" : "hidden") === filters.visibility);
  });

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

      <section aria-label="Filter users" className="space-y-4 rounded-md border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Filter users</h2>
          <Button variant="outline" size="sm" onClick={() => setFilters(emptyFilters)}>Clear filters</Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[{ key: "name", label: "Name", type: "text" }, { key: "email", label: "Email", type: "text" }, { key: "joinedFrom", label: "Joined from", type: "date" }, { key: "joinedTo", label: "Joined to", type: "date" }].map(({ key, label, type }) => (
            <label key={key} className="space-y-1 text-sm">
              <span>{label}</span>
              <Input type={type} value={filters[key]} onChange={(event) => setFilter(key, event.target.value)} />
            </label>
          ))}
          {[
            { key: "role", label: "Role", options: [["admin", "Admin"], ["user", "User"]] },
            { key: "status", label: "Membership status", options: statuses.map((status) => [status, status]) },
            { key: "tier", label: "Membership tier", options: [["unassigned", "Unassigned"], ["member", "Community Member"], ["mentor", "Mentor Member"], ["company", "Business Creator"]] },
            { key: "mentor", label: "Mentor status", options: [["none", "Not a mentor"], ["applicant", "Mentor applicant"], ["approved", "Verified after interview"], ["temporarily_unavailable", "Temporarily unavailable"], ["suspended", "Suspended"], ["inactive", "No longer active"], ["rejected", "Rejected"]] },
            { key: "visibility", label: "Mentor visibility", options: [["public", "Public profile"], ["hidden", "Not public"]] },
          ].map(({ key, label, options }) => (
            <div key={key} className="space-y-1 text-sm">
              <span id={`filter-${key}-label`}>{label}</span>
              <Select value={filters[key]} onValueChange={(value) => setFilter(key, value)}>
                <SelectTrigger aria-labelledby={`filter-${key}-label`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {options.map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground" role="status">Showing {filteredUsers.length} of {users.length} users</p>
      </section>

      <div className="rounded-md border border-border">
        <Table>
          <TableCaption>Users matching the selected filters</TableCaption>
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
            {filteredUsers.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No users match the selected filters.</TableCell></TableRow>
            ) : filteredUsers.map((user) => (
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
                      <SelectItem value="mentor">Mentor Member</SelectItem>
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
                      <SelectItem value="approved">Verified after interview</SelectItem>
                      <SelectItem value="temporarily_unavailable">Temporarily unavailable</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="inactive">No longer active</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">Verify mentors only after completing the GO interview. This approval is required before content production and mentorship connections.</p>
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
