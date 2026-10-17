import { MondayBuildBoard } from "@/components/community/MondayBuildBoard";
import { createMetadata } from "@/lib/seo";
export const metadata = createMetadata({ title: "Monday Builds · Community feature voting", description: "Help shape GO's Monday morning platform build. Published asset contributors with active GO membership receive one feature vote each week.", path: "/community-builds" });
export default function CommunityBuildsPage() {
  return <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
    <header className="mb-10 max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Made with the community</p><h1 className="mt-4 text-4xl font-bold sm:text-5xl">A good Monday starts with a little play.</h1><p className="mt-5 text-lg leading-8 text-muted-foreground">Every Monday, 07:00–08:00 in Warsaw time, we make space before work to improve GO together. Help choose a useful feature, watch the platform grow and build a healthy creative habit with us.</p></header>
    <MondayBuildBoard />
    <section className="mt-12 border-t pt-8"><h2 className="text-2xl font-bold">A vote that grows from contribution</h2><p className="mt-4 leading-8 text-muted-foreground">Publish an original asset pack through GO&apos;s review process and add it to your free GameDev Passport. Active Community membership then unlocks your weekly feature vote and official contribution stamps. GO staff can also award verified event and LAN-party stamps.</p><p className="mt-4 leading-8 text-muted-foreground">The highest-voted candidate guides the build session. The host resolves ties, keeps the work suitable for one hour and posts what was completed or deferred. A vote helps set direction; shipping still depends on review and testing.</p></section>
  </main>;
}
