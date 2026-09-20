import { GoJourney } from "@/components/GoJourney";
import Link from "next/link";
import {
  Briefcase,
  Check,
  CreditCard,
  Users,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";
import { PricingDisplay } from "@/components/pricing/PricingDisplay";
import { Button } from "@/components/ui/button";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { createMetadata } from "@/lib/seo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getMentorCheckoutStatus } from "@/lib/mentor-checkout";
import { getMentorApplicationState } from "@/lib/product-settings";
import { MentorApplicationButton } from "@/components/pricing/MentorApplicationButton";

export const dynamic = "force-dynamic";

export const metadata = createMetadata({
  title: "GO Membership",
  description:
    "Compare GO Community, GO Mentor, and GO Business membership, pricing, billing, and access.",
  path: "/membership",
});

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

const accessRows = [
  ["Public learning, FAQ, and project browsing", "Yes", "Yes", "Yes", "Yes"],
  ["Submit structured mentorship requests", "—", "Yes", "Yes", "Yes"],
  ["Apply to projects", "Selected public briefs", "Per-project rules", "Per-project rules", "Per-project rules"],
  ["Own unreleased creator projects", "—", "1 at a time", "1 at a time", "Negotiated capacity"],
  ["Create hiring briefs", "—", "—", "—", "Within capacity"],
  ["Create mentor resources", "—", "—", "After verification", "Add-on + verification"],
  ["GO release and publishing guidance", "—", "Included", "Included", "Included"],
];

export default async function MembershipPage({ searchParams }) {
  const params = await searchParams;
  const creatorMembershipRequired = params?.reason === "creator";
  const [mentorMonthly, mentorAnnual, mentorApplicationState] = await Promise.all([
    getMentorCheckoutStatus("monthly"),
    getMentorCheckoutStatus("annual"),
    getMentorApplicationState(),
  ]);

  const membershipCategories = [
    {
      id: "public-free",
      title: "Public / Free",
      icon: User,
      description: "Start with a GO account and the public platform routes.",
      benefits: ["Create a GameDev Passport profile", "Browse public projects and resources", "Explore public learning and community routes"],
      footer: <Button asChild variant="outline" className="w-full"><Link href="/signup">Create account</Link></Button>,
    },
    {
      id: "community",
      title: "GO Community",
      icon: User,
      description: "Individual creator access with the current Community membership.",
      benefits: ["One creator project at a time; GO release approval unlocks the next", "Guided release preparation with GO", "Apply to open community projects", "Eligible courses, video bundles, member resources, and approved asset packs", "Contribute asset packs when community submissions are enabled", "Request an available official GO mentor"],
      footer: <Button asChild variant="outline" className="w-full"><Link href="#paid-plans">See current pricing</Link></Button>,
    },
    {
      id: "mentor-programme",
      title: "GO Mentor Membership",
      icon: Users,
      description: "Join as a mentor or educator. An interview with GO and verification are required before you can produce content or offer mentorship.",
      benefits: ["Produce courses, workshops, video bundles, and assets after interview and GO verification", "Connect with community members requesting mentorship after interview and GO verification", "Direct reviews shared only with author consent and mentor selection; GO approval required"],
      footer: <div className="w-full space-y-3"><Button asChild variant="outline" className="w-full"><Link href="#mentor-plan">See Mentor pricing</Link></Button><MentorApplicationButton applicationsOpen={mentorApplicationState.open} /></div>,
    },
    {
      id: "business",
      title: "GO Business",
      icon: Briefcase,
      description: "Project creation and team management for studios and project owners.",
      benefits: ["Everything included in GO Community", "Project capacity negotiated with the GO Business team", "Review applicants and manage project teams", "Optional verified mentor earning access: +1,500 MKD/month"],
      footer: <Button asChild variant="outline" className="w-full"><Link href="#paid-plans">See current pricing</Link></Button>,
    },
  ];

  return (
    <div className="min-w-0 overflow-x-hidden bg-background text-foreground">
      <main>
        <section className="border-b">
          <div className="container mx-auto max-w-7xl px-4 py-10 md:py-14">
            <p className="mb-3 text-sm font-semibold uppercase text-primary">
              Galactic Omnivore Membership
            </p>
            <h1 className="max-w-3xl break-words text-4xl font-bold md:text-5xl">
              Four ways to take part in GO
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Start with public access or choose Community, Mentor, or Business
              membership when their benefits fit.
            </p>
          </div>
        </section>

        <GoJourney membership />
        <section id="plans" className="container mx-auto px-4 py-10 md:py-14">
          {creatorMembershipRequired && (
            <Alert className="mx-auto mb-8 max-w-5xl">
              <Briefcase className="h-4 w-4" />
              <AlertTitle>Choose your project access</AlertTitle>
              <AlertDescription>
                Community and Mentor include one unreleased creator project. GO Business hiring capacity is agreed with the GO team.
              </AlertDescription>
            </Alert>
          )}
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-4">
            {membershipCategories.map(({ id, title, icon: Icon, description, benefits, badge, footer }) => (
              <Card key={id} id={id} className="flex scroll-mt-24 flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3"><Icon className="h-7 w-7 text-primary" />{badge && <Badge>{badge}</Badge>}</div>
                  <CardTitle>{title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3">{benefits.map((benefit) => <li key={benefit} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{benefit}</span></li>)}</ul>
                </CardContent>
                <CardFooter>{footer}</CardFooter>
              </Card>
            ))}
          </div>

          <section className="mx-auto mt-14 max-w-7xl" aria-labelledby="access-overview-heading">
            <h2 id="access-overview-heading" className="mb-3 text-2xl font-bold">Access at a glance</h2>
            <p className="mb-5 max-w-3xl text-sm text-muted-foreground">Benefits are subject to project terms, GO approval, and the paid-through period. Business capacity and the mentor earning add-on are recorded separately by GO.</p>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">GO access by account type</caption>
                <thead className="bg-muted/40"><tr><th scope="col" className="px-4 py-3 font-semibold">Capability</th><th scope="col" className="px-4 py-3 font-semibold">Public / Free</th><th scope="col" className="px-4 py-3 font-semibold">Community</th><th scope="col" className="px-4 py-3 font-semibold">Mentor</th><th scope="col" className="px-4 py-3 font-semibold">Business</th></tr></thead>
                <tbody>{accessRows.map(([capability, free, community, mentor, business]) => <tr key={capability} className="border-t"><th scope="row" className="px-4 py-3 font-medium">{capability}</th><td className="px-4 py-3 text-muted-foreground">{free}</td><td className="px-4 py-3">{community}</td><td className="px-4 py-3">{mentor}</td><td className="px-4 py-3">{business}</td></tr>)}</tbody>
              </table>
            </div>
          </section>

          <div id="paid-plans" className="scroll-mt-24 pt-14">
            <h2 className="mb-7 text-center text-3xl font-bold">Current paid membership pricing</h2>
            <PricingDisplay mentorAvailability={{ monthly: mentorMonthly.available, annual: mentorAnnual.available }} />
            <Alert className="mx-auto mt-8 max-w-4xl">
              <Briefcase className="h-4 w-4" />
              <AlertTitle>Optional Business mentor earning add-on</AlertTitle>
              <AlertDescription>
                GO Business members can request verified mentor earning access for an additional 1,500 MKD/month. GO approval, mentor verification, and payment confirmation are required; the add-on is recorded by GO separately from the Business subscription.
              </AlertDescription>
            </Alert>
          </div>
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
                Contact support if you need help understanding access or
                billing before you choose.
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
