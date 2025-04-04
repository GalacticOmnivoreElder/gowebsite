"use client";

import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobxStore from "@/mobx";
import { LoadingSpinner } from "@/reusable-ui/LoadingSpinner";
import MemberDashboard from "@/components/dashboard/MemberDashboard";

const DashboardPage = observer(() => {
  const { user, permissions, loading, permissionsLoading } = MobxStore;
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkPermissions = async () => {
      if (user && !permissions) {
        await MobxStore.checkPermissions();
      }
      setIsChecking(false);
    };

    checkPermissions();
  }, [user, permissions]);

  useEffect(() => {
    // Redirect to membership page if user is not logged in or doesn't have member permissions
    if (!isChecking && (!user || (permissions && !permissions?.permissions?.isMember))) {
      router.push('/membership');
    }
  }, [user, permissions, isChecking, router]);

  if (loading || permissionsLoading || isChecking) {
    return <LoadingSpinner />;
  }

  // If user is logged in and has member permissions, show the dashboard
  if (user && permissions?.permissions?.isMember) {
    return <MemberDashboard />;
  }

  // This will be shown briefly before the redirect happens
  return <LoadingSpinner />;
});

export default DashboardPage;
