"use client";

import { useState, useEffect } from "react";
import { observer } from "mobx-react";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  Calendar,
  User,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { formatFirebaseDate } from "@/utils/date";

const AdminProjectsPage = observer(() => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("draft");
  const [selectedProject, setSelectedProject] = useState(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  // Fetch projects
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();

      const response = await fetch(
        `/api/admin/projects?status=${statusFilter}&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const data = await response.json();
      setProjects(data.projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update project status
  const updateProjectStatus = async () => {
    try {
      setUpdating(true);
      const token = await auth.currentUser.getIdToken();

      const response = await fetch("/api/admin/projects", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: selectedProject.id,
          status: newStatus,
          adminNotes: adminNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update project");
      }

      toast({
        title: "Success",
        description: `Project status updated to ${newStatus}`,
      });

      // Refresh projects list
      fetchProjects();
      setShowStatusDialog(false);
      setSelectedProject(null);
      setNewStatus("");
      setAdminNotes("");
    } catch (error) {
      console.error("Error updating project:", error);
      toast({
        title: "Error",
        description: "Failed to update project status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Load projects when filter changes
  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
      case "hiring":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "live":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "completed":
        return "bg-muted text-muted-foreground border-border";
      case "rejected":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleApprove = (project) => {
    setSelectedProject(project);
    setNewStatus("hiring");
    setAdminNotes("");
    setShowStatusDialog(true);
  };

  const handleReject = (project) => {
    setSelectedProject(project);
    setNewStatus("rejected");
    setAdminNotes("");
    setShowStatusDialog(true);
  };

  const handleChangeStatus = (project) => {
    setSelectedProject(project);
    setNewStatus(project.status);
    setAdminNotes(project.adminNotes || "");
    setShowStatusDialog(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Project Management</h1>
        <p className="text-muted-foreground">
          Review and manage all projects on the platform
        </p>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter">Status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="hiring">Hiring</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All Projects</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={fetchProjects}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Projects ({projects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded bg-muted" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px] bg-muted" />
                    <Skeleton className="h-4 w-[200px] bg-muted" />
                  </div>
                  <Skeleton className="h-8 w-[100px] bg-muted" />
                  <Skeleton className="h-8 w-[80px] bg-muted" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No projects found for the selected filter.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {project.thumbnail && (
                            <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                              <img
                                src={project.thumbnail}
                                alt={project.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/project/${project.id}`}
                              target="_blank"
                              className="font-medium text-sm truncate hover:text-primary hover:underline cursor-pointer block"
                            >
                              {project.title}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate">
                              {project.type} • {project.visibility}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {project.ownerDetails ? (
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={project.ownerDetails.avatar} />
                              <AvatarFallback className="text-xs">
                                {project.ownerDetails.username
                                  ?.charAt(0)
                                  ?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {project.ownerDetails.username}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {project.ownerDetails.email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Unknown
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatFirebaseDate(project.createdAt, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getStatusColor(project.status)} border text-xs`}
                        >
                          {project.status.charAt(0).toUpperCase() +
                            project.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {project.status === "draft" && (
                            <Button
                              size="sm"
                              onClick={() => handleApprove(project)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChangeStatus(project)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Status
                          </Button>

                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/project/${project.id}/edit?admin=true`}
                              target="_blank"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Project Status</DialogTitle>
            <DialogDescription>
              Change the status of "{selectedProject?.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="new-status">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="hiring">Hiring</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this status change..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusDialog(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={updateProjectStatus}
              disabled={updating || !newStatus}
            >
              {updating ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default AdminProjectsPage;
