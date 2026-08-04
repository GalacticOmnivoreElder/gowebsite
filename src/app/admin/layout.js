"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MobxStore from "@/mobx";
import { observer } from "mobx-react";
import { Sidebar } from "@/components/admin/Sidebar";
import { LoadingSpinner } from "@/reusable-ui/LoadingSpinner";

const AdminLayout = observer(({ children }) => {
  const router = useRouter();
  const { user, permissions, loading, permissionsLoading } = MobxStore;

  const uid = user?.uid ?? null;
  const isAdmin = Boolean(permissions?.permissions?.isAdmin);

  useEffect(() => {
    // Still resolving the initial Firebase auth state - decide nothing yet.
    if (loading) return;

    // Genuinely signed out → send to login.
    if (!uid) {
      router.replace("/login");
      return;
    }

    // Signed in, but permissions haven't come back yet. Don't judge admin
    // status against an unloaded permissions object - that briefly bounced real
    // admins on navigation. Keep showing the spinner until it resolves.
    if (permissionsLoading || !permissions) return;

    // Signed in, permissions loaded, not an admin → home (not the login form).
    if (!isAdmin) {
      router.replace("/");
    }
    // Primitives only - `router` and `permissions` objects change identity often and caused effect storms.
  }, [loading, permissionsLoading, permissions, uid, isAdmin]);

  if (loading || permissionsLoading || !permissions) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!permissions?.permissions?.isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 overflow-auto p-8">
        <main>{children}</main>
      </div>
    </div>
  );
});

export default AdminLayout;
