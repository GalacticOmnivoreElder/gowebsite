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
import { Input } from "@/components/ui/input";
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
  Archive,
  ArchiveRestore,
  Trash2,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { formatFirebaseDate } from "@/utils/date";

const AdminProjectsPage = observer(() => {
  const [projects, setProjects] = useState([]);
  const [sourceProjects, setSourceProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sourceProjectsLoading, setSourceProjectsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSourceProject, setSelectedSourceProject] = useState(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showPeopleDialog, setShowPeopleDialog] = useState(false);
  const [showSourceProjectDialog, setShowSourceProjectDialog] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [selectedAdminIds, setSelectedAdminIds] = useState([]);
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState([]);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [sourceProjectName, setSourceProjectName] = useState("");
  const [sourceProjectOwnerId, setSourceProjectOwnerId] = useState("");
  const [sourceProjectAdminIds, setSourceProjectAdminIds] = useState([]);
  const [sourceProjectSearch, setSourceProjectSearch] = useState("");
  const [sourcePeopleSearch, setSourcePeopleSearch] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updatingPeople, setUpdatingPeople] = useState(false);
  const [updatingSourceProject, setUpdatingSourceProject] = useState(false);
  const [deleteProject, setDeleteProject] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteSourceProject, setDeleteSourceProject] = useState(null);
  const [sourceProjectDeleteConfirmation, setSourceProjectDeleteConfirmation] =
    useState("");
  const [deletingSourceProject, setDeletingSourceProject] = useState(false);

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

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users for project role management",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchSourceProjects = async () => {
    try {
      setSourceProjectsLoading(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/sourceProjects", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch source projects");
      }

      const data = await response.json();
      setSourceProjects(data.sourceProjects || []);
    } catch (error) {
      console.error("Error fetching source projects:", error);
      toast({
        title: "Error",
        description: "Failed to load source projects",
        variant: "destructive",
      });
    } finally {
      setSourceProjectsLoading(false);
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

  const updateProjectPeople = async () => {
    if (!selectedProject || !selectedOwnerId) return;

    try {
      setUpdatingPeople(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          owner: selectedOwnerId,
          admins: selectedAdminIds,
          teamMembers: selectedTeamMemberIds,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Failed to update project roles");
      }

      toast({
        title: "Project roles updated",
        description: "The product owner and project admins were updated.",
      });
      await fetchProjects();
      setShowPeopleDialog(false);
      setSelectedProject(null);
      setSelectedOwnerId("");
      setSelectedAdminIds([]);
      setSelectedTeamMemberIds([]);
      setPeopleSearch("");
    } catch (error) {
      console.error("Error updating project roles:", error);
      toast({
        title: "Role update failed",
        description: error.message || "Failed to update project roles",
        variant: "destructive",
      });
    } finally {
      setUpdatingPeople(false);
    }
  };

  const updateSourceProject = async () => {
    if (!selectedSourceProject || !sourceProjectOwnerId) return;

    try {
      setUpdatingSourceProject(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(
        `/api/sourceProjects/${selectedSourceProject.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: sourceProjectName.trim(),
            sourceOwner: sourceProjectOwnerId,
            admins: sourceProjectAdminIds,
          }),
        }
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Failed to update source project");
      }

      toast({
        title: "Source project updated",
        description: "The source project owner and admins were updated.",
      });
      await fetchSourceProjects();
      setShowSourceProjectDialog(false);
      setSelectedSourceProject(null);
      setSourceProjectSearch("");
      setSourcePeopleSearch("");
    } catch (error) {
      console.error("Error updating source project:", error);
      toast({
        title: "Source project update failed",
        description: error.message || "Failed to update source project",
        variant: "destructive",
      });
    } finally {
      setUpdatingSourceProject(false);
    }
  };

  const permanentlyDeleteSourceProject = async () => {
    if (
      !deleteSourceProject ||
      sourceProjectDeleteConfirmation.trim() !== deleteSourceProject.name
    ) {
      return;
    }

    try {
      setDeletingSourceProject(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/sourceProjects", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceProjectId: deleteSourceProject.id,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete source project");
      }

      const unlinkedCount = result.unlinkedProjectCount || 0;
      toast({
        title: "Source project deleted",
        description:
          unlinkedCount === 1
            ? "The source project was deleted and its linked project was kept without a group."
            : `The source project was deleted and ${unlinkedCount} linked projects were kept without a group.`,
      });
      setDeleteSourceProject(null);
      setSourceProjectDeleteConfirmation("");
      await Promise.all([fetchSourceProjects(), fetchProjects()]);
    } catch (error) {
      console.error("Error permanently deleting source project:", error);
      toast({
        title: "Source project deletion failed",
        description:
          error.message ||
          "The source project was not deleted. Please refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingSourceProject(false);
    }
  };

  // Archive (soft delete) or restore a project. Hidden from the whole app while
  // archived, but fully restorable.
  const setArchived = async (project, archived) => {
    if (
      archived &&
      !confirm(
        `Archive "${project.title}"? It will be hidden from the app but can be restored anytime.`
      )
    ) {
      return;
    }

    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/projects", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId: project.id, archived }),
      });

      if (!response.ok) throw new Error("Failed to update project");

      toast({
        title: archived ? "Project archived" : "Project restored",
        description: archived
          ? `"${project.title}" is now hidden from the app.`
          : `"${project.title}" is visible again.`,
      });

      fetchProjects();
    } catch (error) {
      console.error("Error archiving project:", error);
      toast({
        title: "Error",
        description: `Failed to ${archived ? "archive" : "restore"} project`,
        variant: "destructive",
      });
    }
  };

  const permanentlyDeleteProject = async () => {
    if (
      !deleteProject ||
      deleteConfirmation.trim() !== deleteProject.title
    ) {
      return;
    }

    try {
      setDeleting(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/projects/${deleteProject.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Failed to permanently delete project");
      }

      toast({
        title: "Project permanently deleted",
        description:
          "The project, project memberships, and applications were removed.",
      });
      setDeleteProject(null);
      setDeleteConfirmation("");
      await fetchProjects();
    } catch (error) {
      console.error("Error permanently deleting project:", error);
      toast({
        title: "Permanent deletion failed",
        description:
          error.message ||
          "The project was not deleted. Please refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Load projects when filter changes
  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchSourceProjects();
  }, []);

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

  const handleManagePeople = (project) => {
    setSelectedProject(project);
    setSelectedOwnerId(project.owner || "");
    setSelectedAdminIds(
      (project.admins || []).filter((uid) => uid !== project.owner)
    );
    setSelectedTeamMemberIds(
      (project.teamMembers || []).filter((uid) => uid !== project.owner)
    );
    setPeopleSearch("");
    setShowPeopleDialog(true);
  };

  const handleManageSourceProject = (sourceProject) => {
    setSelectedSourceProject(sourceProject);
    setSourceProjectName(sourceProject.name || "");
    setSourceProjectOwnerId(sourceProject.sourceOwner || "");
    setSourceProjectAdminIds(
      (sourceProject.admins || []).filter(
        (userId) => userId !== sourceProject.sourceOwner
      )
    );
    setSourcePeopleSearch("");
    setShowSourceProjectDialog(true);
  };

  const toggleProjectAdmin = (userId) => {
    setSelectedAdminIds((currentIds) =>
      currentIds.includes(userId)
        ? currentIds.filter((id) => id !== userId)
        : [...currentIds, userId]
    );
  };

  const toggleTeamMember = (userId) => {
    setSelectedTeamMemberIds((currentIds) =>
      currentIds.includes(userId)
        ? currentIds.filter((id) => id !== userId)
        : [...currentIds, userId]
    );
  };

  const normalizedPeopleSearch = peopleSearch.trim().toLowerCase();
  const filteredPeople = users.filter((user) => {
    if (!normalizedPeopleSearch || user.id === selectedOwnerId) return true;
    return [user.name, user.email, user.id]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedPeopleSearch));
  });

  const normalizedSourceProjectSearch = sourceProjectSearch.trim().toLowerCase();
  const getUserById = (userId) => users.find((user) => user.id === userId);
  const filteredSourceProjects = sourceProjects.filter((sourceProject) =>
    [
      sourceProject.name,
      sourceProject.id,
      sourceProject.sourceOwner,
      getUserById(sourceProject.sourceOwner)?.name,
      getUserById(sourceProject.sourceOwner)?.email,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(normalizedSourceProjectSearch)
      )
  );

  const normalizedSourcePeopleSearch = sourcePeopleSearch.trim().toLowerCase();
  const filteredSourcePeople = users.filter((user) => {
    if (!normalizedSourcePeopleSearch || user.id === sourceProjectOwnerId) {
      return true;
    }
    return [user.name, user.email, user.id]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSourcePeopleSearch));
  });

  const getSourceProjectForProject = (project) =>
    sourceProjects.find((sourceProject) => sourceProject.id === project.sourceProject);

  const toggleSourceProjectAdmin = (userId) => {
    setSourceProjectAdminIds((currentIds) =>
      currentIds.includes(userId)
        ? currentIds.filter((id) => id !== userId)
        : [...currentIds, userId]
    );
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
                  <SelectItem value="archived">Archived</SelectItem>
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
            <div className="overflow-x-auto rounded-md border">
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
                  {projects.map((project) => {
                    const sourceProject = getSourceProjectForProject(project);

                    return (
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

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManagePeople(project)}
                          >
                            <UserCog className="h-3 w-3 mr-1" />
                            People
                          </Button>

                          {sourceProject && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleManageSourceProject(sourceProject)
                              }
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Source project
                            </Button>
                          )}

                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/project/${project.id}/edit?admin=true`}
                              target="_blank"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Link>
                          </Button>

                          {project.archived ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setArchived(project, false)}
                            >
                              <ArchiveRestore className="h-3 w-3 mr-1" />
                              Restore
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setArchived(project, true)}
                            >
                              <Archive className="h-3 w-3 mr-1" />
                              Archive
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteProject(project);
                              setDeleteConfirmation("");
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Source Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Source projects ({filteredSourceProjects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 max-w-md">
            <Input
              type="search"
              value={sourceProjectSearch}
              onChange={(event) => setSourceProjectSearch(event.target.value)}
              placeholder="Search source projects"
              aria-label="Search source projects"
            />
          </div>

          {sourceProjectsLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-[280px] bg-muted" />
                  <Skeleton className="h-4 w-[180px] bg-muted" />
                  <Skeleton className="h-8 w-[90px] bg-muted" />
                </div>
              ))}
            </div>
          ) : filteredSourceProjects.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No source projects match the search.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source project</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Linked projects</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSourceProjects.map((sourceProject) => {
                    const owner = getUserById(sourceProject.sourceOwner);
                    return (
                      <TableRow key={sourceProject.id}>
                        <TableCell>
                          <Link
                            href={`/sourceProject/${sourceProject.id}`}
                            target="_blank"
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {sourceProject.name || "Untitled source project"}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {sourceProject.id}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">
                              {owner?.name || "Unknown user"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {owner?.email || sourceProject.sourceOwner || "N/A"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {sourceProject.projectIds?.length || 0}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatFirebaseDate(sourceProject.updatedAt, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleManageSourceProject(sourceProject)
                              }
                            >
                              <Edit className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeleteSourceProject(sourceProject);
                                setSourceProjectDeleteConfirmation("");
                              }}
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Source project owner/admin dialog */}
      <Dialog
        open={showSourceProjectDialog}
        onOpenChange={(open) => {
          if (!open && !updatingSourceProject) {
            setShowSourceProjectDialog(false);
            setSelectedSourceProject(null);
            setSourceProjectName("");
            setSourceProjectOwnerId("");
            setSourceProjectAdminIds([]);
            setSourcePeopleSearch("");
          }
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage source project</DialogTitle>
            <DialogDescription>
              Update the source project name, owner, and private admins for
              &quot;{selectedSourceProject?.name}&quot;. Admins are never shown
              on the public source-project page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="source-project-name">Source project name</Label>
              <Input
                id="source-project-name"
                value={sourceProjectName}
                onChange={(event) => setSourceProjectName(event.target.value)}
                disabled={updatingSourceProject}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-project-owner">Source project owner</Label>
              <Select
                value={sourceProjectOwnerId}
                onValueChange={(value) => {
                  setSourceProjectOwnerId(value);
                  setSourceProjectAdminIds((currentIds) =>
                    currentIds.filter((id) => id !== value)
                  );
                }}
                disabled={usersLoading || updatingSourceProject}
              >
                <SelectTrigger id="source-project-owner">
                  <SelectValue placeholder="Select a source project owner" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div>
                <Label>Additional source project admins</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  These users can manage the source project, but remain hidden
                  from the public frontend.
                </p>
              </div>
              <Input
                type="search"
                value={sourcePeopleSearch}
                onChange={(event) => setSourcePeopleSearch(event.target.value)}
                placeholder="Search by name, email, or user ID"
                disabled={usersLoading || updatingSourceProject}
                aria-label="Search source project admins"
              />
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
                {usersLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Loading users…
                  </p>
                ) : filteredSourcePeople.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No users match this search.
                  </p>
                ) : (
                  filteredSourcePeople.map((user) => {
                    const isOwner = user.id === sourceProjectOwnerId;
                    return (
                      <label
                        key={user.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-primary"
                          checked={
                            isOwner || sourceProjectAdminIds.includes(user.id)
                          }
                          disabled={isOwner || updatingSourceProject}
                          onChange={() => toggleSourceProjectAdmin(user.id)}
                          aria-label={`Make ${user.name} a source project admin`}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {user.name}
                            {isOwner ? " (Source project owner)" : ""}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSourceProjectDialog(false)}
              disabled={updatingSourceProject}
            >
              Cancel
            </Button>
            <Button
              onClick={updateSourceProject}
              disabled={
                updatingSourceProject ||
                usersLoading ||
                !sourceProjectOwnerId ||
                sourceProjectName.trim().length < 3
              }
            >
              {updatingSourceProject ? "Saving…" : "Save source project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteSourceProject)}
        onOpenChange={(open) => {
          if (!open && !deletingSourceProject) {
            setDeleteSourceProject(null);
            setSourceProjectDeleteConfirmation("");
          }
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permanently delete source project?</DialogTitle>
            <DialogDescription>
              This cannot be undone. It removes the source project group but
              keeps its linked projects and leaves them without a group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-source-project-confirmation">
              Type <strong>{deleteSourceProject?.name}</strong> to confirm
            </Label>
            <Input
              id="delete-source-project-confirmation"
              autoComplete="off"
              value={sourceProjectDeleteConfirmation}
              onChange={(event) =>
                setSourceProjectDeleteConfirmation(event.target.value)
              }
              aria-describedby="delete-source-project-warning"
            />
            <p
              id="delete-source-project-warning"
              className="text-sm text-destructive"
            >
              Linked project records will not be deleted.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteSourceProject(null);
                setSourceProjectDeleteConfirmation("");
              }}
              disabled={deletingSourceProject}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={permanentlyDeleteSourceProject}
              disabled={
                deletingSourceProject ||
                sourceProjectDeleteConfirmation.trim() !==
                  deleteSourceProject?.name
              }
            >
              {deletingSourceProject ? "Deleting…" : "Permanently delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product owner and project-admin dialog */}
      <Dialog
        open={showPeopleDialog}
        onOpenChange={(open) => {
          if (!open && !updatingPeople) {
            setShowPeopleDialog(false);
            setSelectedProject(null);
            setSelectedOwnerId("");
            setSelectedAdminIds([]);
            setSelectedTeamMemberIds([]);
            setPeopleSearch("");
          }
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage project people</DialogTitle>
            <DialogDescription>
              Assign the product owner, project admins, and team members for
              &quot;{selectedProject?.title}&quot;. Owner and admin roles are
              private and are not shown on the public project page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="people-search">Search users</Label>
              <Input
                id="people-search"
                type="search"
                value={peopleSearch}
                onChange={(event) => setPeopleSearch(event.target.value)}
                placeholder="Search by name, email, or user ID"
                disabled={usersLoading || updatingPeople}
              />
              {!usersLoading && (
                <p className="text-xs text-muted-foreground">
                  Showing {filteredPeople.length} of {users.length} users
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-owner">Product owner</Label>
              <Select
                value={selectedOwnerId}
                onValueChange={(value) => {
                  setSelectedOwnerId(value);
                  setSelectedAdminIds((currentIds) =>
                    currentIds.filter((id) => id !== value)
                  );
                  setSelectedTeamMemberIds((currentIds) =>
                    currentIds.filter((id) => id !== value)
                  );
                }}
                disabled={usersLoading || updatingPeople}
              >
                <SelectTrigger id="project-owner">
                  <SelectValue placeholder="Select a product owner" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPeople.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div>
                <Label>Additional project admins</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  The selected product owner already has project-management
                  access. Select any other admins who should manage this
                  project.
                </p>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
                {usersLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Loading users…
                  </p>
                ) : users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No users available.
                  </p>
                ) : filteredPeople.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No users match this search.
                  </p>
                ) : (
                  filteredPeople.map((user) => {
                    const isOwner = user.id === selectedOwnerId;
                    return (
                      <label
                        key={user.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-primary"
                          checked={
                            isOwner || selectedAdminIds.includes(user.id)
                          }
                          disabled={isOwner || updatingPeople}
                          onChange={() => toggleProjectAdmin(user.id)}
                          aria-label={`Make ${user.name} a project admin`}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {user.name}
                            {isOwner ? " (Product owner)" : ""}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <Label>Team members</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Select the people who should appear as team members on the
                  project. The product owner is included automatically.
                </p>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
                {usersLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Loading users…
                  </p>
                ) : users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No users available.
                  </p>
                ) : filteredPeople.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No users match this search.
                  </p>
                ) : (
                  filteredPeople.map((user) => {
                    const isOwner = user.id === selectedOwnerId;
                    return (
                      <label
                        key={user.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-primary"
                          checked={
                            isOwner || selectedTeamMemberIds.includes(user.id)
                          }
                          disabled={isOwner || updatingPeople}
                          onChange={() => toggleTeamMember(user.id)}
                          aria-label={`Make ${user.name} a team member`}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">
                            {user.name}
                            {isOwner ? " (Product owner)" : ""}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPeopleDialog(false)}
              disabled={updatingPeople}
            >
              Cancel
            </Button>
            <Button
              onClick={updateProjectPeople}
              disabled={updatingPeople || usersLoading || !selectedOwnerId}
            >
              {updatingPeople ? "Saving…" : "Save people"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Project Status</DialogTitle>
            <DialogDescription>
              Change the status of &quot;{selectedProject?.title}&quot;
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

      <Dialog
        open={Boolean(deleteProject)}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteProject(null);
            setDeleteConfirmation("");
          }
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permanently delete project?</DialogTitle>
            <DialogDescription>
              This cannot be undone. It removes the project, its applications,
              and project references from member profiles. Archive the project
              instead if it may be needed later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-project-confirmation">
              Type <strong>{deleteProject?.title}</strong> to confirm
            </Label>
            <Input
              id="delete-project-confirmation"
              autoComplete="off"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              aria-describedby="delete-project-warning"
            />
            <p
              id="delete-project-warning"
              className="text-sm text-destructive"
            >
              Permanent deletion is reserved for records that must not be
              retained.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteProject(null);
                setDeleteConfirmation("");
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={permanentlyDeleteProject}
              disabled={
                deleting ||
                deleteConfirmation.trim() !== deleteProject?.title
              }
            >
              {deleting ? "Deleting…" : "Permanently delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default AdminProjectsPage;
