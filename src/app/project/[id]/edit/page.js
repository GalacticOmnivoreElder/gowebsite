"use client";

import React, { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useRouter, useParams } from "next/navigation";
import MobxStore from "@/mobx";
import { auth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  X,
  Users,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { z } from "zod";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

// Validation schema
const projectSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  categoryTags: z.array(z.string()).min(1, "At least one category is required"),
  type: z.enum([
    "Game Development",
    "Art & Design",
    "Programming",
    "Music & Audio",
    "Writing & Narrative",
    "Marketing",
    "Other",
  ]),
  visibility: z.enum(["Public", "Private", "Invite Only"]),
  goal: z.string().optional(),
  duration: z.string().optional(),
  budget: z.string().optional(),
  compensationType: z.enum([
    "Paid",
    "Revenue Share",
    "Portfolio/Experience",
    "Volunteer",
    "Equity",
    "Hybrid",
  ]),
  requiredRoles: z.array(z.string()),
});

const CATEGORY_OPTIONS = [
  "Action",
  "Adventure",
  "RPG",
  "Strategy",
  "Puzzle",
  "Platformer",
  "Shooter",
  "Racing",
  "Sports",
  "Simulation",
  "Horror",
  "Indie",
  "Mobile",
  "Web",
  "VR/AR",
  "Educational",
  "Art",
  "Music",
  "Programming",
];

const ROLE_OPTIONS = [
  "Game Designer",
  "Programmer",
  "C# Developer",
  "Unity Developer",
  "Unreal Developer",
  "2D Artist",
  "3D Artist",
  "UI/UX Designer",
  "Animator",
  "Sound Designer",
  "Composer",
  "Writer",
  "Narrative Designer",
  "Project Manager",
  "Producer",
  "QA Tester",
  "Marketing Specialist",
  "Other",
];

const EditProjectPage = observer(() => {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id;

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    categoryTags: [],
    type: "Game Development",
    visibility: "Public",
    goal: "",
    duration: "",
    budget: "",
    compensationType: "Volunteer",
    requiredRoles: [],
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);
  const [canEdit, setCanEdit] = useState(false);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);

  // Load project data
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return;

      try {
        setLoading(true);
        console.log("🔍 [EditProject] Starting to load project:", projectId);

        const projectData = await MobxStore.fetchProjectDetails(projectId);
        console.log("🔍 [EditProject] Received project data:", projectData);

        if (!projectData) {
          console.log("❌ [EditProject] No project data received");
          toast({
            title: "Error",
            description: "Project not found",
            variant: "destructive",
          });
          router.push("/projects");
          return;
        }

        setProject(projectData);
        console.log("✅ [EditProject] Project set:", projectData.title);

        // Check if user can edit this project
        const user = MobxStore.user;
        console.log("🔍 [EditProject] Current user:", user);
        console.log("🔍 [EditProject] User UID:", user?.uid);

        if (!user) {
          console.log("❌ [EditProject] No user found, redirecting to login");
          toast({
            title: "Authentication Required",
            description: "You must be logged in to edit projects",
            variant: "destructive",
          });
          router.push(`/login?redirect=/project/${projectId}/edit`);
          return;
        }

        console.log("🔍 [EditProject] Project owner:", projectData.owner);
        console.log(
          "🔍 [EditProject] Project owner type:",
          typeof projectData.owner
        );
        console.log(
          "🔍 [EditProject] Project owner UID:",
          projectData.owner?.uid
        );
        console.log("🔍 [EditProject] Project admins:", projectData.admins);
        console.log(
          "🔍 [EditProject] Project admins type:",
          typeof projectData.admins
        );

        // Check if owner is a string instead of object
        if (typeof projectData.owner === "string") {
          console.log(
            "🔍 [EditProject] Owner is string, comparing directly:",
            projectData.owner
          );
        }

        // Handle both string UID and object with UID for owner
        const ownerUid =
          typeof projectData.owner === "string"
            ? projectData.owner
            : projectData.owner?.uid;
        const isOwner = ownerUid === user.uid;

        // Handle admins array - could be strings or objects
        const isAdmin =
          projectData.admins?.some((admin) => {
            const adminUid = typeof admin === "string" ? admin : admin.uid;
            return adminUid === user.uid;
          }) || false;

        console.log("🔍 [EditProject] Is owner?", isOwner);
        console.log("🔍 [EditProject] Is admin?", isAdmin);
        console.log("🔍 [EditProject] Can edit?", isOwner || isAdmin);

        if (!isOwner && !isAdmin) {
          console.log("❌ [EditProject] Access denied - not owner or admin");
          console.log("❌ [EditProject] User UID:", user.uid);
          console.log("❌ [EditProject] Owner UID:", projectData.owner?.uid);
          console.log(
            "❌ [EditProject] Admin UIDs:",
            projectData.admins?.map((a) => a.uid)
          );

          toast({
            title: "Access Denied",
            description: "You don't have permission to edit this project",
            variant: "destructive",
          });
          router.push(`/project/${projectId}`);
          return;
        }

        console.log("✅ [EditProject] Access granted - user can edit");
        setCanEdit(true);

        // Populate form with existing data
        setFormData({
          title: projectData.title || "",
          description: projectData.description || "",
          categoryTags: projectData.categoryTags || [],
          type: projectData.type || "Game Development",
          visibility: projectData.visibility || "Public",
          goal: projectData.goal || "",
          duration: projectData.duration || "",
          budget: projectData.budget || "",
          compensationType: projectData.compensationType || "Volunteer",
          requiredRoles: projectData.requiredRoles || [],
        });
      } catch (error) {
        console.error("Error loading project:", error);
        toast({
          title: "Error",
          description: "Failed to load project",
          variant: "destructive",
        });
        router.push("/projects");
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, router]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const addTag = (field, value) => {
    if (value && !formData[field].includes(value)) {
      setFormData((prev) => ({
        ...prev,
        [field]: [...prev[field], value],
      }));
    }
  };

  const removeTag = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item !== value),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Validate form data
      const validatedData = projectSchema.parse(formData);

      // Check if user is authenticated
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }

      const token = await auth.currentUser.getIdToken();

      const requestBody = {
        ...validatedData,
        updatedAt: new Date().toISOString(),
      };

      // Update project
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ [EditProject] API error:", errorData);
        throw new Error(errorData.error || "Failed to update project");
      }

      const updatedProject = await response.json();

      // Update cache
      MobxStore.cachedProjects.set(projectId, updatedProject);
      MobxStore.projectDetails.set(projectId, updatedProject);

      toast({
        title: "Success",
        description: "Project updated successfully!",
      });

      router.push(`/project/${projectId}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors = {};
        error.errors.forEach((err) => {
          fieldErrors[err.path[0]] = err.message;
        });
        setErrors(fieldErrors);
        toast({
          title: "Validation Error",
          description: "Please fix the form errors",
          variant: "destructive",
        });
      } else {
        console.error("Error updating project:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to update project",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${await auth.currentUser.getIdToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete project");
      }

      // Remove from cache
      MobxStore.cachedProjects.delete(projectId);
      MobxStore.projectDetails.delete(projectId);

      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      router.push("/projects");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  // Fetch applications for this project
  const fetchApplications = async () => {
    if (!projectId || !canEdit) return;

    setApplicationsLoading(true);
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

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setApplicationsLoading(false);
    }
  };

  // Handle application status update
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

      // Update local state
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? updatedApplication : app))
      );

      // If approved, refresh project data to show new team member
      if (status === "approved") {
        // Clear cache and refetch project details
        MobxStore.cachedProjects.delete(projectId);
        MobxStore.projectDetails.delete(projectId);

        const refreshedProject = await MobxStore.fetchProjectDetails(projectId);
        if (refreshedProject) {
          setProject(refreshedProject);

          // Update form data with refreshed project
          setFormData({
            title: refreshedProject.title || "",
            description: refreshedProject.description || "",
            categoryTags: refreshedProject.categoryTags || [],
            type: refreshedProject.type || "Game Development",
            visibility: refreshedProject.visibility || "Public",
            goal: refreshedProject.goal || "",
            duration: refreshedProject.duration?.toString() || "",
            budget: refreshedProject.budget?.toString() || "",
            compensationType: refreshedProject.compensationType || "Volunteer",
            requiredRoles: refreshedProject.requiredRoles || [],
          });
        }
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

  // Fetch applications when component loads and user can edit
  useEffect(() => {
    if (canEdit && projectId) {
      fetchApplications();
    }
  }, [canEdit, projectId]);

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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to edit this project.
          </p>
          <Button asChild>
            <Link href={`/project/${projectId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href={`/project/${projectId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Project
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Edit Project</h1>
              <p className="text-muted-foreground">
                Update your project details
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter project title"
                  className={errors.title ? "border-red-500" : ""}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Describe your project in detail..."
                  rows={6}
                  className={errors.description ? "border-red-500" : ""}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Project Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleInputChange("type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Game Development",
                        "Art & Design",
                        "Programming",
                        "Music & Audio",
                        "Writing & Narrative",
                        "Marketing",
                        "Other",
                      ].map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Visibility *</Label>
                  <Select
                    value={formData.visibility}
                    onValueChange={(value) =>
                      handleInputChange("visibility", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Public">Public</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                      <SelectItem value="Invite Only">Invite Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Categories *</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select
                  onValueChange={(value) => addTag("categoryTags", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.filter(
                      (cat) => !formData.categoryTags.includes(cat)
                    ).map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex flex-wrap gap-2">
                  {formData.categoryTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeTag("categoryTags", tag)}
                      />
                    </Badge>
                  ))}
                </div>
                {errors.categoryTags && (
                  <p className="text-sm text-red-500">{errors.categoryTags}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="goal">Project Goal</Label>
                <Textarea
                  id="goal"
                  value={formData.goal}
                  onChange={(e) => handleInputChange("goal", e.target.value)}
                  placeholder="What do you hope to achieve with this project?"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={formData.duration}
                    onChange={(e) =>
                      handleInputChange("duration", e.target.value)
                    }
                    placeholder="e.g., 3 months, 1 year"
                  />
                </div>

                <div>
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    value={formData.budget}
                    onChange={(e) =>
                      handleInputChange("budget", e.target.value)
                    }
                    placeholder="e.g., $5000, No budget"
                  />
                </div>
              </div>

              <div>
                <Label>Compensation Type</Label>
                <Select
                  value={formData.compensationType}
                  onValueChange={(value) =>
                    handleInputChange("compensationType", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Revenue Share">Revenue Share</SelectItem>
                    <SelectItem value="Portfolio/Experience">
                      Portfolio/Experience
                    </SelectItem>
                    <SelectItem value="Volunteer">Volunteer</SelectItem>
                    <SelectItem value="Equity">Equity</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Required Roles */}
          <Card>
            <CardHeader>
              <CardTitle>Required Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select
                  onValueChange={(value) => addTag("requiredRoles", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add a required role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.filter(
                      (role) => !formData.requiredRoles.includes(role)
                    ).map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex flex-wrap gap-2">
                  {formData.requiredRoles.map((role) => (
                    <Badge
                      key={role}
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      {role}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeTag("requiredRoles", role)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project Applications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Project Applications
                {applications.length > 0 && (
                  <Badge variant="secondary">{applications.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-4 p-4 border rounded-lg"
                    >
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : applications.length > 0 ? (
                <div className="space-y-4">
                  {applications.map((application) => (
                    <div
                      key={application.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
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
                    When people apply to join your project, they'll appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

export default EditProjectPage;
