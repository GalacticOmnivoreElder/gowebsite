"use client";

import React, { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import MobxStore from "@/mobx";
import { auth } from "@/firebase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Filter,
  Plus,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Eye,
  EyeOff,
  Clock,
  Briefcase,
  ExclamationTriangle,
} from "lucide-react";
import { formatBudget, hasProjectBudget } from "@/utils/formatBudget";
import { getProjectCreationDestination } from "@/lib/project-access";
import { toast } from "@/components/ui/use-toast";

const ProjectCard = ({ project }) => {
  const router = useRouter();

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

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
      <Link href={`/project/${project.id}`}>
        <div className="relative aspect-video overflow-hidden rounded-t-lg">
          <Image
            src={project.thumbnail || "/placeholder.svg"}
            alt={project.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute top-2 left-2 flex gap-2">
            <Badge className={`${getStatusColor(project.status)} border`}>
              {project.status === "pending" && "Pending"}
              {project.status === "hiring" && "Hiring"}
              {project.status === "live" && "Live"}
              {project.status === "completed" && "Completed"}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              {getVisibilityIcon(project.visibility)}
              {project.visibility}
            </Badge>
          </div>
        </div>

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {project.title}
            </CardTitle>
            <Badge variant="outline" className="shrink-0">
              {project.type}
            </Badge>
          </div>

          {/* Source Project Information - use span to avoid nested <a> tags */}
          {project.sourceProjectDetails && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Part of:{" "}
                <span
                  role="button"
                  tabIndex={0}
                  className="text-primary hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/sourceProject/${project.sourceProjectDetails.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/sourceProject/${project.sourceProjectDetails.id}`);
                    }
                  }}
                >
                  {project.sourceProjectDetails.name.length > 25
                    ? `${project.sourceProjectDetails.name.substring(0, 25)}...`
                    : project.sourceProjectDetails.name}
                </span>
              </p>
            </div>
          )}

          {project.categoryTags && project.categoryTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {project.categoryTags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {project.categoryTags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{project.categoryTags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.goal}
          </p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {hasProjectBudget(project.budget) && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>{formatBudget(project.budget)}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(project.duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="outline" className="flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              {project.compensationType}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {project.requiredRoles?.length || 0} role
              {project.requiredRoles?.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};

const ProjectsPage = observer(() => {
  const router = useRouter();
  const [localFilters, setLocalFilters] = useState({
    search: "",
    category: "all",
    type: "all",
    visibility: "all",
    status: "all",
    sortBy: "created_desc",
  });

  // Load projects on component mount and when filters change
  useEffect(() => {
    const loadProjects = async () => {
      await MobxStore.fetchProjects(localFilters, true);
    };
    loadProjects();
  }, [localFilters]);

  const handleFilterChange = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
    MobxStore.updateProjectFilters({ [key]: value });
  };

  const handleLoadMore = () => {
    if (!MobxStore.projectsLoading && MobxStore.projectPagination.hasMore) {
      MobxStore.fetchProjects();
    }
  };

  const handleCreateProject = async () => {
    if (!MobxStore.user) {
      router.push(
        getProjectCreationDestination({
          isAuthenticated: false,
          canCreateProjects: false,
        })
      );
      return;
    }

    const result = await MobxStore.checkPermissions(true);
    const canCreateProjects =
      result?.permissions?.canCreateProjects ??
      MobxStore.permissions?.permissions?.canCreateProjects;

    if (canCreateProjects === undefined) {
      toast({
        title: "Could not verify creator access",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    router.push(
      getProjectCreationDestination({
        isAuthenticated: true,
        canCreateProjects,
      })
    );
  };

  const projectList = MobxStore.projects;
  const uniqueCategories = React.useMemo(() => {
    const categories = new Set();
    projectList.forEach((project) => {
      project.categoryTags?.forEach((tag) => categories.add(tag));
    });
    return Array.from(categories).sort();
  }, [projectList]);

  const uniqueTypes = [
    "Game Development",
    "Art & Design",
    "Programming",
    "Music & Audio",
    "Writing & Narrative",
    "Marketing",
    "Other",
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Projects</h1>
          <p className="text-xl text-muted-foreground">
            Discover and join exciting game development projects
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCreateProject} className="whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={localFilters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="pl-10"
          />
        </div>

        <Select
          value={localFilters.category}
          onValueChange={(value) => handleFilterChange("category", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={localFilters.type}
          onValueChange={(value) => handleFilterChange("type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Project Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {uniqueTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={localFilters.status}
          onValueChange={(value) => handleFilterChange("status", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hiring">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Hiring
              </div>
            </SelectItem>
            <SelectItem value="live">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Live Projects
              </div>
            </SelectItem>
            <SelectItem value="completed">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                Completed
              </div>
            </SelectItem>
            <SelectItem value="pending">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                Pending Approval
              </div>
            </SelectItem>
            <SelectItem value="all">All Statuses</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={localFilters.sortBy}
          onValueChange={(value) => handleFilterChange("sortBy", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_desc">Newest First</SelectItem>
            <SelectItem value="created_asc">Oldest First</SelectItem>
            <SelectItem value="budget_desc">Highest Budget</SelectItem>
            <SelectItem value="budget_asc">Lowest Budget</SelectItem>
            <SelectItem value="duration_desc">Longest Duration</SelectItem>
            <SelectItem value="duration_asc">Shortest Duration</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      <div className="space-y-8">
        {MobxStore.projectsLoading && MobxStore.projects.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        ) : MobxStore.projects.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to create a project in our community!
            </p>
            <Button onClick={handleCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MobxStore.projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {/* Load More Button */}
            {MobxStore.projectPagination.hasMore && (
              <div className="text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={MobxStore.projectsLoading}
                  variant="outline"
                  size="lg"
                >
                  {MobxStore.projectsLoading
                    ? "Loading..."
                    : "Load More Projects"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center p-6">
          <h3 className="text-2xl font-bold text-primary mb-2">
            {MobxStore.projects.length}
          </h3>
          <p className="text-muted-foreground">Active Projects</p>
        </Card>

        <Card className="text-center p-6">
          <h3 className="text-2xl font-bold text-primary mb-2">
            {uniqueCategories.length}
          </h3>
          <p className="text-muted-foreground">Project Categories</p>
        </Card>

        <Card className="text-center p-6">
          <h3 className="text-2xl font-bold text-primary mb-2">
            {MobxStore.projects.reduce(
              (sum, p) => sum + (p.requiredRoles?.length || 0),
              0
            )}
          </h3>
          <p className="text-muted-foreground">Open Roles</p>
        </Card>
      </div>
    </div>
  );
});

export default ProjectsPage;
