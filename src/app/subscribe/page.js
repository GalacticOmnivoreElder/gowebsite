"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import MobxStore from "@/mobx";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, ArrowLeft } from "lucide-react";
import SubscribeButton from "@/components/ui/SubscribeButton";

const SubscribePage = observer(() => {
  const router = useRouter();

  // Redirect if user is already a member
  useEffect(() => {
    if (MobxStore.user?.activeMember) {
      router.push("/dashboard");
    }
  }, [MobxStore.user, router]);

  // If user is already a member, show success message
  if (MobxStore.user?.activeMember) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">
            You're Already Subscribed!
          </h1>
          <p className="text-muted-foreground mb-6">
            You have an active subscription and access to all premium features.
          </p>
          <Button onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">Join Our Community</h1>
        <p className="text-xl text-muted-foreground">
          Get unlimited access to premium features and content
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Premium Subscription</CardTitle>
            <CardDescription>$15 per month, cancel anytime</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-primary mr-3" />
                Access to all premium packages
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-primary mr-3" />
                Unlimited project collaborations
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-primary mr-3" />
                Priority support
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-primary mr-3" />
                Early access to new features
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-primary mr-3" />
                Community access
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-5 w-5 text-primary mr-3" />
                Cancel anytime
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ready to Get Started?</CardTitle>
            <CardDescription>
              {MobxStore.user
                ? "You're logged in and ready to subscribe!"
                : "Please log in to continue with your subscription"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!MobxStore.user ? (
              <Alert>
                <AlertDescription>
                  You need to be logged in to subscribe. Please log in or create
                  an account first.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">What happens next:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Secure checkout with Polar.sh</li>
                    <li>• Instant access to premium features</li>
                    <li>• Monthly billing, cancel anytime</li>
                    <li>• Full access to your account dashboard</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>Logged in as:</strong> {MobxStore.user.email}
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            {MobxStore.user ? (
              <SubscribeButton className="w-full" size="lg">
                Subscribe Now - $15/month
              </SubscribeButton>
            ) : (
              <div className="w-full space-y-2">
                <Button
                  onClick={() => router.push("/login?redirect=/subscribe")}
                  className="w-full"
                  size="lg"
                >
                  Log In to Subscribe
                </Button>
                <Button
                  onClick={() => router.push("/signup?redirect=/subscribe")}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Create Account
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          By subscribing, you agree to our{" "}
          <Button variant="link" className="p-0 h-auto" asChild>
            <a href="/terms">Terms of Service</a>
          </Button>{" "}
          and{" "}
          <Button variant="link" className="p-0 h-auto" asChild>
            <a href="/privacy">Privacy Policy</a>
          </Button>
          .
        </p>
      </div>
    </div>
  );
});

export default SubscribePage;
