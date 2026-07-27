import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Newsletter confirmation | Galactic Omnivore",
  robots: { index: false, follow: false },
};

export default async function NewsletterConfirmedPage({ searchParams }) {
  const params = await searchParams;
  const status = params?.status || "invalid";
  const preferences = params?.preferences;
  const confirmed = ["confirmed", "already-confirmed"].includes(status);
  const expired = status === "expired";
  const Icon = confirmed ? CheckCircle2 : expired ? Clock3 : AlertCircle;

  return (
    <div className="container max-w-2xl mx-auto py-16">
      <Card>
        <CardHeader className="text-center">
          <Icon
            className={`mx-auto h-12 w-12 ${
              confirmed ? "text-green-500" : "text-primary"
            }`}
          />
          <CardTitle className="mt-3">
            {confirmed
              ? "Newsletter subscription confirmed"
              : expired
                ? "Confirmation link expired"
                : "Confirmation link unavailable"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-center">
          <p className="text-muted-foreground">
            {confirmed
              ? "You are subscribed to Galactic Omnivore news and opportunities."
              : expired
                ? "Submit the newsletter form again to receive a fresh confirmation link."
                : "This confirmation link is invalid or has already been replaced."}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            {confirmed && preferences && (
              <Button asChild variant="outline">
                <Link
                  href={`/newsletter/preferences?token=${encodeURIComponent(preferences)}`}
                >
                  Manage preferences
                </Link>
              </Button>
            )}
            <Button asChild>
              <Link href={confirmed ? "/" : "/#newsletter"}>
                {confirmed ? "Return home" : "Try again"}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
