"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { observer } from "mobx-react-lite";
import MobxStore from "@/mobx";
import { PricingDisplay } from "@/components/pricing/PricingDisplay";

const PricingPage = observer(() => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirectPath, setRedirectPath] = useState("/checkout");

  useEffect(() => {
    const redirect = searchParams.get("redirect");
    if (redirect) {
      setRedirectPath(redirect);
      localStorage.setItem("checkoutRedirect", redirect);
    }
  }, [searchParams]);

  const handleSubscribe = (plan) => {
    if (MobxStore.user) {
      const redirectUrl = `/checkout?plan=${plan}`;
      const storedRedirect = localStorage.getItem("checkoutRedirect");
      router.push(
        storedRedirect
          ? `${redirectUrl}&redirect=${storedRedirect}`
          : redirectUrl
      );
    } else {
      router.push(`/login?redirect=/checkout&plan=${plan}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Choose Your Membership Plan</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Get access to exclusive game development assets, tutorials, and a
          supportive community to level up your game creation skills.
        </p>
      </div>

      <PricingDisplay handleSubscribe={handleSubscribe} showTier2={true} />

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
