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
    if (loading || permissionsLoading) return;
    if (!uid) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/login");
    }
    // Primitives only — `router` and `permissions` objects change identity often and caused effect storms.
  }, [loading, permissionsLoading, uid, isAdmin]);

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
