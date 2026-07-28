"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { buildCvExportModel } from "@/lib/profile-mission";
import { downloadCvPdf } from "@/lib/cv-pdf";

export function CvDownloadButton({
  profile,
  currentUser,
  projects,
  className,
  variant = "default",
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!profile?.cv) return null;

  const handleDownload = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      const model = buildCvExportModel({ profile, currentUser, projects });
      const result = await downloadCvPdf(model);
      toast({
        title: "CV ready",
        description: `${result.filename} has been downloaded.`,
      });
    } catch (error) {
      console.error("CV download failed:", error);
      toast({
        title: "Could not download CV",
        description:
          error?.message ||
          "Please try again. Your profile data has not been changed.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={handleDownload}
      disabled={isGenerating}
      aria-busy={isGenerating}
    >
      {isGenerating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {isGenerating ? "Preparing PDF…" : "Download CV"}
    </Button>
  );
}
