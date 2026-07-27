import { NewsletterPreferencesForm } from "@/components/newsletter/NewsletterPreferencesForm";

export const metadata = {
  title: "Newsletter preferences | Galactic Omnivore",
  robots: { index: false, follow: false },
};

export default async function NewsletterPreferencesPage({ searchParams }) {
  const params = await searchParams;
  const token = params?.token || "";
  const showUnsubscribePrompt = params?.unsubscribe === "1";
  return (
    <div className="container max-w-2xl mx-auto py-16">
      <h1 className="text-3xl font-bold mb-3">Email preferences</h1>
      <p className="text-muted-foreground mb-8">
        Choose which Galactic Omnivore newsletter topics you want to receive.
        Account, security, and billing messages are managed separately.
      </p>
      <NewsletterPreferencesForm
        token={token}
        showUnsubscribePrompt={showUnsubscribePrompt}
      />
    </div>
  );
}
