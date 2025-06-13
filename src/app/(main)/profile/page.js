"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import ProfileInfo from "@/components/profile/ProfileInfo";
import ProfileEditor from "@/components/profile/ProfileEditor";
import Downloads from "@/components/profile/Downloads";
import Settings from "@/components/profile/Settings";
import { observer } from "mobx-react-lite";
import MobxStore from "@/mobx";
import {
  User,
  Edit,
  Download,
  Settings as SettingsIcon,
  Briefcase,
} from "lucide-react";

const ProfilePage = observer(() => {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("profile");
  const router = useRouter();

  // Read the tab parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam &&
      ["profile", "edit", "projects", "downloads", "settings"].includes(
        tabParam
      )
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
    if (MobxStore.isReady && !MobxStore.user) {
      router.push("/login");
    }
  }, [MobxStore.isReady, MobxStore.user, router]);

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
    setActiveTab(value);
    const url = new URL(window.location);
    url.searchParams.set("tab", value);
    window.history.pushState({}, "", url);
  };

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Your Profile</h1>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="edit" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Profile
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            My Projects
          </TabsTrigger>
          <TabsTrigger value="downloads" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Downloads
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileInfo
            user={MobxStore.user}
            permissions={MobxStore.permissions}
            isMember={MobxStore.isMember}
            hasActiveSubscription={MobxStore.permissions?.subscription?.active}
          />
        </TabsContent>

        <TabsContent value="edit">
          <ProfileEditor />
        </TabsContent>

        <TabsContent value="projects">
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              This will redirect to your user profile projects tab...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <a
                href={`/user/${MobxStore.user.uid}?tab=projects`}
                className="text-primary hover:underline"
              >
                View your projects →
              </a>
            </p>
          </div>
        </TabsContent>

        <TabsContent value="downloads">
          <Downloads
            userId={MobxStore.user.uid}
            unlockedPackages={MobxStore.user.unlockedPackages || []}
          />
        </TabsContent>

        <TabsContent value="settings">
          <Settings user={MobxStore.user} />
        </TabsContent>
      </Tabs>
    </div>
  );
});

export default ProfilePage;

function ProfileSkeleton() {
  return (
    <div className="container py-10">
      <Skeleton className="h-10 w-48 mb-6" />

      <Skeleton className="h-10 w-[400px] mb-6" />

      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-10 w-full max-w-sm" />
        </div>
      </Card>
    </div>
  );
}
