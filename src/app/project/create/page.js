"use client";

import React, { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import MobxStore from "@/mobx";
import { auth } from "@/firebase";
import { toast } from "@/components/ui/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Plus,
  X,
  Upload,
  AlertCircle,
} from "lucide-react";

// Constants
const PROJECT_TYPES = [
  "Game Development",
  "Art & Design",
  "Programming",
  "Music & Audio",
  "Writing & Narrative",
  "Marketing",
  "Other",
];

const COMPENSATION_TYPES = [
  "Paid",
  "Revenue Share",
  "Portfolio/Experience",
  "Volunteer",
  "Equity",
  "Hybrid",
];

const REQUIRED_ROLES = [
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

const VISIBILITY_OPTIONS = ["Public", "Private", "Invite Only"];

// Validation Schema
const projectSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(100, "Title too long"),
    thumbnail: z
      .string()
      .url("Must be a valid URL")
      .optional()
      .or(z.literal("")),
    categoryTags: z
      .array(z.string())
      .min(1, "At least one category tag is required"),
    type: z.enum(PROJECT_TYPES, { required_error: "Project type is required" }),
    description: z
      .string()
      .min(10, "Description must be at least 10 characters"),
    visibility: z.enum(VISIBILITY_OPTIONS, {
      required_error: "Visibility is required",
    }),
    goal: z.string().min(10, "Goal must be at least 10 characters"),
    duration: z
      .number()
      .min(1, "Duration must be at least 1 day")
      .max(3650, "Duration too long"),
    budget: z.number().min(0, "Budget cannot be negative"),
    compensationType: z.enum(COMPENSATION_TYPES, {
      required_error: "Compensation type is required",
    }),
    requiredRoles: z
      .array(z.string())
      .min(1, "At least one required role is needed"),
    linkedProjects: z.array(z.string()).optional(),
    sourceProjectOption: z.enum(["new", "existing"], {
      required_error: "Source project option is required",
    }),
    sourceProjectName: z.string().optional(),
    existingSourceProjectId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.sourceProjectOption === "new") {
        return (
          data.sourceProjectName &&
          data.sourceProjectName.trim().length >= 3 &&
          data.sourceProjectName.trim().length <= 50
        );
      }
      if (data.sourceProjectOption === "existing") {
        return data.existingSourceProjectId;
      }
      return true;
    },
    {
      message: "Source project configuration is invalid",
      path: ["sourceProjectOption"],
    }
  );

const CreateProjectPage = observer(() => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [newCategoryTag, setNewCategoryTag] = useState("");
  const [sourceProjects, setSourceProjects] = useState([]);
  const [loadingSourceProjects, setLoadingSourceProjects] = useState(false);

  const totalSteps = 4;

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
    trigger,
    getValues,
  } = useForm({
    resolver: zodResolver(projectSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      thumbnail: "",
      categoryTags: [],
      type: "",
      description: "",
      visibility: "Public",
      goal: "",
      duration: 90,
      budget: 0,
      compensationType: "",
      requiredRoles: [],
      linkedProjects: [],
      sourceProjectOption: "new",
      sourceProjectName: "",
      existingSourceProjectId: "",
    },
  });

  const watchedValues = watch();

  useEffect(() => {
    if (!MobxStore.user) {
      router.push("/login?redirect=/project/create");
    }
  }, [MobxStore.user, router]);

  // Fetch user's source projects when they select "existing" option
  const fetchSourceProjects = async () => {
    if (!MobxStore.user) return;

    setLoadingSourceProjects(true);
    try {
      const headers = {
        "Content-Type": "application/json",
      };

      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/sourceProjects", { headers });
      if (response.ok) {
        const data = await response.json();
        setSourceProjects(data.sourceProjects);
      }
    } catch (error) {
      console.error("Error fetching source projects:", error);
    } finally {
      setLoadingSourceProjects(false);
    }
  };

  const handleNext = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const getFieldsForStep = (step) => {
    switch (step) {
      case 1:
        return [
          "title",
          "thumbnail",
          "categoryTags",
          "type",
          "sourceProjectOption",
          "sourceProjectName",
          "existingSourceProjectId",
        ];
      case 2:
        return ["description", "goal"];
      case 3:
        return ["visibility", "duration", "budget", "compensationType"];
      case 4:
        return ["requiredRoles"];
      default:
        return [];
    }
  };

  const handleAddCategoryTag = () => {
    if (
      newCategoryTag.trim() &&
      !watchedValues.categoryTags.includes(newCategoryTag.trim())
    ) {
      setValue("categoryTags", [
        ...watchedValues.categoryTags,
        newCategoryTag.trim(),
      ]);
      setNewCategoryTag("");
      trigger("categoryTags");
    }
  };

  const handleRemoveCategoryTag = (tagToRemove) => {
    setValue(
      "categoryTags",
      watchedValues.categoryTags.filter((tag) => tag !== tagToRemove)
    );
    trigger("categoryTags");
  };

  const handleRoleToggle = (role) => {
    const currentRoles = watchedValues.requiredRoles || [];
    if (currentRoles.includes(role)) {
      setValue(
        "requiredRoles",
        currentRoles.filter((r) => r !== role)
      );
    } else {
      setValue("requiredRoles", [...currentRoles, role]);
    }
    trigger("requiredRoles");
  };

  const onSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      setSubmitError("");

      // Check if user is authenticated
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }

      const token = await auth.currentUser.getIdToken();

      // Create project with default status "draft"
      const projectData = {
        ...formData,
        owner: MobxStore.user.uid,
        status: "draft", // Set default status to draft
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        admins: [],
        teamMembers: [],
        linkedProjects: [],
      };

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      const newProject = await response.json();

      toast({
        title: "Project Created!",
        description:
          "Your project has been submitted for review. It will appear publicly once approved by an admin.",
      });

      router.push(`/project/${newProject.id}`);
    } catch (error) {
      console.error("Error creating project:", error);
      setSubmitError(error.message || "Failed to create project");
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepProgress = () => (currentStep / totalSteps) * 100;

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Basic Information</h2>
        <p className="text-muted-foreground">
          Let's start with the basics of your project
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Project Title *</Label>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="title"
                placeholder="Enter your project title"
                className={errors.title ? "border-red-500" : ""}
              />
            )}
          />
          {errors.title && (
            <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="thumbnail">Thumbnail URL</Label>
          <Controller
            name="thumbnail"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="thumbnail"
                type="url"
                placeholder="https://example.com/image.jpg"
                className={errors.thumbnail ? "border-red-500" : ""}
              />
            )}
          />
          {errors.thumbnail && (
            <p className="text-sm text-red-500 mt-1">
              {errors.thumbnail.message}
            </p>
          )}
          {watchedValues.thumbnail && (
            <div className="mt-2">
              <img
                src={watchedValues.thumbnail}
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
          <Label>Category Tags *</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newCategoryTag}
              onChange={(e) => setNewCategoryTag(e.target.value)}
              placeholder="Add a category tag"
              onKeyPress={(e) =>
                e.key === "Enter" &&
                (e.preventDefault(), handleAddCategoryTag())
              }
            />
            <Button type="button" onClick={handleAddCategoryTag} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {watchedValues.categoryTags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveCategoryTag(tag)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          {errors.categoryTags && (
            <p className="text-sm text-red-500 mt-1">
              {errors.categoryTags.message}
            </p>
          )}
        </div>

        <div>
          <Label>Project Type *</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className={errors.type ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && (
            <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>
          )}
        </div>

        <div>
          <Label>Source Project *</Label>
          <Controller
            name="sourceProjectOption"
            control={control}
            render={({ field }) => (
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  if (value === "existing") {
                    fetchSourceProjects();
                  }
                }}
                value={field.value}
              >
                <SelectTrigger
                  className={errors.sourceProjectOption ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select source project option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    Basic - New Source Project
                  </SelectItem>
                  <SelectItem value="existing">
                    Choose Existing Source Project
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.sourceProjectOption && (
            <p className="text-sm text-red-500 mt-1">
              {errors.sourceProjectOption.message}
            </p>
          )}
        </div>

        {watchedValues.sourceProjectOption === "new" && (
          <div>
            <Label htmlFor="sourceProjectName">Source Project Name *</Label>
            <Controller
              name="sourceProjectName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="sourceProjectName"
                  placeholder="Enter source project name (3-50 characters)"
                  className={errors.sourceProjectName ? "border-red-500" : ""}
                />
              )}
            />
            {errors.sourceProjectName && (
              <p className="text-sm text-red-500 mt-1">
                {errors.sourceProjectName.message}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              This will create a new source project to group related projects
              together.
            </p>
          </div>
        )}

        {watchedValues.sourceProjectOption === "existing" && (
          <div>
            <Label>Existing Source Project *</Label>
            {loadingSourceProjects ? (
              <div className="flex items-center justify-center p-3 border rounded">
                <span className="text-sm text-muted-foreground">
                  Loading your source projects...
                </span>
              </div>
            ) : (
              <Controller
                name="existingSourceProjectId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger
                      className={
                        errors.existingSourceProjectId ? "border-red-500" : ""
                      }
                    >
                      <SelectValue placeholder="Select an existing source project" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceProjects.length > 0 ? (
                        sourceProjects.map((sourceProject) => (
                          <SelectItem
                            key={sourceProject.id}
                            value={sourceProject.id}
                          >
                            {sourceProject.name} (
                            {sourceProject.projectIds?.length || 0} projects)
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No source projects available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {errors.existingSourceProjectId && (
              <p className="text-sm text-red-500 mt-1">
                {errors.existingSourceProjectId.message}
              </p>
            )}
            {sourceProjects.length === 0 && !loadingSourceProjects && (
              <p className="text-sm text-muted-foreground mt-1">
                You don't have any existing source projects. Choose "New Source
                Project" instead.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Project Details</h2>
        <p className="text-muted-foreground">
          Describe your project and its goals
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="goal">Project Goal *</Label>
          <Controller
            name="goal"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                id="goal"
                placeholder="What do you want to achieve with this project?"
                rows={3}
                className={errors.goal ? "border-red-500" : ""}
              />
            )}
          />
          {errors.goal && (
            <p className="text-sm text-red-500 mt-1">{errors.goal.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="description">Project Description (Markdown) *</Label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                id="description"
                placeholder="Describe your project in detail. You can use Markdown formatting."
                rows={8}
                className={errors.description ? "border-red-500" : ""}
              />
            )}
          />
          {errors.description && (
            <p className="text-sm text-red-500 mt-1">
              {errors.description.message}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            You can use Markdown formatting (headers, lists, links, etc.)
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Project Settings</h2>
        <p className="text-muted-foreground">
          Configure timeline, budget, and visibility
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Visibility *</Label>
          <Controller
            name="visibility"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger
                  className={errors.visibility ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.visibility && (
            <p className="text-sm text-red-500 mt-1">
              {errors.visibility.message}
            </p>
          )}
        </div>

        <div>
          <Label>Compensation Type *</Label>
          <Controller
            name="compensationType"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger
                  className={errors.compensationType ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select compensation type" />
                </SelectTrigger>
                <SelectContent>
                  {COMPENSATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.compensationType && (
            <p className="text-sm text-red-500 mt-1">
              {errors.compensationType.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="duration">Duration (days) *</Label>
          <Controller
            name="duration"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="duration"
                type="number"
                min="1"
                max="3650"
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                className={errors.duration ? "border-red-500" : ""}
              />
            )}
          />
          {errors.duration && (
            <p className="text-sm text-red-500 mt-1">
              {errors.duration.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="budget">Budget (MKD) *</Label>
          <Controller
            name="budget"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="budget"
                type="number"
                min="0"
                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                className={errors.budget ? "border-red-500" : ""}
              />
            )}
          />
          {errors.budget && (
            <p className="text-sm text-red-500 mt-1">{errors.budget.message}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Required Roles</h2>
        <p className="text-muted-foreground">
          Select the roles you need for your project
        </p>
      </div>

      <div>
        <Label>Required Roles *</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
          {REQUIRED_ROLES.map((role) => (
            <div key={role} className="flex items-center space-x-2">
              <Checkbox
                id={role}
                checked={watchedValues.requiredRoles?.includes(role) || false}
                onCheckedChange={() => handleRoleToggle(role)}
              />
              <Label
                htmlFor={role}
                className="text-sm font-normal cursor-pointer"
              >
                {role}
              </Label>
            </div>
          ))}
        </div>
        {errors.requiredRoles && (
          <p className="text-sm text-red-500 mt-1">
            {errors.requiredRoles.message}
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          Selected: {watchedValues.requiredRoles?.length || 0} roles
        </p>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  if (!MobxStore.user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">
            You need to be logged in to create a project.
          </p>
          <Button
            onClick={() => router.push("/login?redirect=/project/create")}
          >
            Login to Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="outline" onClick={() => router.push("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>
              Step {currentStep} of {totalSteps}
            </span>
            <span>{Math.round(getStepProgress())}% Complete</span>
          </div>
          <Progress value={getStepProgress()} className="h-2" />
        </div>

        {/* Form */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)}>
              {renderCurrentStep()}

              {submitError && (
                <Alert variant="destructive" className="mt-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="flex gap-2">
                  {currentStep < totalSteps ? (
                    <Button type="button" onClick={handleNext}>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit(onSubmit)}
                      disabled={isSubmitting || !isValid}
                      className="w-full"
                    >
                      {isSubmitting ? "Creating..." : "Create Project"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default CreateProjectPage;
