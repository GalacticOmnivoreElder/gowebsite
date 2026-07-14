"use client";

import React, { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { marked } from "marked";
import DOMPurify from "dompurify";
import MobxStore from "@/mobx";
import { auth } from "@/firebase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import {
  Edit,
  Users,
  Eye,
  EyeOff,
  Clock,
  Coins,
  Briefcase,
  Calendar,
  ArrowLeft,
  ExternalLink,
  Mail,
  User,
  Send,
  LogIn,
  CheckCircle,
  XCircle,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import UserLink from "@/components/ui/UserLink";
import { formatBudget } from "@/utils/formatBudget";

const UserCard = ({ user, role }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <UserLink user={user} showUsername={false} avatarSize="default" />
          <div className="flex-1 min-w-0">
            <UserLink
              user={user}
              showAvatar={false}
              className="font-medium truncate block"
            />
            <p className="text-sm text-muted-foreground">{role}</p>
            {user.email && (
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const LinkedProjectCard = ({ project }) => (
  <Card className="hover:shadow-md transition-shadow">
    <Link href={`/project/${project.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          {project.thumbnail && (
            <div className="relative w-12 h-12 rounded overflow-hidden">
              <Image
                src={project.thumbnail}
                alt={project.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate group-hover:text-primary">
              {project.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {project.status}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {project.visibility}
              </Badge>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Link>
  </Card>
);

const ProjectDetailsPage = observer(() => {
  const router = useRouter();
  const params = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [applying, setApplying] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [userApplication, setUserApplication] = useState(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [showApplicationsDialog, setShowApplicationsDialog] = useState(false);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState(null);

  const projectId = params.id;

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError(null);

        const projectData = await MobxStore.fetchProjectDetails(projectId);

        if (projectData) {
          setProject(projectData);
        } else {
          setError("Project not found");
        }
      } catch (err) {
        setError("Failed to load project");
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  // Check if user has applied to this project
  useEffect(() => {
    const checkUserApplication = async () => {
      if (!MobxStore.user?.uid || !projectId) return;

      setApplicationLoading(true);
      try {
        const headers = {
          "Content-Type": "application/json",
        };

        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch("/api/applications", { headers });

        if (response.ok) {
          const data = await response.json();
          const application = data.applications.find(
            (app) => app.projectId === projectId && app.status !== "cancelled"
          );
          setUserApplication(application || null);
        }
      } catch (error) {
        console.error("Error checking user application:", error);
      } finally {
        setApplicationLoading(false);
      }
    };

    checkUserApplication();
  }, [MobxStore.user?.uid, projectId]);

  const formatDuration = (days) => {
    if (days >= 365) {
      return `${Math.round(days / 365)} year${days >= 730 ? "s" : ""}`;
    } else if (days >= 30) {
      return `${Math.round(days / 30)} month${days >= 60 ? "s" : ""}`;
    } else {
      return `${days} day${days !== 1 ? "s" : ""}`;
    }
  };

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case "Public":
        return <Eye className="h-4 w-4" />;
      case "Private":
        return <EyeOff className="h-4 w-4" />;
      case "Invite Only":
        return <Users className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "hiring":
        return "bg-green-100 text-green-800 border-green-200";
      case "live":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getProjectStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "hiring":
        return "bg-green-100 text-green-800 border-green-200";
      case "live":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const canEdit =
    project &&
    MobxStore.user &&
    (project.owner === MobxStore.user.uid ||
      project.admins?.includes(MobxStore.user.uid) ||
      MobxStore.isAdmin);

  const isProjectMember =
    project &&
    MobxStore.user &&
    (project.owner === MobxStore.user.uid ||
      project.admins?.includes(MobxStore.user.uid) ||
      project.teamMembers?.includes(MobxStore.user.uid));

  const handleEdit = () => {
    router.push(`/project/${projectId}/edit`);
  };

  // Owner / project admins (and platform admins) can archive or restore.
  const canArchive = canEdit || MobxStore.isAdmin;
  const [archiving, setArchiving] = useState(false);

  const handleArchiveToggle = async () => {
    if (!project) return;
    const nextArchived = !project.archived;

    if (
      nextArchived &&
      !confirm(
        `Archive "${project.title}"? It will be hidden from the app but you can restore it anytime.`
      )
    ) {
      return;
    }

    try {
      setArchiving(true);
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ archived: nextArchived }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update project");
      }

      // Reflect the change immediately and drop the stale cache entry.
      setProject((prev) => (prev ? { ...prev, archived: nextArchived } : prev));
      MobxStore.cachedProjects?.delete?.(projectId);

      toast({
        title: nextArchived ? "Project archived" : "Project restored",
        description: nextArchived
          ? "It's now hidden from the app. You can restore it from here anytime."
          : "It's visible again.",
      });
    } catch (error) {
      console.error("Error archiving project:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setArchiving(false);
    }
  };

  const handleApply = () => {
    if (!MobxStore.user) {
      router.push(`/login?redirect=/project/${projectId}`);
      return;
    }
    setShowApplyDialog(true);
  };

  const submitApplication = async () => {
    if (!consentGiven) {
      toast({
        title: "Consent Required",
        description:
          "Please confirm that you consent to sharing your profile information.",
        variant: "destructive",
      });
      return;
    }

    setApplying(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          projectTitle: project.title,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit application");
      }

      toast({
        title: "Application Submitted!",
        description:
          "Your application has been sent to the project owner and admins.",
      });

      setShowApplyDialog(false);
      setConsentGiven(false);

      // Refresh application status
      const data = await response.json();
      setUserApplication(data);
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    } finally {
      setApplying(false);
    }
  };

  const handleCancelApplication = async (applicationId) => {
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel application");
      }

      toast({
        title: "Application Cancelled",
        description: "Your application has been cancelled successfully.",
      });

      setUserApplication(null);
    } catch (error) {
      console.error("Error cancelling application:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel application",
        variant: "destructive",
      });
    }
  };

  const fetchApplications = async () => {
    if (!projectId || !canEdit) return;

    setApplicationsLoading(true);
    setApplicationsError(null);
    try {
      const headers = {
        "Content-Type": "application/json",
      };

      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/applications?projectId=${projectId}`, {
        headers,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to load project applications");
      }

      setApplications(data.applications || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      setApplications([]);
      setApplicationsError(
        error.message || "Failed to load project applications"
      );
    } finally {
      setApplicationsLoading(false);
    }
  };

  const handleApplicationStatusUpdate = async (applicationId, status) => {
    try {
      const headers = {
        "Content-Type": "application/json",
      };

      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update application");
      }

      const updatedApplication = await response.json();

      // Update local applications state
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? updatedApplication : app))
      );

      // If approving, update the local project state to add the new team member
      if (status === "approved") {
        const newTeamMember = {
          uid: updatedApplication.userId,
          username: updatedApplication.username,
          email: updatedApplication.userEmail,
          avatar: updatedApplication.avatar,
        };

        setProject((prevProject) => {
          if (!prevProject) return prevProject;

          // Check if user is already in team members to avoid duplicates
          const isAlreadyTeamMember = prevProject.teamMemberDetails?.some(
            (member) => member.uid === newTeamMember.uid
          );

          if (isAlreadyTeamMember) {
            return prevProject;
          }

          return {
            ...prevProject,
            teamMembers: [
              ...(prevProject.teamMembers || []),
              newTeamMember.uid,
            ],
            teamMemberDetails: [
              ...(prevProject.teamMemberDetails || []),
              newTeamMember,
            ],
          };
        });
      }

      const statusMessages = {
        approved:
          "Application approved successfully! The user has been added to the project team.",
        rejected: "Application rejected. The applicant has been notified.",
        pending: "Application status updated to pending.",
      };

      toast({
        title: "Success",
        description:
          statusMessages[status] || `Application ${status} successfully`,
      });
    } catch (error) {
      console.error("Error updating application:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update application",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            onClick={() => router.push("/projects")}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The project you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have permission to view it.
          </p>
          <Button onClick={() => router.push("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => router.push("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>

          <div className="flex gap-2 flex-col sm:flex-row">
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowApplicationsDialog(true);
                    fetchApplications();
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  View Applicants
                  {applications.filter((app) => app.status === "pending")
                    .length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {
                        applications.filter((app) => app.status === "pending")
                          .length
                      }
                    </Badge>
                  )}
                </Button>
                <Button onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </Button>
              </>
            )}
            {canArchive && (
              <Button
                variant="outline"
                onClick={handleArchiveToggle}
                disabled={archiving}
                className={
                  project.archived
                    ? ""
                    : "text-destructive hover:text-destructive"
                }
              >
                {project.archived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    {archiving ? "Restoring..." : "Restore"}
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    {archiving ? "Archiving..." : "Archive"}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {project.archived && (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            This project is <strong>archived</strong> and hidden from the app.
            Only you and platform admins can see it. Use{" "}
            <strong>Restore</strong> to make it visible again.
          </div>
        )}

        {/* Project Header */}
        <div className="mb-8">
          {project.thumbnail && (
            <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-6">
              <Image
                src={project.thumbnail}
                alt={project.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-4">{project.title}</h1>

              {/* Source Project Information */}
              {project.sourceProjectDetails && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Part of:{" "}
                    <Link
                      href={`/sourceProject/${project.sourceProjectDetails.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {project.sourceProjectDetails.name.length > 40
                        ? `${project.sourceProjectDetails.name.substring(0, 40)}...`
                        : project.sourceProjectDetails.name}
                    </Link>
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge
                  className={`${getProjectStatusColor(project.status)} border`}
                >
                  {project.status === "pending" && "Pending"}
                  {project.status === "hiring" && "Hiring"}
                  {project.status === "live" && "Live"}
                  {project.status === "completed" && "Completed"}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  {getVisibilityIcon(project.visibility)}
                  {project.visibility}
                </Badge>
                <Badge variant="outline">{project.type}</Badge>
              </div>
            </div>
          </div>

          {/* Apply CTA */}
          {project.status === "hiring" && !isProjectMember && (
            <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6">
                {applicationLoading ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                  </div>
                ) : userApplication ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Your Application Status
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`${getStatusColor(userApplication.status)} border`}
                        >
                          {userApplication.status.charAt(0).toUpperCase() +
                            userApplication.status.slice(1)}
                        </Badge>
                        <span className="text-muted-foreground">
                          Applied on{" "}
                          {new Date(
                            userApplication.createdAt
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1">
                        {userApplication.status === "pending" &&
                          "Your application is being reviewed by the project team."}
                        {userApplication.status === "approved" &&
                          "Congratulations! Your application has been approved."}
                        {userApplication.status === "rejected" &&
                          "Your application was not accepted this time."}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {userApplication.status === "pending" && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleCancelApplication(userApplication.id)
                          }
                        >
                          Cancel Application
                        </Button>
                      )}
                      <Button variant="outline" asChild>
                        <Link href="/profile?tab=applications">
                          View All Applications
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        Interested in joining this project?
                      </h3>
                      <p className="text-muted-foreground">
                        Apply to become a team member and contribute your skills
                        to this project.
                      </p>
                    </div>
                    <Button size="lg" onClick={handleApply} className="ml-4">
                      {MobxStore.user ? (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Apply to Project
                        </>
                      ) : (
                        <>
                          <LogIn className="h-4 w-4 mr-2" />
                          Login to Apply
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {project.status === "live" && !isProjectMember && (
            <Card className="mb-6 bg-muted/50 border-muted">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold mb-2">Project is Live</h3>
                <p className="text-muted-foreground">
                  This project is currently ongoing and hiring has closed.
                  Applications are no longer being accepted.
                </p>
              </CardContent>
            </Card>
          )}

          {project.status === "pending" && (
            <Card className="mb-6 bg-muted/50 border-muted">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold mb-2">Pending Approval</h3>
                <p className="text-muted-foreground">
                  This project is awaiting admin approval before going public.
                </p>
              </CardContent>
            </Card>
          )}

          {project.status === "completed" && (
            <Card className="mb-6 bg-muted/50 border-muted">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold mb-2">
                  Project Completed
                </h3>
                <p className="text-muted-foreground">
                  This project has been completed and is now archived.
                </p>
              </CardContent>
            </Card>
          )}

          {project.categoryTags && project.categoryTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {project.categoryTags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Coins className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="font-semibold">{formatBudget(project.budget)}</p>
              <p className="text-sm text-muted-foreground">Budget</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="font-semibold">
                {formatDuration(project.duration)}
              </p>
              <p className="text-sm text-muted-foreground">Duration</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Briefcase className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="font-semibold">{project.compensationType}</p>
              <p className="text-sm text-muted-foreground">Compensation</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="font-semibold">
                {project.teamMemberDetails?.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Team Members</p>
            </CardContent>
          </Card>
        </div>

        {/* Goal */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Project Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">{project.goal}</p>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(marked(project.description || "")),
              }}
            />
          </CardContent>
        </Card>

        {/* Required Roles */}
        {project.requiredRoles && project.requiredRoles.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Required Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {project.requiredRoles.map((role, index) => (
                  <Badge key={index} variant="outline" className="text-sm">
                    {role}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Project Owner */}
          {project.ownerDetails && (
            <Card>
              <CardHeader>
                <CardTitle>Project Owner</CardTitle>
              </CardHeader>
              <CardContent>
                <UserCard user={project.ownerDetails} role="Owner" />
              </CardContent>
            </Card>
          )}

          {/* Admins */}
          {project.adminDetails && project.adminDetails.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Project Admins</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.adminDetails.map((admin) => (
                  <UserCard key={admin.uid} user={admin} role="Admin" />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Team Members */}
        {project.teamMemberDetails && project.teamMemberDetails.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.teamMemberDetails.map((member) => (
                  <UserCard key={member.uid} user={member} role="Team Member" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Linked Projects */}
        {project.linkedProjects && project.linkedProjects.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Related Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.linkedProjects.map((linkedProject) => (
                  <LinkedProjectCard
                    key={linkedProject.id}
                    project={linkedProject}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Dates */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Created: {new Date(project.createdAt).toLocaleDateString()}
              </span>
              <span>
                Updated: {new Date(project.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Application Dialog */}
        <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apply to {project.title}</DialogTitle>
              <DialogDescription>
                You are applying to join this project with your profile. The
                project owner and admins will be notified when you apply.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">
                  What happens when you apply:
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    • Your profile will be visible to the project owner and
                    admins
                  </li>
                  <li>
                    • They will be able to see your skills and contact
                    information
                  </li>
                  <li>
                    • They may contact you via your primary email:{" "}
                    {MobxStore.user?.email}
                  </li>
                  <li>
                    • You can track your application status in your profile
                  </li>
                </ul>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="consent"
                  checked={consentGiven}
                  onCheckedChange={setConsentGiven}
                />
                <label
                  htmlFor="consent"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  I consent to sharing my profile information with the project
                  owner and admins, and I understand they may contact me
                  regarding this application.
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowApplyDialog(false);
                  setConsentGiven(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={submitApplication}
                disabled={!consentGiven || applying}
              >
                {applying ? "Submitting..." : "Submit Application"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Applications Dialog */}
        <Dialog
          open={showApplicationsDialog}
          onOpenChange={setShowApplicationsDialog}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Project Applications
                {applications.length > 0 && (
                  <Badge variant="secondary">{applications.length}</Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4">
              {applicationsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-4 p-4 border rounded-lg"
                    >
                      <Skeleton className="h-12 w-12 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4 bg-muted" />
                        <Skeleton className="h-3 w-1/2 bg-muted" />
                      </div>
                      <Skeleton className="h-8 w-20 bg-muted" />
                    </div>
                  ))}
                </div>
              ) : applicationsError ? (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between gap-4">
                    <span>{applicationsError}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={fetchApplications}
                    >
                      Try again
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : applications.length > 0 ? (
                <div className="space-y-4">
                  {applications.map((application) => (
                    <div
                      key={application.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={application.avatar}
                            alt={application.username}
                          />
                          <AvatarFallback>
                            {getInitials(application.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">
                            {application.username}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {application.userEmail}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              className={`${getStatusColor(application.status)} border text-xs`}
                            >
                              {application.status.charAt(0).toUpperCase() +
                                application.status.slice(1)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Applied{" "}
                              {new Date(
                                application.createdAt
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link
                            href={`/user/${application.userId}`}
                            target="_blank"
                          >
                            View Profile
                          </Link>
                        </Button>

                        {application.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                handleApplicationStatusUpdate(
                                  application.id,
                                  "approved"
                                )
                              }
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleApplicationStatusUpdate(
                                  application.id,
                                  "rejected"
                                )
                              }
                              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}

                        <Button variant="outline" size="sm" asChild>
                          <a href={`mailto:${application.userEmail}`}>
                            <Mail className="h-4 w-4 mr-1" />
                            Contact
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    No Applications Yet
                  </h3>
                  <p className="text-muted-foreground">
                    When people apply to join your project, they&apos;ll appear
                    here.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
});

export default ProjectDetailsPage;
