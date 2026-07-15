import Link from "next/link";
import { CreditCard, RefreshCw, ShieldCheck } from "lucide-react";
import { PricingDisplay } from "@/components/pricing/PricingDisplay";
import { Button } from "@/components/ui/button";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";

export const metadata = {
  title: "GO Membership | Galactic Omnivore",
  description:
    "Choose a Galactic Omnivore Community or Business membership with monthly or annual billing.",
};

const checkoutNotes = [
  {
    icon: ShieldCheck,
    title: "Secure checkout",
    description: "Payments and recurring billing are handled by Polar.",
  },
  {
    icon: RefreshCw,
    title: "Flexible billing",
    description: "Choose monthly access or save with an annual membership.",
  },
  {
    icon: CreditCard,
    title: "One account",
    description: "Your membership is linked directly to your GO profile.",
  },
];

export default function MembershipPage() {
  return (
    <div className="min-w-0 overflow-x-hidden bg-background text-foreground">
      <main>
        <section className="border-b">
          <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
            <p className="mb-3 text-sm font-semibold uppercase text-primary">
              Galactic Omnivore Membership
            </p>
            <h1 className="max-w-3xl break-words text-4xl font-bold md:text-5xl">
              Community and Business membership
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Join projects and access member resources, or unlock project
              creation and team-building tools for your studio.
            </p>
          </div>
        </section>

        <section id="plans" className="container mx-auto px-4 py-10 md:py-14">
          <PricingDisplay />
        </section>

        <section className="border-y bg-muted/20">
          <div className="container mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 py-10 md:grid-cols-3">
            {checkoutNotes.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-4">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h2 className="font-semibold">{title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <LandingTestimonials />

        <section className="border-t">
          <div className="container mx-auto flex max-w-5xl flex-col gap-5 px-4 py-12 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Questions before joining?</h2>
              <p className="mt-1 text-muted-foreground">
                We can help you choose the membership that fits your work.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/contact">Contact support</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
