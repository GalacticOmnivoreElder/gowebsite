"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { observer } from "mobx-react-lite";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import MobxStore from "@/mobx";
import { auth } from "@/firebase";
import { toast } from "@/components/ui/use-toast";
import {
  getProjectFormStepForField,
  normalizeOptionalProjectNumber,
} from "@/lib/project-form-utils";
import { CREATOR_MEMBERSHIP_URL } from "@/lib/project-access";
import { trackEvent } from "@/lib/analytics/client";
import {
  APPLICATION_ACCESS_OPTIONS,
  DEFAULT_APPLICATION_ACCESS,
} from "@/lib/project-utils";
import { normalizeProjectSchedule } from "@/lib/project-duration";

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
const APPLICATION_ACCESS_LABELS = {
  members_only: "Active GO members only",
  all_signed_in_users: "All signed-in users, including free users",
};

const IMAGE_URL_PATTERN =
  /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i;

const optionalProjectNumber = (schema) =>
  z.preprocess(normalizeOptionalProjectNumber, schema.optional());

// Validation Schema
const projectSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(100, "Title too long")
      .regex(
        /^[\w\s\-'.!,?&()+:/]+$/,
        "Title contains invalid characters"
      ),
    thumbnail: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine(
        (val) => !val || z.string().url().safeParse(val).success,
        "Must be a valid URL"
      )
      .refine(
        (val) => !val || IMAGE_URL_PATTERN.test(val),
        "URL must point to an image file (jpg, png, gif, webp, svg)"
      ),
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
    applicationAccess: z.enum(APPLICATION_ACCESS_OPTIONS, {
      required_error: "Choose who may apply",
    }),
    goal: z.string().min(10, "Goal must be at least 10 characters"),
    duration: z.number().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isOngoing: z.boolean(),
    budget: optionalProjectNumber(
      z
        .number()
        .min(0, "Budget cannot be negative")
        .max(Number.MAX_SAFE_INTEGER, "Budget is too large")
    ),
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
  .superRefine((data, context) => {
    const schedule = normalizeProjectSchedule(data, { allowLegacy: false });
    if (!schedule.ok) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: schedule.error,
        path: [schedule.field],
      });
    }
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
    message: "Choose a valid project group.",
      path: ["sourceProjectOption"],
    }
  );

const CreateProjectContent = observer(() => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [newCategoryTag, setNewCategoryTag] = useState("");
  const [sourceProjects, setSourceProjects] = useState([]);
  const [loadingSourceProjects, setLoadingSourceProjects] = useState(false);
  const [checkingCreatorAccess, setCheckingCreatorAccess] = useState(true);
  const [accessCheckError, setAccessCheckError] = useState("");
  const [accessCheckVersion, setAccessCheckVersion] = useState(0);
  const creationAttemptKey = useRef(null);
  const formStarted = useRef(false);

  const totalSteps = 4;

  const {
    control,
    handleSubmit,
    formState: { errors },
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
      applicationAccess: DEFAULT_APPLICATION_ACCESS,
      goal: "",
      duration: 90,
      startDate: "",
      endDate: "",
      isOngoing: false,
      budget: "",
      compensationType: "",
      requiredRoles: [],
      linkedProjects: [],
      sourceProjectOption: "new",
      sourceProjectName: "",
      existingSourceProjectId: "",
    },
  });

  const watchedValues = watch();

  const authReady = MobxStore.isReady;
  const currentUserId = MobxStore.user?.uid;

  useEffect(() => {
    if (!authReady) return;

    if (!currentUserId) {
      router.replace("/login?redirect=/project/create");
      return;
    }

    let active = true;
    setCheckingCreatorAccess(true);
    setAccessCheckError("");

    const verifyCreatorAccess = async () => {
      const result = await MobxStore.checkPermissions(true);
      if (!active) return;

      const canCreateProjects =
        result?.permissions?.canCreateProjects ??
        MobxStore.permissions?.permissions?.canCreateProjects;

      if (canCreateProjects === false) {
        router.replace(CREATOR_MEMBERSHIP_URL);
        return;
      }

      if (canCreateProjects !== true) {
        setAccessCheckError(
          "We could not verify your project creation access. Please try again."
        );
      }

      setCheckingCreatorAccess(false);
    };

    verifyCreatorAccess();
    return () => {
      active = false;
    };
  }, [accessCheckVersion, authReady, currentUserId, router]);

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
    if (!formStarted.current) {
      formStarted.current = true;
      trackEvent("project_creation_started", { entry_point: "projects" });
      trackEvent("form_started", {
        form_id: "project_creation",
        page_path: "/project/create",
      });
    }
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
        return [
          "visibility",
          "startDate",
          "endDate",
          "isOngoing",
          "budget",
          "compensationType",
        ];
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
      if (!creationAttemptKey.current) {
        creationAttemptKey.current = crypto.randomUUID();
      }

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
          "Idempotency-Key": creationAttemptKey.current,
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === "company_membership_required") {
          router.replace(CREATOR_MEMBERSHIP_URL);
          return;
        }
        throw new Error(errorData.error || "Failed to create project");
      }

      const newProject = await response.json();

      trackEvent("project_creation_completed", {
        project_type: formData.type,
        project_visibility: formData.visibility,
      });
      trackEvent("form_completed", {
        form_id: "project_creation",
        page_path: "/project/create",
      });

      toast({
        title: "Project created",
        description:
          "Your project draft has been created. Submit it for review when it is ready for moderation.",
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

  const handleInvalidSubmit = (formErrors) => {
    const firstInvalidField = Object.keys(formErrors)[0];
    const invalidFieldStep = ["startDate", "endDate", "isOngoing"].includes(
      firstInvalidField
    )
      ? 3
      : getProjectFormStepForField(firstInvalidField);
    trackEvent("form_validation_error", {
      form_id: "project_creation",
      field_id: firstInvalidField || "unknown",
      error_type: "invalid_field",
    });
    setCurrentStep(invalidFieldStep);
    setSubmitError(
      "Please review the highlighted fields before creating the project."
    );
    toast({
      title: "Project details need attention",
      description:
        formErrors[firstInvalidField]?.message ||
        "Please check the highlighted fields.",
      variant: "destructive",
    });
  };

  const getStepProgress = () => (currentStep / totalSteps) * 100;

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Project basics</h2>
        <p className="text-muted-foreground">
          Name the project and choose how related listings should be grouped.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Project title *</Label>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="title"
                placeholder="Enter the project title"
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
          <Label>Category tags *</Label>
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
          <Label>Project type *</Label>
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
          <Label>Project group *</Label>
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
                  <SelectValue placeholder="Choose a project group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    Create a new project group
                  </SelectItem>
                  <SelectItem value="existing">
                    Use an existing project group
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
            <Label htmlFor="sourceProjectName">Project group name *</Label>
            <Controller
              name="sourceProjectName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="sourceProjectName"
                  placeholder="Enter a group name (3-50 characters)"
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
              A project group connects related listings.
            </p>
          </div>
        )}

        {watchedValues.sourceProjectOption === "existing" && (
          <div>
            <Label>Existing project group *</Label>
            {loadingSourceProjects ? (
              <div className="flex items-center justify-center p-3 border rounded">
                <span className="text-sm text-muted-foreground">
                  Loading your project groups...
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
                      <SelectValue placeholder="Choose an existing project group" />
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
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          No project groups available
                        </div>
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
                You do not have an existing project group. Create a new group
                instead.
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
        <h2 className="text-2xl font-bold">Scope and next milestone</h2>
        <p className="text-muted-foreground">
          Explain what exists now and what should become playable next.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="goal">Project goal *</Label>
          <Controller
            name="goal"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                id="goal"
                placeholder="What is playable now, and what should become playable next?"
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
          <Label htmlFor="description">Project description (Markdown) *</Label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                id="description"
                placeholder="Describe the scope, context, requirements, and current state."
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
            Markdown supports headings, lists, and links.
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Terms and visibility</h2>
        <p className="text-muted-foreground">
          State how people can access and assess the project.
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
          <Label>Who can apply? *</Label>
          <Controller
            name="applicationAccess"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger
                  className={errors.applicationAccess ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Choose applicant access" />
                </SelectTrigger>
                <SelectContent>
                  {APPLICATION_ACCESS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {APPLICATION_ACCESS_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Free users can apply only when you choose the all signed-in users option.
          </p>
          {errors.applicationAccess && (
            <p className="text-sm text-red-500 mt-1">
              {errors.applicationAccess.message}
            </p>
          )}
        </div>

        <div>
          <Label>Compensation type *</Label>
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

        <div className="md:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="startDate">Start date *</Label>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="startDate"
                    type="date"
                    className={errors.startDate ? "border-red-500" : ""}
                  />
                )}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.startDate.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="endDate">End date *</Label>
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="endDate"
                    type="date"
                    disabled={watchedValues.isOngoing}
                    className={errors.endDate ? "border-red-500" : ""}
                  />
                )}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3">
            <Controller
              name="isOngoing"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isOngoing"
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked === true);
                    if (checked === true) setValue("endDate", "");
                  }}
                />
              )}
            />
            <div>
              <Label htmlFor="isOngoing">Ongoing project</Label>
              <p className="text-sm text-muted-foreground">
                Select this when the project has no planned end date.
              </p>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="budget">Budget (MKD)</Label>
          <Controller
            name="budget"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="budget"
                type="number"
                min="0"
                max={Number.MAX_SAFE_INTEGER}
                placeholder="Optional"
                onChange={(e) => field.onChange(e.target.value)}
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
        <h2 className="text-2xl font-bold">Open roles</h2>
        <p className="text-muted-foreground">
          Select each role needed to reach the next milestone.
        </p>
      </div>

      <div>
        <Label>Required roles *</Label>
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

  if (!authReady || checkingCreatorAccess) {
    return (
      <div className="container mx-auto flex min-h-[420px] items-center justify-center px-4 py-12">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (accessCheckError) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 text-2xl font-bold">Access check unavailable</h1>
          <p className="mb-6 text-muted-foreground">{accessCheckError}</p>
          <Button onClick={() => setAccessCheckVersion((value) => value + 1)}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!MobxStore.user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in required</h1>
          <p className="text-muted-foreground mb-4">
            You need to be logged in to create a project.
          </p>
          <Button
            onClick={() => router.push("/login?redirect=/project/create")}
          >
            Sign in to continue
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
            Back to projects
          </Button>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>
              Step {currentStep} of {totalSteps}
            </span>
            <span>{Math.round(getStepProgress())}% complete</span>
          </div>
          <Progress value={getStepProgress()} className="h-2" />
        </div>

        {/* Form */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)} noValidate>
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
                  Back
                </Button>

                <div className="flex gap-2">
                  {currentStep < totalSteps ? (
                    <Button type="button" onClick={handleNext}>
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Creating..." : "Create project"}
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

const CreateProjectPage = () => {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      }
    >
      <CreateProjectContent />
    </Suspense>
  );
};

export default CreateProjectPage;
