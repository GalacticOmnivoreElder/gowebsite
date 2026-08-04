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
import { MentorApplicationButton } from "@/components/pricing/MentorApplicationButton";
import { getMentorApplicationState } from "@/lib/product-settings";

export const metadata = createMetadata({
  title: "GO Membership",
  description:
    "Compare current GO Community and GO Business membership, pricing, billing, and access.",
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

export default async function MembershipPage({ searchParams }) {
  const params = await searchParams;
  const creatorMembershipRequired = params?.reason === "creator";
  const mentorState = await getMentorApplicationState();

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
      benefits: ["Apply to open community projects", "Eligible courses, video bundles, member resources, and approved asset packs", "Contribute asset packs when community submissions are enabled", "Request approved mentors when matchmaking is enabled"],
      footer: <Button asChild variant="outline" className="w-full"><Link href="#paid-plans">See current pricing</Link></Button>,
    },
    {
      id: "mentor-programme",
      title: "Mentor Programme",
      icon: Users,
      description: "An application-based route for approved mentors who support game creators.",
      benefits: ["Approved public mentor profile and preparation", "Availability and matching tools when enabled", "Direct reviews shared only with author consent and mentor selection; GO approval required"],
      badge: "Coming Soon",
      footer: <div className="space-y-3"><Button className="w-full" disabled>Coming Soon</Button><MentorApplicationButton applicationsOpen={mentorState.open} /></div>,
    },
    {
      id: "business",
      title: "GO Business",
      icon: Briefcase,
      description: "Project creation and team management for studios and project owners.",
      benefits: ["Everything included in GO Community", "Create and publish community projects", "Review applicants and manage project teams"],
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
              Start with public access, choose Community or Business when their
              current benefits fit, or review the coming Mentor Programme.
            </p>
          </div>
        </section>

        <section id="plans" className="container mx-auto px-4 py-10 md:py-14">
          {creatorMembershipRequired && (
            <Alert className="mx-auto mb-8 max-w-5xl">
              <Briefcase className="h-4 w-4" />
              <AlertTitle>Business membership required</AlertTitle>
              <AlertDescription>
                Choose GO Business to create projects and manage project teams.
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
                  {id === "mentor-programme" && !mentorState.open && <p className="mt-5 text-sm text-muted-foreground">Mentor applications are currently closed. The application form will become available when the next mentor intake opens.</p>}
                </CardContent>
                <CardFooter>{footer}</CardFooter>
              </Card>
            ))}
          </div>

          <div id="paid-plans" className="scroll-mt-24 pt-14">
            <h2 className="mb-7 text-center text-3xl font-bold">Current paid membership pricing</h2>
            <PricingDisplay />
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
