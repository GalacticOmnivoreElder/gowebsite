"use client";

import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useParams, useRouter } from "next/navigation";
import { Lock, Orbit } from "lucide-react";
import { auth } from "@/firebase";
import MobxStore from "@/mobx";
import MissionHub from "@/components/profile/MissionHub";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function getInitials(name) {
  return String(name || "GO")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function authenticatedHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (auth.currentUser) {
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }
  return headers;
}

function PublicProfileSkeleton() {
  return (
    <div className="container max-w-[1500px] px-4 py-8 sm:py-10">
      <div className="rounded-2xl border border-white/10 bg-card/50 p-5 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row">
          <Skeleton className="h-24 w-24 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-64 max-w-full bg-muted" />
            <Skeleton className="h-5 w-48 max-w-full bg-muted" />
            <Skeleton className="h-20 w-full bg-muted" />
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-28 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

const UserProfilePage = observer(() => {
  const params = useParams();
  const router = useRouter();
  const userId = params.id;
  const viewerId = MobxStore.user?.uid;
  const isOwnProfile = viewerId === userId;

  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/user/${userId}`, {
          headers: await authenticatedHeaders(),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to load this profile.");
        }
        if (!cancelled) setProfile(data);
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (userId) fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [userId, viewerId]);

  useEffect(() => {
    let cancelled = false;

    const fetchProjects = async () => {
      try {
        setProjectsLoading(true);
        const response = await fetch(`/api/user/${userId}/projects`, {
          headers: await authenticatedHeaders(),
        });
        if (response.ok && !cancelled) {
          setProjects(await response.json());
        } else if (!cancelled) {
          setProjects({});
        }
      } catch (requestError) {
        console.error("Error fetching public projects:", requestError);
        if (!cancelled) setProjects({});
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    };

    if (userId && profile && !profile.isPrivate) fetchProjects();
    return () => {
      cancelled = true;
    };
  }, [userId, viewerId, profile]);

  if (loading) return <PublicProfileSkeleton />;

  if (error) {
    return (
      <main className="container max-w-4xl px-4 py-12">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="container max-w-4xl px-4 py-16 text-center">
        <Orbit className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-5 text-2xl font-bold">Profile not found</h1>
        <p className="mt-2 text-muted-foreground">
          This mission profile does not exist or is unavailable.
        </p>
      </main>
    );
  }

  if (
    (profile.isPrivate || profile.profilePrivacy === "private") &&
    !isOwnProfile
  ) {
    return (
      <main className="container max-w-4xl px-4 py-12">
        <Card className="mission-hub-shell overflow-hidden border-white/10">
          <CardContent className="relative p-8 text-center sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h1 className="mt-5 text-2xl font-bold">Private Mission Profile</h1>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              This member has chosen not to broadcast their professional profile.
            </p>
            <div className="mt-7 flex items-center justify-center gap-3">
              <Avatar className="h-14 w-14 border border-white/10">
                <AvatarImage src={profile.avatar} alt="" />
                <AvatarFallback>{getInitials(profile.username)}</AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Signal identified
                </div>
                <div className="mt-1 font-semibold">{profile.username}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container max-w-[1500px] px-4 py-6 sm:py-8 lg:py-10">
      <MissionHub
        profile={profile}
        currentUser={isOwnProfile ? MobxStore.user || {} : {}}
        projects={projects || {}}
        projectsLoading={projectsLoading}
        isOwner={isOwnProfile}
        hasActiveSubscription={
          isOwnProfile ? MobxStore.hasActiveSubscription : false
        }
        onEdit={() => router.push("/profile")}
      />
    </main>
  );
});

export default UserProfilePage;
