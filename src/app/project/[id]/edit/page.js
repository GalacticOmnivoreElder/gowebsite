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
import { ArrowLeft, Save, Plus, X } from "lucide-react";
import { z } from "zod";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeOptionalProjectNumber } from "@/lib/project-form-utils";

const optionalProjectNumber = (schema) =>
  z.preprocess(normalizeOptionalProjectNumber, schema.optional());

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
  status: z.enum([
    "draft",
    "pending",
    "hiring",
    "live",
    "completed",
    "rejected",
  ]),
  thumbnail: z.string().url().optional().or(z.literal("")),
  goal: z.string().optional(),
  duration: optionalProjectNumber(
    z
      .number()
      .min(1, "Duration must be at least 1 day")
      .max(3650, "Duration is too long")
  ),
  budget: optionalProjectNumber(
    z
      .number()
      .min(0, "Budget cannot be negative")
      .max(Number.MAX_SAFE_INTEGER, "Budget is too large")
  ),
  compensationType: z.enum([
    "Paid",
    "Revenue Share",
    "Portfolio/Experience",
    "Volunteer",
    "Equity",
    "Hybrid",
  ]),
  requiredRoles: z
    .array(z.string())
    .min(1, "At least one required role is needed"),
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
    status: "draft",
    thumbnail: "",
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

        // WAIT for auth state to load before checking permissions
        const waitForAuth = async () => {
          // Wait for MobxStore to be ready
          while (!MobxStore.isReady) {
            console.log(
              "⏳ [EditProject] Waiting for MobxStore to be ready..."
            );
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          // Also wait for permissions to load
          while (MobxStore.permissionsLoading) {
            console.log("⏳ [EditProject] Waiting for permissions to load...", {
              permissionsLoading: MobxStore.permissionsLoading,
              permissions: MobxStore.permissions,
              isAdmin: MobxStore.isAdmin,
            });
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          const user = MobxStore.user;
          console.log("🔍 [EditProject] Auth loaded, current user:", user);

          if (!user) {
            console.log(
              "❌ [EditProject] No user found after auth loaded, redirecting to login"
            );
            toast({
              title: "Authentication Required",
              description: "You must be logged in to edit projects",
              variant: "destructive",
            });
            router.push(`/login?redirect=/project/${projectId}/edit`);
            return;
          }

          // Check if user is master admin (has platform-wide admin permissions)
          console.log(
            "🔍 [EditProject] MobxStore.permissions:",
            MobxStore.permissions
          );
          console.log(
            "🔍 [EditProject] MobxStore.permissions?.permissions:",
            MobxStore.permissions?.permissions
          );
          console.log("🔍 [EditProject] Full MobxStore.user:", MobxStore.user);
          console.log(
            "🔍 [EditProject] MobxStore.isAdmin computed:",
            MobxStore.isAdmin
          );

          const isMasterAdmin = MobxStore.isAdmin;

          // Check if owner is a string instead of object
          const ownerUid =
            typeof projectData.owner === "string"
              ? projectData.owner
              : projectData.owner?.uid;

          const isOwner = ownerUid === user.uid;
          const isProjectAdmin =
            projectData.admins?.some((admin) => {
              const adminUid = typeof admin === "string" ? admin : admin.uid;
              return adminUid === user.uid;
            }) || false;

          console.log("🔍 [EditProject] Is owner?", isOwner);
          console.log("🔍 [EditProject] Is project admin?", isProjectAdmin);
          console.log("🔍 [EditProject] Is master admin?", isMasterAdmin);
          // Allow access if: owner, project admin, or master admin
          const canEdit = isOwner || isProjectAdmin || isMasterAdmin;
          console.log("🔍 [EditProject] Can edit?", canEdit);

          if (!canEdit) {
            console.log("❌ [EditProject] Access denied");
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
            status: projectData.status || "draft",
            thumbnail: projectData.thumbnail || "",
            goal: projectData.goal || "",
            duration: projectData.duration ?? "",
            budget: projectData.budget ?? "",
            compensationType: projectData.compensationType || "Volunteer",
            requiredRoles: projectData.requiredRoles || [],
          });
        };

        await waitForAuth();
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
        budget: validatedData.budget ?? null,
        updatedAt: new Date().toISOString(),
      };
      if (!MobxStore.isAdmin) {
        delete requestBody.status;
      }

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
            You don&apos;t have permission to edit this project.
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
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
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
                <Label htmlFor="thumbnail">Thumbnail URL</Label>
                <Input
                  id="thumbnail"
                  type="url"
                  value={formData.thumbnail}
                  onChange={(e) =>
                    handleInputChange("thumbnail", e.target.value)
                  }
                  placeholder="https://example.com/image.jpg"
                />
                {formData.thumbnail && (
                  <div className="mt-2">
                    <img
                      src={formData.thumbnail}
                      alt="Thumbnail preview"
                      className="w-32 h-20 object-cover rounded border"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
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

              <div>
                <Label>Project Status *</Label>
                {MobxStore.isAdmin ? (
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      handleInputChange("status", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "draft",
                        "pending",
                        "hiring",
                        "live",
                        "completed",
                        "rejected",
                      ].map((status) => (
                        <SelectItem key={status} value={status}>
                          <span className="capitalize">{status}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-2 rounded-md border border-border bg-muted/35 p-4">
                    <Badge variant="secondary" className="capitalize">
                      {formData.status}
                    </Badge>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Project status is managed by Galactic Omnivore
                      administrators. Editing project details cannot publish,
                      reject, or otherwise change this status.
                    </p>
                    <Button
                      asChild
                      type="button"
                      variant="link"
                      className="mt-1 h-auto p-0"
                    >
                      <a
                        href={`mailto:galacticomnivore@galacticomnivore.com?subject=${encodeURIComponent(
                          `Project status request: ${project?.title || projectId}`
                        )}`}
                      >
                        Contact support about this status
                      </a>
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {formData.status === "draft" &&
                    "Project is not publicly visible and awaiting admin approval."}
                  {formData.status === "pending" &&
                    "Project is waiting for admin approval before going public."}
                  {formData.status === "hiring" &&
                    "Project is visible and accepting applications."}
                  {formData.status === "live" &&
                    "Project is ongoing and no longer accepting applications."}
                  {formData.status === "completed" &&
                    "Project is finished and archived."}
                  {formData.status === "rejected" &&
                    "Project was rejected and is hidden from public discovery."}
                </p>
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
                    type="number"
                    min="1"
                    max="3650"
                    value={formData.duration}
                    onChange={(e) =>
                      handleInputChange("duration", e.target.value)
                    }
                    placeholder="e.g., 90"
                    className={errors.duration ? "border-red-500" : ""}
                  />
                  {errors.duration && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.duration}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    type="number"
                    min="0"
                    max={Number.MAX_SAFE_INTEGER}
                    value={formData.budget}
                    onChange={(e) =>
                      handleInputChange("budget", e.target.value)
                    }
                    placeholder="e.g., 50000"
                    className={errors.budget ? "border-red-500" : ""}
                  />
                  {errors.budget && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.budget}
                    </p>
                  )}
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
                {errors.requiredRoles && (
                  <p className="text-sm text-red-500">
                    {errors.requiredRoles}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

export default EditProjectPage;
