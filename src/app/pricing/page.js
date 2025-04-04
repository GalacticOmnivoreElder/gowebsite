"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { observer } from "mobx-react-lite";
import MobxStore from "@/mobx";
import { Badge } from "@/components/ui/badge";

const PricingTier = ({
  title,
  price,
  description,
  benefits,
  ctaText,
  ctaAction,
  popular = false,
  discount = null,
  disabled = false,
}) => (
  <Card
    className={`w-full max-w-md mx-auto ${
      popular ? "border-primary shadow-lg" : ""
    } relative`}
  >
    {popular && (
      <div className="absolute -top-4 left-0 right-0 flex justify-center">
        <Badge className="bg-primary text-primary-foreground">
          Most Popular
        </Badge>
      </div>
    )}
    {discount && (
      <div className="absolute -top-4 right-4">
        <Badge variant="destructive">{discount}</Badge>
      </div>
    )}
    <CardHeader>
      <CardTitle className="text-2xl font-bold">{title}</CardTitle>
      <CardDescription className="text-xl">{price}</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground mb-4">{description}</p>
      <ul className="space-y-2">
        {benefits.map((benefit, index) => (
          <li key={index} className="flex items-center">
            <Check className="mr-2 h-4 w-4 text-primary" />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
    </CardContent>
    <CardFooter>
      <Button
        className="w-full"
        onClick={ctaAction}
        disabled={disabled}
        variant={popular ? "default" : "outline"}
      >
        {disabled ? (
          <>
            <Clock className="mr-2 h-4 w-4" />
            {ctaText}
          </>
        ) : (
          <>
            {ctaText}
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </CardFooter>
  </Card>
);

const PricingPage = observer(() => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirectPath, setRedirectPath] = useState("/checkout");

  // Get redirect path from query params if available
  useEffect(() => {
    const redirect = searchParams.get("redirect");
    if (redirect) {
      setRedirectPath(redirect);
      // Store in localStorage as fallback
      localStorage.setItem("checkoutRedirect", redirect);
    }
  }, [searchParams]);

  const handleSubscribe = (plan) => {
    // Check if user is logged in
    if (MobxStore.user) {
      // User is logged in, redirect to checkout page with plan parameter
      router.push(`/checkout?plan=${plan}`);
    } else {
      // User is not logged in, redirect to login page with return path
      router.push(`/login?redirect=/checkout&plan=${plan}`);
    }
  };

  const tier1Benefits = [
    "Theme of the Month Art packages",
    "Music packs",
    "Code packs (bundle assets)",
    "Instructional tutorial videos (game dev)",
    "Free game (thematic for the month)",
    "Community events",
    "Member only Discord access",
    "Premium newsletter",
  ];

  // const tier2Benefits = Array(6).fill("???");

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Choose Your Membership Plan</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Get access to exclusive game development assets, tutorials, and a
          supportive community to level up your game creation skills.
        </p>
      </div>

      <div className="mb-16">
        <h2 className="text-2xl font-semibold text-center mb-8">
          Tier 1 Packages
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <PricingTier
            title="Monthly Plan"
            price="500 Den. /month"
            description="Perfect for creators who want flexibility. Cancel anytime."
            benefits={tier1Benefits}
            ctaText="Subscribe Monthly"
            ctaAction={() => handleSubscribe("monthly")}
          />

          <PricingTier
            title="Annual Plan"
            price="4,800 Den. /year"
            description="Our best value. Save 1,200 Den. compared to monthly."
            benefits={tier1Benefits}
            ctaText="Subscribe Yearly"
            ctaAction={() => handleSubscribe("annual")}
            popular={true}
            discount="-20%"
          />
        </div>
      </div>

      <div className="mb-16">
        <h2 className="text-2xl font-semibold text-center mb-8">Tier 2 Packages</h2>
        <div className="max-w-md mx-auto">
          <PricingTier
            title="Premium Monthly"
            price="Coming Soon"
            description=""
            benefits={[]}
            ctaText="Coming Soon"
            disabled={true}
          />
        </div>
      </div>

      <div className="text-center mt-16">
        <h2 className="text-2xl font-semibold mb-4">Not Sure Yet?</h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Check out our detailed membership benefits or contact us if you have
          any questions.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="outline" asChild>
            <Link href="/membership">View Membership Details</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contact">Contact Us</Link>
          </Button>
        </div>
      </div>
    </div>
  );
});

export default PricingPage;
