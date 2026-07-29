"use client";

import {
  Briefcase,
  ClipboardList,
  CreditCard,
  Download,
  FileText,
  Settings,
  User,
} from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ProfileSectionTabs() {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <TabsList
        className="inline-flex w-max min-w-full sm:min-w-0"
        aria-label="Profile sections"
      >
        <TabsTrigger value="profile" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="cv" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          GameDev Passport
        </TabsTrigger>
        <TabsTrigger value="projects" className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          My Projects
        </TabsTrigger>
        <TabsTrigger value="applications" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Applications
        </TabsTrigger>
        <TabsTrigger value="downloads" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Downloads
        </TabsTrigger>
        <TabsTrigger value="billing" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Billing
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </TabsTrigger>
      </TabsList>
    </div>
  );
}
