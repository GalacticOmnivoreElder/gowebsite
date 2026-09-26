import Link from "next/link";
import DiscordConnection from "@/components/profile/DiscordConnection";

export const metadata = {
  title: "Connect Discord", robots: { index: false, follow: false }, referrer: "no-referrer",
};

export default function DiscordPage() {
  return <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-16">
    <h1 className="text-3xl font-bold">Connect with the GO community</h1>
    <DiscordConnection callback />
    <div className="flex gap-6 text-sm">
      <Link className="underline underline-offset-4" href="/profile?tab=settings">Back to account settings</Link>
      <Link className="underline underline-offset-4" href="/onboarding">Continue onboarding</Link>
    </div>
  </main>;
}
