"use client";

import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import MobxStore from "@/mobx";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/reusable-ui/LoadingSpinner";

const PermissionGate = observer(({ routeKey, components = {} }) => {
  const router = useRouter();
  const { user, permissions, loading, permissionsLoading } = MobxStore;
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      console.log("PermissionGate Effect - Initial State:", {
        user: !!user,
        hasPermissions: !!permissions,
        loading,
        permissionsLoading,
      });

      if (user && !permissions) {
        console.log("Checking permissions...");
        await MobxStore.checkPermissions();
      }

      setIsChecking(false);
    };

    checkPermissions();
  }, [user, permissions]);

  // Debug logging
  console.log("PermissionGate Render State:", {
    user: !!user,
    permissions,
    loading,
    permissionsLoading,
    isChecking,
    routeKey,
    isAdmin: permissions?.permissions?.isAdmin,
  });

  // Wait for everything to be ready
  if (loading || permissionsLoading || isChecking) {
    console.log("Still loading...");
    return <LoadingSpinner />;
  }

  // For admin routes
  if (routeKey === "ADMIN") {
    console.log("Admin route check:", {
      hasUser: !!user,
      adminStatus: permissions?.permissions?.isAdmin,
    });

    if (!user) {
      console.log("No user, redirecting to login");
      router.push("/login");
      return null;
    }

    if (!permissions?.permissions?.isAdmin) {
      console.log("Not admin, redirecting to login");
      router.push("/login");
      return null;
    }

    console.log("Admin access granted!");
    const AdminComponent = components.admin;
    return AdminComponent ? <AdminComponent /> : null;
  }

  // ... rest of your component logic for other routes ...
});

export default PermissionGate;
