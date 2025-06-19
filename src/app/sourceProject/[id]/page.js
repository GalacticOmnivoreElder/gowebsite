"use client";

import React, { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { auth } from "@/firebase";
import MobxStore from "@/mobx";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, Calendar, Folder, AlertCircle } from "lucide-react";
import UserLink from "@/components/ui/UserLink";

// Import the existing ProjectCard component
import ProjectCard from "@/components/packages/PackageCard";

const SourceProjectDetailsPage = observer(() => {
  const router = useRouter();
  const params = useParams();
  const [sourceProject, setSourceProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sourceProjectId = params.id;

  useEffect(() => {
    const fetchSourceProject = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/sourceProjects/${sourceProjectId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Source project not found");
          } else {
            setError("Failed to load source project");
          }
          return;
        }

        const data = await response.json();
        setSourceProject(data);
      } catch (err) {
        console.error("Error fetching source project:", err);
        setError("Failed to load source project");
      } finally {
        setLoading(false);
      }
    };

    if (sourceProjectId) {
      fetchSourceProject();
    }
  }, [sourceProjectId]);

  const truncateName = (name, maxLength = 30) => {
    if (!name) return "";
    return name.length > maxLength
      ? `${name.substring(0, maxLength)}...`
      : name;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
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
            <AlertCircle className="h-4 w-4" />
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

  if (!sourceProject) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Source Project Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The source project you're looking for doesn't exist or you don't
            have permission to view it.
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => router.push("/projects")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>

        {/* Source Project Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Folder className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">{sourceProject.name}</h1>
          </div>

          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                Created {new Date(sourceProject.createdAt).toLocaleDateString()}
              </span>
            </div>
            <Badge variant="outline">
              {sourceProject.projects?.length || 0} project
              {(sourceProject.projects?.length || 0) !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>

        {/* Owner Section */}
        {sourceProject.ownerDetails && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Source Project Owner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <UserLink
                  user={sourceProject.ownerDetails}
                  showUsername={false}
                  avatarSize="default"
                />
                <div className="flex-1 min-w-0">
                  <UserLink
                    user={sourceProject.ownerDetails}
                    showAvatar={false}
                    className="font-medium truncate block"
                  />
                  {sourceProject.ownerDetails.email && (
                    <p className="text-sm text-muted-foreground truncate">
                      {sourceProject.ownerDetails.email}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator className="mb-8" />

        {/* Projects Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">
            Projects ({sourceProject.projects?.length || 0})
          </h2>

          {sourceProject.projects && sourceProject.projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sourceProject.projects.map((project) => (
                <div key={project.id} className="group">
                  <Link href={`/project/${project.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        {project.thumbnail && (
                          <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-4">
                            <img
                              src={project.thumbnail}
                              alt={project.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          </div>
                        )}

                        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                          {truncateName(project.title, 40)}
                        </h3>

                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                          {project.goal}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="outline" className="text-xs">
                            {project.status}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {project.type}
                          </Badge>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Updated{" "}
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Projects Yet</h3>
                <p className="text-muted-foreground mb-4">
                  This source project doesn't have any projects associated with
                  it yet.
                </p>
                {sourceProject.ownerDetails?.uid === MobxStore.user?.uid && (
                  <Button asChild>
                    <Link href="/project/create">Create New Project</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Project Dates */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Created:{" "}
                {new Date(sourceProject.createdAt).toLocaleDateString()}
              </span>
              <span>
                Updated:{" "}
                {new Date(sourceProject.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default SourceProjectDetailsPage;
