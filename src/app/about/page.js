import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "About Galactic Omnivore",
  description:
    "Learn about Galactic Omnivore, an independent nonprofit game-development association and platform based in Skopje.",
  path: "/about",
});

const routes = [
  {
    title: "Learn",
    description: "Build practical game-development knowledge and skills.",
    href: "/education",
  },
  {
    title: "Find a Project",
    description: "Discover approved projects and suitable open roles.",
    href: "/projects",
  },
  {
    title: "Create a Project",
    description: "Publish clear project needs for review by the GO team.",
    href: "/project/create",
  },
  {
    title: "Join the Community",
    description: "Explore the current membership options and community access.",
    href: "/membership",
  },
];

export default function AboutPage() {
  return (
    <main className="container mx-auto max-w-5xl px-4 py-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
          Unite. Create. Evolve.
        </p>
        <h1 className="text-4xl font-bold sm:text-5xl">
          About Galactic Omnivore
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Galactic Omnivore (GO) is an independent, nonpartisan, nonprofit
          game-development association and platform based in Skopje and active
          across North Macedonia.
        </p>
      </div>

      <Card className="mt-10">
        <CardContent className="space-y-5 pt-6">
          <h2 className="text-2xl font-semibold">Our purpose</h2>
          <p className="leading-7 text-muted-foreground">
            GO helps creators learn practical skills, find collaborators and
            suitable project roles, publish clear project needs, build visible
            experience, take part in community activity, and move work toward
            the next playable milestone.
          </p>
          <p className="leading-7 text-muted-foreground">
            We value honest communication, shared learning, accountability,
            commitment, and equal opportunity to contribute. The platform is
            designed to make each member&apos;s skills, availability, project
            work, and next steps easier to understand.
          </p>
        </CardContent>
      </Card>

      <section className="mt-10" aria-labelledby="choose-route">
        <h2 id="choose-route" className="text-2xl font-semibold">
          Choose your route
        </h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {routes.map((route) => (
            <Card key={route.title}>
              <CardContent className="flex h-full flex-col pt-6">
                <h3 className="text-xl font-semibold">{route.title}</h3>
                <p className="mt-2 flex-1 text-muted-foreground">
                  {route.description}
                </p>
                <Button asChild variant="outline" className="mt-5 w-full">
                  <Link href={route.href}>Explore {route.title}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
