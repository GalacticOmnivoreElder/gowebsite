"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  LayoutDashboard,
  Settings,
  CreditCard,
  LogOut,
  BarChart4,
  Sun,
  Moon,
  Package,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
    { name: "Packages", href: "/admin/packages", icon: Package },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart4 },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="w-64 bg-card border-r border-border h-full flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-1">Galactic Omnivore</p>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin/dashboard" &&
              pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 text-sm rounded-md transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              }`}
            >
              <Icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">Theme</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center px-4 py-3 text-sm text-muted-foreground rounded-md hover:bg-accent/50 hover:text-accent-foreground w-full"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
