import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MentorApplicationButton({ applicationsOpen }) {
  if (!applicationsOpen) return null;
  return (
    <Button asChild className="w-full">
      <Link href="/profile?tab=mentor">
        Apply to become a mentor
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
      </Link>
    </Button>
  );
}
