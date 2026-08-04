import Link from "next/link";
import { ArrowRight, BookOpen, FolderKanban, Gamepad2, MessageCircle, Newspaper, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Game Development Community",
  description: "Explore GO projects, learning, creator stories, games, resources, and Discord.",
  path: "/community",
});

const routes = [
  { title: "Projects", description: "Find a team or follow current work.", href: "/projects", icon: FolderKanban },
  { title: "Learn", description: "Explore current learning material.", href: "/education", icon: BookOpen },
  { title: "GO Signal", description: "Read creator and project stories.", href: "/blog", icon: Newspaper },
  { title: "Games", description: "Discover games connected to GO.", href: "/games", icon: Gamepad2 },
  { title: "Resources", description: "Review public and member resources.", href: "/resources", icon: PackageOpen },
  { title: "Discord", description: "Join the community conversation.", href: "https://discord.gg/ZbSShxu6K4", icon: MessageCircle, external: true },
];

export default function CommunityPage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
      <p className="text-sm font-semibold uppercase text-primary">Community</p>
      <h1 className="mt-3 text-4xl font-bold md:text-5xl">Your GO community routes</h1>
      <p className="mt-4 max-w-3xl text-lg text-muted-foreground">Move between live projects, learning, creator stories, games, resources, and the Discord community.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map(({ title, description, href, icon: Icon, external }) => (
          <Card key={title} className="flex flex-col">
            <CardHeader><Icon className="h-7 w-7 text-primary" /><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="flex flex-1 flex-col"><p className="mb-5 text-sm text-muted-foreground">{description}</p><Button className="mt-auto" variant="outline" asChild><Link href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>Explore <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
