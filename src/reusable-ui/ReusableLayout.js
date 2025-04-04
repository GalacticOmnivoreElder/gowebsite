"use client";

import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { VerticalNavbar } from "./VerticalNavbar";

import { PackageSearch, Ticket, UserIcon } from "lucide-react";
import MobxStore from "../mobx";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { observer } from "mobx-react";
import { LoadingSpinner } from "./LoadingSpinner";
import { UserNav } from "./ReusableProfileMenu";
import Image from "next/image";
import logoImg from "../assets/logo.png";

import { ModeToggle } from "@/components/ui/themeButton";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ReusableLayout = observer(({ children }) => {
  const { user, logout } = MobxStore;

  const pathname = usePathname();

  // Check if we're on an admin route
  const isAdminRoute = pathname?.startsWith("/admin");

  // If we're on an admin route, just render the children without the layout
  if (isAdminRoute) {
    return <>{children}</>;
  }

  const isRoute = (route) => {
    if (route === "/") {
      return pathname.toLowerCase() === `${route.toLowerCase()}`
        ? "default"
        : "ghost";
    }

    return pathname.toLowerCase().includes(route.toLowerCase())
      ? "default"
      : "ghost";
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="min-h-[calc(100vh-64px-200px)]">{children}</main>
      <Footer />
    </div>
  );
});

export default ReusableLayout;
