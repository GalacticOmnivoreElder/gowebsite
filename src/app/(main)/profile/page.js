"use client";


import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import ProfileEditor from "@/components/profile/ProfileEditor";
import MissionHub from "@/components/profile/MissionHub";
import { ProfileSectionTabs } from "@/components/profile/ProfileSectionTabs";

import Downloads from "@/components/profile/Downloads";
import Settings from "@/components/profile/Settings";
import { observer } from "mobx-react-lite";
import MobxStore from "@/mobx";
import { auth } from "@/firebase";
import { formatBudget, hasProjectBudget } from "@/utils/formatBudget";
import {
  Briefcase,
  Crown,
  UserCheck,
  Users,
  FileText,
  X,
  Eye,
  EyeOff,
  Clock,
  Coins,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SubscribeButton from "@/components/ui/SubscribeButton";

// Helper function to safely convert Firestore timestamp to Date
const convertToDate = (timestamp) => {
  if (!timestamp) return null;

  // If it's already a Date object
  if (timestamp instanceof Date) return timestamp;

  // Handle Firestore timestamp with _seconds property (most common case)
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000);
  }

  // Handle regular Firestore timestamp with seconds property
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }

  // If it's a string, try to parse it
  if (typeof timestamp === "string") {
    return new Date(timestamp);
  }

  // If it's a number (Unix timestamp)
  if (typeof timestamp === "number") {
    return new Date(timestamp * 1000);
  }

  // Last resort: try toDate method
  try {
    if (
      timestamp &&
      timestamp.toDate &&
      typeof timestamp.toDate === "function"
    ) {
      return timestamp.toDate();
    }
  } catch (error) {
    console.error("Failed to convert timestamp:", error);
  }

  return null;
};

const SubscriptionStatusOverview = ({ user }) => {
  const pendingBusinessUpgrade =
    user?.pendingMembershipTier === "company" &&
    user?.pendingMembershipStatus === "scheduled";
  const pendingEffectiveDate = convertToDate(
    user?.pendingMembershipEffectiveAt
  );
  const pendingPrice =
    Number.isInteger(user?.pendingMembershipPriceAmount) &&
    user?.pendingMembershipCurrency
      ? new Intl.NumberFormat("en", {
          style: "currency",
          currency: user.pendingMembershipCurrency,
          currencyDisplay: "code",
        }).format(user.pendingMembershipPriceAmount / 100)
      : "the Business plan price";

  const getSubscriptionStatusInfo = () => {
    if (!MobxStore.hasActiveSubscription) {
      return {
        status: "inactive",
        title: "No Active Subscription",
        description: "Subscribe to access premium content",
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        variant: "destructive",
      };
    }

    // Check if subscription is canceled
    if (user.subscriptionStatus === "canceled") {
      let endDate = null;
      let daysLeft = 0;

      // Use the safe date conversion function
      endDate = convertToDate(user.subscriptionEndsAt);

      if (endDate) {
        const now = new Date();
        const timeDiff = endDate.getTime() - now.getTime();
        daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
      }

      return {
        status: "canceled",
        title: "Subscription Canceled",
        description:
          daysLeft > 0
            ? `Access ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`
            : "Access has ended",
        icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
        variant: "default",
      };
    }

    return {
      status: "active",
      title: "Active Subscription",
      description: `${
        user?.membershipTier === "company" ? "GO Business" : "GO Community"
      } is your current active membership`,
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      variant: "default",
    };
  };

  const statusInfo = getSubscriptionStatusInfo();

  return (
    <div className="space-y-4">
      <Alert variant={statusInfo.variant}>
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center">
            {statusInfo.icon}
            <div className="ml-2">
              <div className="font-medium">{statusInfo.title}</div>
              <div className="text-sm">{statusInfo.description}</div>
            </div>
          </div>
          {statusInfo.status !== "active" && (
            <SubscribeButton size="sm" className="ml-4">
              Subscribe Now
            </SubscribeButton>
          )}
        </AlertDescription>
      </Alert>

      {pendingBusinessUpgrade && (
        <Alert className="border-primary/35 bg-primary/10">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">Business upgrade scheduled</div>
            <div className="mt-1 text-sm">
              Community remains active until{" "}
              {pendingEffectiveDate?.toLocaleDateString() ||
                "your next renewal date"}
              . Business access begins only after Polar applies the change.
              The expected renewal is {pendingPrice} per{" "}
              {user.pendingMembershipInterval === "annual"
                ? "year"
                : "month"}
              ; Polar confirms final discounts and taxes at renewal.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {MobxStore.hasActiveSubscription && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            For full billing details and management
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/billing">
              <CreditCard className="h-4 w-4 mr-2" />
              View Billing
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

const ProjectCard = ({ project, role }) => {
  const formatDuration = (days) => {
    if (!days || days === 0) return "Not specified";
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
      case "live":
        return "bg-green-100 text-green-800 border-green-200";
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "Owner":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Admin":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Team Member":
        return "bg-green-100 text-green-800 border-green-200";
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
              {project.status === "live" ? "Live" : "Draft"}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              {getVisibilityIcon(project.visibility)}
              {project.visibility}
            </Badge>
          </div>
          {role && (
            <div className="absolute top-2 right-2">
              <Badge className={`${getRoleColor(role)} border`}>{role}</Badge>
            </div>
          )}
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
            {project.goal || project.description || "No description available"}
          </p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {hasProjectBudget(project.budget) && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Coins className="h-4 w-4" />
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
              {project.compensationType || "Not specified"}
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

const ProfileContent = observer(() => {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditMode, setIsEditMode] = useState(false);
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const router = useRouter();
  const currentUser = MobxStore.user;
  const currentUserId = currentUser?.uid;
  const authReady = MobxStore.isReady;

  // Read the tab parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      [
        "profile",
        "projects",
        "applications",
        "downloads",
        "billing",
        "settings",
      ].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Force a fresh permission check when the component mounts
  useEffect(() => {
    MobxStore.checkPermissions(true);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authReady && !currentUser) {
      router.push("/login");
    }
  }, [authReady, currentUser, router]);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUserId) return;

      try {
        setProfileLoading(true);
        const headers = {
          "Content-Type": "application/json",
        };

        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`/api/user/${currentUserId}`, {
          headers,
        });

        if (response.ok) {
          const profileData = await response.json();
          setProfile(profileData);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setProfileLoading(false);
      }
    };

    if (currentUserId) {
      fetchProfile();
    }
  }, [currentUserId]);

  // The mission overview and projects tab both use this grouped response.
  useEffect(() => {
    const fetchProjects = async () => {
      if (!currentUserId || !["profile", "projects"].includes(activeTab)) {
        return;
      }

      try {
        setProjectsLoading(true);
        const headers = {
          "Content-Type": "application/json",
        };

        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(
          `/api/user/${currentUserId}/projects?scope=management`,
          { headers }
        );

        if (response.ok) {
          const projectsData = await response.json();
          setProjects(projectsData);
        }
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setProjectsLoading(false);
      }
    };

    fetchProjects();
  }, [currentUserId, activeTab]);

  // Fetch applications when applications tab is active
  useEffect(() => {
    if (
      activeTab === "applications" &&
      currentUser &&
      !MobxStore.applicationsFetched
    ) {
      MobxStore.fetchApplications();
    }
  }, [activeTab, currentUser]);

  // Show loading state while MobX is initializing or user data is loading
  if (!MobxStore.isReady || MobxStore.loading) {
    return <ProfileSkeleton />;
  }

  // If MobX is ready but no user, we'll redirect (handled in useEffect)
  if (!MobxStore.user) {
    return null;
  }

  // Update URL when tab changes
  const handleTabChange = (value) => {
    if (value === "cv") {
      router.push("/profile/cv");
      return;
    }

    // If billing tab is clicked, navigate to billing page
    if (value === "billing") {
      router.push("/billing");
      return;
    }

    setActiveTab(value);
    setIsEditMode(false);
    const url = new URL(window.location);
    url.searchParams.set("tab", value);
    window.history.pushState({}, "", url);
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const handleCancelApplication = async (applicationId) => {
    try {
      await MobxStore.updateApplicationStatus(applicationId, "cancelled");
      toast({
        title: "Application Cancelled",
        description: "Your application has been cancelled successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel application",
        variant: "destructive",
      });
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
      case "removed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="container max-w-[1500px] py-6 sm:py-8 lg:py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Member command center
        </div>
        <Badge variant="outline" className="border-white/10 bg-card/60">
          Private account navigation
        </Badge>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <ProfileSectionTabs />

        <TabsContent value="profile">
          {profileLoading ? (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-20 w-20 rounded-full bg-muted" />
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-48 bg-muted" />
                        <Skeleton className="h-4 w-72 bg-muted" />
                        <Skeleton className="h-4 w-32 bg-muted" />
                      </div>
                    </div>
                    <Skeleton className="h-10 w-32 bg-muted" />
                  </div>
                  <Skeleton className="h-16 w-full mt-4 bg-muted" />
                </CardContent>
              </Card>
            </div>
          ) : isEditMode ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Edit Profile</h2>
                <Button variant="outline" onClick={toggleEditMode}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
              <ProfileEditor
                onSave={(updatedProfile) => {
                  setProfile((currentProfile) => ({
                    ...currentProfile,
                    ...updatedProfile,
                  }));
                  setIsEditMode(false);
                }}
              />
            </div>
          ) : (
            <MissionHub
              profile={profile || {}}
              currentUser={MobxStore.user || {}}
              projects={projects || {}}
              projectsLoading={projectsLoading}
              isOwner
              hasActiveSubscription={MobxStore.hasActiveSubscription}
              onEdit={toggleEditMode}
              membershipContent={
                <SubscriptionStatusOverview user={MobxStore.user} />
              }
            />
          )}
        </TabsContent>

        <TabsContent value="projects">
          {projectsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : projects ? (
            <div className="space-y-6">
              {/* Owner Projects */}
              {projects.ownerProjects && projects.ownerProjects.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      Owner ({projects.ownerProjects.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              {projects.adminProjects && projects.adminProjects.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-blue-500" />
                      Admin ({projects.adminProjects.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        Team Member ({projects.teamMemberProjects.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

              {/* No Projects */}
              {(!projects.ownerProjects ||
                projects.ownerProjects.length === 0) &&
                (!projects.adminProjects ||
                  projects.adminProjects.length === 0) &&
                (!projects.teamMemberProjects ||
                  projects.teamMemberProjects.length === 0) && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        No Projects Yet
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        You haven&apos;t created or joined any projects yet.
                      </p>
                      <Button asChild>
                        <Link href="/project/create">
                          Create Your First Project
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  Failed to load projects.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="applications">
          {MobxStore.applicationsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : MobxStore.applicationsError ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Applications could not be loaded
                </h3>
                <p className="text-muted-foreground mb-4">
                  {MobxStore.applicationsError}
                </p>
                <Button onClick={() => MobxStore.fetchApplications()}>
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : MobxStore.applications.length > 0 ? (
            <div className="space-y-4">
              {MobxStore.applications.map((application) => (
                <Card
                  key={application.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <Briefcase className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">
                            {application.projectTitle}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {application.roleAppliedFor
                              ? `Role: ${application.roleAppliedFor} · `
                              : ""}
                            Applied on{" "}
                            {new Date(
                              application.createdAt
                            ).toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              className={`${getStatusColor(application.status)} border text-xs`}
                            >
                              {application.status.charAt(0).toUpperCase() +
                                application.status.slice(1)}
                            </Badge>
                            {application.status === "pending" && (
                              <span className="text-xs text-muted-foreground">
                                Waiting for response
                              </span>
                            )}
                            {application.status === "approved" && (
                              <span className="text-xs text-green-600">
                                You&apos;ve been accepted!
                              </span>
                            )}
                            {application.status === "rejected" && (
                              <span className="text-xs text-red-600">
                                Application declined
                              </span>
                            )}
                            {application.status === "removed" && (
                              <span className="text-xs text-muted-foreground">
                                Removed from the project team
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/project/${application.projectId}`}>
                            View Project
                          </Link>
                        </Button>
                        {application.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleCancelApplication(application.id)
                            }
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No Applications Yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  You haven&apos;t applied to any projects yet. Browse projects
                  and apply to ones that interest you!
                </p>
                <Button asChild>
                  <Link href="/projects">Browse Projects</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="downloads">
          <Downloads />
        </TabsContent>

        <TabsContent value="settings">
          <Settings user={MobxStore.user} />
        </TabsContent>
      </Tabs>
    </div>
  );
});

const ProfilePage = () => {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
};

export default ProfilePage;

function ProfileSkeleton() {
  return (
    <div className="container py-10">
      <Skeleton className="h-10 w-48 mb-6 bg-muted" />

      <Skeleton className="h-10 w-[400px] mb-6 bg-muted" />

      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-24 w-24 rounded-full bg-muted" />
          <Skeleton className="h-8 w-48 bg-muted" />
          <Skeleton className="h-6 w-72 bg-muted" />
          <Skeleton className="h-10 w-full max-w-sm bg-muted" />
        </div>
      </Card>
    </div>
  );
}
