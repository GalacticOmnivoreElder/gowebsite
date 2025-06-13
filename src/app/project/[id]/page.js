"use client";

import React, { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { marked } from "marked";
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
  DollarSign,
  Briefcase,
  Calendar,
  ArrowLeft,
  ExternalLink,
  Mail,
  User,
  Send,
  LogIn,
} from "lucide-react";
import UserLink from "@/components/ui/UserLink";

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
      if (!MobxStore.user || !projectId) return;

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
  }, [MobxStore.user, projectId, project]);

  const formatBudget = (budget) => {
    if (budget >= 1000000) {
      return `${(budget / 1000000).toFixed(1)}M MKD`;
    } else if (budget >= 1000) {
      return `${(budget / 1000).toFixed(0)}K MKD`;
    } else {
      return `${budget} MKD`;
    }
  };

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
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getProjectStatusColor = (status) => {
    switch (status) {
      case "live":
        return "bg-green-100 text-green-800 border-green-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const canEdit =
    project &&
    MobxStore.user &&
    (project.owner === MobxStore.user.uid ||
      project.admins?.includes(MobxStore.user.uid));

  const isProjectMember =
    project &&
    MobxStore.user &&
    (project.owner === MobxStore.user.uid ||
      project.admins?.includes(MobxStore.user.uid) ||
      project.teamMembers?.includes(MobxStore.user.uid));

  const handleEdit = () => {
    router.push(`/project/${projectId}/edit`);
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
            The project you're looking for doesn't exist or you don't have
            permission to view it.
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

          {canEdit && (
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
          )}
        </div>

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
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge
                  className={`${getProjectStatusColor(project.status)} border`}
                >
                  {project.status === "live" ? "Live" : "Draft"}
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
          {project.status === "live" && !isProjectMember && (
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
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-primary" />
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
                __html: marked(project.description || ""),
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
      </div>
    </div>
  );
});

export default ProjectDetailsPage;
