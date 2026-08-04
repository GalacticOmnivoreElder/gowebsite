"use client";

import {
  Bell,
  Briefcase,
  ClipboardList,
  CreditCard,
  Download,
  FileText,
  GraduationCap,
  HeartHandshake,
  PackagePlus,
  Settings,
  User,
  UserCheck,
} from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

const profileSections = [
  { value: "profile", label: "Profile", icon: User },
  { value: "cv", label: "GameDev Passport", icon: FileText },
  { value: "projects", label: "My Projects", icon: Briefcase },
  { value: "applications", label: "Applications", icon: ClipboardList },
  { value: "downloads", label: "Downloads", icon: Download },
  { value: "learning", label: "Learning", icon: GraduationCap },
  { value: "mentor", label: "Mentor", icon: UserCheck },
  { value: "mentorships", label: "Mentorships", icon: HeartHandshake },
  { value: "asset-packs", label: "Asset Packs", icon: PackagePlus },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "billing", label: "Billing", icon: CreditCard },
  { value: "settings", label: "Settings", icon: Settings },
];

export function ProfileSectionTabs() {
  return (
    <TabsList
      className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg border border-primary/25 bg-black/45 p-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6"
      aria-label="Profile sections"
    >
      {profileSections.map((section) => {
        const SectionIcon = section.icon;
        return (
          <TabsTrigger
            key={section.value}
            value={section.value}
            className="group relative h-14 min-w-0 justify-start gap-2 overflow-hidden whitespace-normal rounded-md border border-white/10 bg-card/65 px-3 text-left text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-all hover:border-primary/55 hover:bg-primary/10 active:translate-y-px focus-visible:ring-primary data-[state=active]:border-primary data-[state=active]:bg-primary/15 data-[state=active]:text-foreground data-[state=active]:shadow-[0_0_22px_hsl(var(--primary)/0.2),inset_3px_0_0_hsl(var(--primary))] sm:text-sm"
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/35 transition-colors group-data-[state=active]:bg-primary group-data-[state=active]:shadow-[0_0_10px_hsl(var(--primary)/0.9)]"
            />
            <SectionIcon
              className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-data-[state=active]:text-primary"
              aria-hidden="true"
            />
            <span className="min-w-0 leading-tight">{section.label}</span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}
