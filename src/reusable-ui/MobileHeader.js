import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  Gamepad2,
  GaugeCircle,
  LayoutDashboard,
  MenuIcon,
  PackageSearch,
  Search,
  Ticket,
  UserIcon,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import MobxStore from "@/mobx";
import { observer } from "mobx-react";
import { VerticalNavbar } from "./VerticalNavbar";
import { usePathname } from "next/navigation";
import Image from "next/image";
import logoImg from "../assets/logo.png";

const MobileHeader = observer(() => {
  const { isMobileOpen, setIsMobileOpen } = MobxStore;

  const toggleMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const pathname = usePathname();
  const isRoute = (route) => {
    return pathname.endsWith(route.toLowerCase()) ? "default" : "ghost";
  };

  return (
    <div className="flex justify-between items-center border-b relative h-[52px] z-10000 p-4">
      <Image src={logoImg} alt="Galactic Omnivore" width={40} height={40} />
      <div className="font-bold">Galactic Omnivore</div>
      <Button onClick={toggleMenu} className="p-2">
        {isMobileOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MenuIcon className="h-6 w-6" />
        )}
      </Button>

      {isMobileOpen && (
        <div className="absolute top-[52px] z-1000 left-0 w-full h-screen flex flex-col items-start p-4 bg-white">
          {/* List of menu items */}
          <VerticalNavbar
            links={[
              {
                title: "Contests",
                icon: Ticket,
                variant: isRoute("/"),
                href: "",
              },
              {
                title: "Packages",
                icon: PackageSearch,
                variant: isRoute("packages"),
                href: "packages",
              },
              {
                title: "Profile",
                icon: UserIcon,
                variant: isRoute(`user/${MobxStore.user?.uid}`),
                href: `user/${MobxStore.user?.uid}`,
              },
            ]}
          />
        </div>
      )}
    </div>
  );
});

export default MobileHeader;
