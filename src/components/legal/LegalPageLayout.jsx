"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LegalPageLayout({ title, lastUpdated, children }) {
  const router = useRouter();

  return (
    <div className="container max-w-4xl py-8 px-4 md:py-12">
      <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
        <ChevronLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </div>
        <div className="prose dark:prose-invert max-w-none">{children}</div>
      </div>
    </div>
  );
}
