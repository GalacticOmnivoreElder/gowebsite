"use client";

import React, { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { auth } from "@/firebase";
import MobxStore from "@/mobx";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Settings,
  Lock,
  Calendar,
  Mail,
  ExternalLink,
  Briefcase,
  Users,
  Crown,
  UserCheck,
} from "lucide-react";

import Link from "next/link";

const ProjectCard = ({ project, role }) => (
  <Card className="hover:shadow-md transition-shadow">
    <Link href={`/project/${project.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {project.thumbnail && (
            <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
              <img
                src={project.thumbnail}
                alt={project.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate group-hover:text-primary">
              {project.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {project.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {project.status}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {project.type}
              </Badge>
              {role && (
                <Badge variant="default" className="text-xs">
                  {role}
                </Badge>
              )}
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Link>
  </Card>
);

const SocialLink = ({ platform, value, label }) => {
  if (!value) return null;

  const getIcon = (platform) => {
    switch (platform) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "discord":
      case "github":
      case "linkedin":
      case "twitter":
      case "portfolio":
      case "artstation":
      case "behance":
      case "youtube":
      case "twitch":
        return <ExternalLink className="h-4 w-4" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  const getHref = (platform, value) => {
    switch (platform) {
      case "email":
        return `mailto:${value}`;
      case "discord":
        return `https://discord.com/users/${value}`;
      case "github":
        return value.startsWith("http") ? value : `https://github.com/${value}`;
      case "linkedin":
        return value.startsWith("http")
          ? value
          : `https://linkedin.com/in/${value}`;
      case "twitter":
        return value.startsWith("http")
          ? value
          : `https://twitter.com/${value.replace("@", "")}`;
      case "portfolio":
        return value.startsWith("http") ? value : `https://${value}`;
      case "artstation":
        return value.startsWith("http")
          ? value
          : `https://artstation.com/${value}`;
      case "behance":
        return value.startsWith("http")
          ? value
          : `https://behance.net/${value}`;
      case "youtube":
        return value.startsWith("http")
          ? value
          : `https://youtube.com/@${value}`;
      case "twitch":
        return value.startsWith("http") ? value : `https://twitch.tv/${value}`;
      default:
        return value.startsWith("http") ? value : `https://${value}`;
    }
  };

  return (
    <a
      href={getHref(platform, value)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
    >
      {getIcon(platform)}
      <span>
        {label}: {value}
      </span>
    </a>
  );
};

const UserProfilePage = observer(() => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.id;
  const activeTab = searchParams.get("tab") || "profile";

  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [error, setError] = useState(null);

  const isOwnProfile = MobxStore.user?.uid === userId;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const headers = {
          "Content-Type": "application/json",
        };

        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`/api/user/${userId}`, { headers });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch profile");
        }

        const profileData = await response.json();
        setProfile(profileData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!profile || activeTab !== "projects") return;

      try {
        setProjectsLoading(true);

        const headers = {
          "Content-Type": "application/json",
        };

        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`/api/user/${userId}/projects`, {
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch projects");
        }

        const projectsData = await response.json();
        setProjects(projectsData);
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setProjectsLoading(false);
      }
    };

    fetchProjects();
  }, [userId, profile, activeTab]);

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
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">User Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The user you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push("/projects")}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (profile.isPrivate) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-4">Private Profile</h2>
              <div className="flex items-center justify-center gap-3 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback>
                    {profile.username?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{profile.username}</h3>
                  <p className="text-muted-foreground">
                    This user's profile is private
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback className="text-2xl">
                {profile.username?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{profile.username}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Joined {new Date(profile.joinedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {isOwnProfile && (
            <Button asChild>
              <Link href="/profile">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Link>
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile" asChild>
              <Link href={`/user/${userId}?tab=profile`}>
                <User className="h-4 w-4 mr-2" />
                Profile
              </Link>
            </TabsTrigger>
            {(isOwnProfile || (projects && projects.totalProjects > 0)) && (
              <TabsTrigger value="projects" asChild>
                <Link href={`/user/${userId}?tab=projects`}>
                  <Briefcase className="h-4 w-4 mr-2" />
                  Projects
                </Link>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Bio */}
            {profile.bio && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{profile.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Links */}
            {profile.socialLinks &&
              Object.keys(profile.socialLinks).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Connect</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(profile.socialLinks).map(
                        ([platform, value]) => (
                          <SocialLink
                            key={platform}
                            platform={platform}
                            value={value}
                            label={
                              platform.charAt(0).toUpperCase() +
                              platform.slice(1)
                            }
                          />
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            {projectsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : projects ? (
              <div className="space-y-8">
                {/* Owner Projects */}
                {projects.ownerProjects &&
                  projects.ownerProjects.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Crown className="h-5 w-5 text-yellow-500" />
                          Owner of Projects ({projects.ownerProjects.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {projects.ownerProjects.map((project) => (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              role="Owner"
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Admin Projects */}
                {projects.adminProjects &&
                  projects.adminProjects.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <UserCheck className="h-5 w-5 text-blue-500" />
                          Admin of Projects ({projects.adminProjects.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {projects.adminProjects.map((project) => (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              role="Admin"
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Team Member Projects */}
                {projects.teamMemberProjects &&
                  projects.teamMemberProjects.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-green-500" />
                          Team Member of Projects (
                          {projects.teamMemberProjects.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {projects.teamMemberProjects.map((project) => (
                            <ProjectCard
                              key={project.id}
                              project={project}
                              role="Team Member"
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {projects.totalProjects === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Briefcase className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">
                        No Projects Yet
                      </h3>
                      <p className="text-muted-foreground">
                        {isOwnProfile
                          ? "You haven't joined any projects yet. Start by creating or joining a project!"
                          : "This user hasn't joined any public projects yet."}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
});

export default UserProfilePage;
