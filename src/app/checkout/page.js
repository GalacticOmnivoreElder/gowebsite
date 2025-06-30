"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import MobxStore from "@/mobx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Check,
  CreditCard,
  Mail,
  Camera,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

function EmailButton({ selectedPlan, MobxStore }) {
  const mailto = `mailto:galacticomnivore@gmail.com?subject=Membership Access&body=Hello,%0D%0A%0D%0AI have completed the payment for the ${
    selectedPlan.name
  } plan.%0D%0A%0D%0AMy details:%0D%0AName: ${
    MobxStore.user?.username || ""
  }%0D%0AEmail: ${
    MobxStore.user?.email || ""
  }%0D%0A%0D%0APlease find the payment confirmation attached.%0D%0A%0D%0AThank you.`;

  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=galacticomnivore@gmail.com&su=Membership Access&body=Hello,%0D%0A%0D%0AI have completed the payment for the ${
    selectedPlan.name
  } plan.%0D%0A%0D%0AMy details:%0D%0AName: ${
    MobxStore.user?.username || ""
  }%0D%0AEmail: ${
    MobxStore.user?.email || ""
  }%0D%0A%0D%0APlease find the payment confirmation attached.%0D%0A%0D%0AThank you.`;

  return (
    <div className="space-y-2 my-4">
      <Button className="w-full" asChild>
        <a
          href={mailto}
          onClick={() => {
            alert(
              "If nothing happens, make sure you have a default mail app set up, or use the Gmail button below!"
            );
          }}
        >
          <Mail className="mr-2 h-4 w-4" />
          Compose Email
        </a>
      </Button>

      <Button variant="outline" className="w-full" asChild>
        <a href={gmail} target="_blank" rel="noopener noreferrer">
          📧 Open Gmail Instead
        </a>
      </Button>
    </div>
  );
}

const CheckoutContent = observer(() => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [plan, setPlan] = useState("monthly");
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated
  const isAuthenticated = !!MobxStore.user;

  useEffect(() => {
    // Redirect to login if not authenticated
    if (MobxStore.isReady && !isAuthenticated) {
      const currentUrl = window.location.pathname + window.location.search;
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }

    // Get plan from query params or localStorage
    const planParam = searchParams.get("plan");
    const storedPlan = localStorage.getItem("selectedPlan");

    if (planParam && ["monthly", "annual"].includes(planParam)) {
      setPlan(planParam);
    } else if (storedPlan && ["monthly", "annual"].includes(storedPlan)) {
      setPlan(storedPlan);
    }

    // Clear stored plan after using it
    if (storedPlan) {
      localStorage.removeItem("selectedPlan");
    }

    setLoading(false);
  }, [searchParams, isAuthenticated, MobxStore.isReady, router]);

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // Plan details
  const planDetails = {
    monthly: {
      name: "Monthly Membership",
      price: "500",
      interval: "month",
      description: "Flexible monthly subscription. Cancel anytime.",
      totalAmount: "500 MKD",
      billingCycle: "Monthly",
      nextBilling: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toLocaleDateString(),
    },
    annual: {
      name: "Annual Membership",
      price: "4,800",
      interval: "year",
      description: "Our best value. Save 1,200 MKD compared to monthly.",
      totalAmount: "4,800 MKD",
      billingCycle: "Yearly",
      nextBilling: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toLocaleDateString(),
    },
  };

  const selectedPlan = planDetails[plan];

  const benefits = [
    "Theme of the Month Art packages",
    "Music packs",
    "Code packs (bundle assets)",
    "Instructional tutorial videos",
    "Free game (thematic for the month)",
    "Community events",
    "Member only Discord access",
    "Premium newsletter",
  ];

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <Button variant="ghost" asChild className="mb-8">
        <Link href="/pricing">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Pricing
        </Link>
      </Button>

      <h1 className="text-3xl font-bold mb-2">Complete Your Subscription</h1>
      <p className="text-muted-foreground mb-8">
        You&apos;re just a few steps away from accessing exclusive game
        development resources.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>
                Review your subscription details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-lg">{selectedPlan.name}</h3>
                  <p className="text-muted-foreground">
                    {selectedPlan.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{selectedPlan.totalAmount}</p>
                  <p className="text-sm text-muted-foreground">
                    per {selectedPlan.interval}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Includes:</h4>
                <ul className="space-y-1">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-4 w-4 mr-2 mt-1 text-primary" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4 border-t pt-6">
              <div className="w-full flex justify-between">
                <span className="font-medium">Total</span>
                <span className="font-bold text-lg">
                  {selectedPlan.totalAmount}
                </span>
              </div>
              <div className="w-full flex justify-between text-sm text-muted-foreground">
                <span>Next billing date</span>
                <span>{selectedPlan.nextBilling}</span>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Instructions</CardTitle>
              <CardDescription>
                Follow these steps to complete your subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert
                variant="warning"
                className="bg-amber-50 dark:bg-amber-950/30"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Payment Information</AlertTitle>
                <AlertDescription>
                  We are currently setting up online payments. To become a
                  member at this time, please follow the instructions below.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">1. Bank Transfer Details</h3>
                    <p className="text-muted-foreground mb-2">
                      Please transfer the exact amount to our bank account:
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <div className="cursor-pointer hover:opacity-90 transition-opacity">
                          <Image
                            src="/uplatnica.png"
                            alt="Uplatnica"
                            width={400}
                            height={400}
                          />
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl p-0 overflow-hidden">
                        <div className="relative w-full h-full">
                          <Image
                            src="/uplatnica.png"
                            alt="Uplatnica Full Size"
                            width={1200}
                            height={1200}
                            className="w-full h-auto object-contain"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Camera className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">2. Take a Screenshot</h3>
                    <p className="text-muted-foreground">
                      After completing the payment, take a screenshot or photo
                      of the payment confirmation. This will serve as proof of
                      your payment.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">3. Send Confirmation Email</h3>
                    <p className="text-muted-foreground mb-2">
                      Send an email to galacticomnivore@gmail.com with:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>Subject: Membership Access</li>
                      <li>Your full name and email address</li>
                      <li>Selected plan: {selectedPlan.name}</li>
                      <li>Attach the screenshot of your payment</li>
                    </ul>
                    <EmailButton
                      selectedPlan={selectedPlan}
                      MobxStore={MobxStore}
                    />
                    {/* <Button variant="outline" className="mt-3" asChild>
                      <a
                        href={`mailto:galacticomnivore@gmail.com?subject=Membership Access&body=Hello,%0D%0A%0D%0AI have completed the payment for the ${
                          selectedPlan.name
                        } plan.%0D%0A%0D%0AMy details:%0D%0AName: ${
                          MobxStore.user?.username || ""
                        }%0D%0AEmail: ${
                          MobxStore.user?.email || ""
                        }%0D%0A%0D%0APlease find the payment confirmation attached.%0D%0A%0D%0AThank you.`}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Compose Email
                      </a>
                    </Button> */}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <ExternalLink className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">4. Activation</h3>
                    <p className="text-muted-foreground">
                      An administrator will review your payment within 24 hours
                      and activate your membership. You&apos;ll receive a
                      confirmation email once your access is granted.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* disabled-feature */}
        {/* <div className="md:col-span-1">
          <div className="sticky top-24">
            <Card>
              <CardHeader>
                <CardTitle>Order Total</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>{selectedPlan.name}</span>
                  <span>{selectedPlan.totalAmount}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{selectedPlan.totalAmount}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Billing cycle: {selectedPlan.billingCycle}
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" disabled>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay {selectedPlan.totalAmount}
                </Button>
              </CardFooter>
            </Card>

            <div className="mt-4 text-sm text-muted-foreground">
              <p className="mb-2">Need help with your order?</p>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/contact">Contact Support</Link>
              </Button>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
});

const CheckoutPage = () => {
  return (
    <Suspense
      fallback={
        <div className="container max-w-4xl mx-auto py-12 px-4">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-muted-foreground">Loading checkout...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
};

export default CheckoutPage;
