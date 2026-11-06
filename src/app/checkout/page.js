import Link from "next/link";
import { ArrowLeft, CreditCard, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Membership checkout unavailable",
  description:
    "GO membership checkout is temporarily unavailable while the payment provider is updated.",
};

export default function CheckoutPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-16">
      <Button variant="ghost" asChild className="mb-8">
        <Link href="/membership">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to membership
        </Link>
      </Button>

      <section className="rounded-xl border p-6 md:p-8">
        <div className="flex items-start gap-4">
          <CreditCard
            className="mt-1 h-7 w-7 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Membership access
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              New checkout is temporarily paused
            </h1>
            <p className="mt-4 text-muted-foreground">
              GO is updating its payment-provider setup. No payment can be
              started from this page, and mentorship is not sold as a
              subscription benefit.
            </p>
          </div>
        </div>

        <Alert className="mt-6">
          <Mail className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Need help with existing access?</AlertTitle>
          <AlertDescription>
            Existing subscribers can manage their current subscription from
            Billing. For questions about access or the provider transition,
            contact GO support.
          </AlertDescription>
        </Alert>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/membership">Review membership access</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contact">Contact support</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
