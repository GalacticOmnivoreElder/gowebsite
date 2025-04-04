"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import ProfileInfo from "@/components/profile/ProfileInfo";
import Downloads from "@/components/profile/Downloads";
import Settings from "@/components/profile/Settings";
import { observer } from "mobx-react-lite";
import MobxStore from "@/mobx";

const ProfilePage = observer(() => {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("profile");
  const router = useRouter();

  // Read the tab parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["profile", "downloads", "settings"].includes(tabParam)) {
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

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-8">Your Profile</h1>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="downloads">Downloads</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileInfo
            user={MobxStore.user}
            permissions={MobxStore.permissions}
            isMember={MobxStore.isMember}
            hasActiveSubscription={MobxStore.permissions?.subscription?.active}
          />
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
