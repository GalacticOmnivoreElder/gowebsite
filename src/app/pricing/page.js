import Link from "next/link";
import { PricingDisplay } from "@/components/pricing/PricingDisplay";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Membership Pricing | Galactic Omnivore",
  description:
    "Compare Galactic Omnivore Community and Business membership pricing.",
};

export default function PricingPage() {
  return (
    <main className="container mx-auto px-4 py-12 md:py-16">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <h1 className="text-4xl font-bold">GO Membership pricing</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Monthly and annual plans for individual creators, studios, and project
          teams.
        </p>
      </div>

      <PricingDisplay />

      <div className="mt-14 flex flex-col items-center justify-center gap-3 text-center sm:flex-row">
        <Button variant="outline" asChild>
          <Link href="/membership">View membership details</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/contact">Contact support</Link>
        </Button>
      </div>
    </main>
  );
}
