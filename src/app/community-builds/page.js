import { MondayBuildBoard } from "@/components/community/MondayBuildBoard";
import { AppetiteRoleGuide } from "@/components/community/AppetiteRoleGuide";
import { createMetadata } from "@/lib/seo";
export const metadata = createMetadata({ title: "Feed the Omnivore · Monday Builds", description: "Published games feed the Galactic Omnivore. Help shape GO's Monday morning build and follow the community appetite signal.", path: "/community-builds" });
export default function CommunityBuildsPage() {
  return <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
    <header className="mb-10 max-w-4xl"><p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">A message from the Galactic Omnivore</p><h1 className="mt-4 text-4xl font-bold leading-tight sm:text-6xl">Feed the galaxy.<br className="hidden sm:block" /> Choose my next bite.</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">I am the Galactic Omnivore, cosmic patron of game development. Published games are my sustenance. Bring a game all the way into the world and I feast; help me grow the tools and community that carry creators toward their next release.</p><p className="mt-4 max-w-3xl leading-7 text-muted-foreground">Each Monday, before work, I set aside one hour to build GO with you. Vote for the next useful feature and start the day by making something real: 07:00–08:00, Europe/Warsaw.</p></header>
    <div className="mb-12"><AppetiteRoleGuide /></div>
    <MondayBuildBoard />
    <section className="mt-12 border-t pt-8"><h2 className="text-2xl font-bold">Earn a place at the build table</h2><p className="mt-4 leading-8 text-muted-foreground">Publish an original asset pack through GO&apos;s review process to earn a contribution stamp in your free GameDev Passport. With an active Community membership, your published pack also unlocks one vote each week. Bring your work to a GO event or LAN party and staff can add a verified event stamp too.</p><p className="mt-4 leading-8 text-muted-foreground">Your vote guides the one-hour build. I reserve the right to resolve a tie, keep the task useful and post what was completed or deferred. The community chooses the direction; review and testing decide when a feature is ready to ship.</p></section>
  </main>;
}
