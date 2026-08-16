"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { FaGoogle } from "react-icons/fa";
import { CgSpinner } from "react-icons/cg";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import MobxStore from "@/mobx";
import { observer } from "mobx-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  redirectWithPlan,
  safeInternalRedirect,
} from "@/lib/safe-redirect";
import { trackEvent } from "@/lib/analytics/client";

const formSchema = z.object({
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email.",
  }),
});

export const LoginForm = observer(() => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loginWithEmail } = MobxStore;
  const isAuthenticated = !!user;

  const [isLoading, setIsLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState("/profile");

  // Get redirect path and plan from query params
  useEffect(() => {
    const redirect = searchParams.get("redirect");
    const plan = searchParams.get("plan");

    if (redirect) {
      const safeRedirect = redirectWithPlan(redirect, plan);
      setRedirectTo(safeRedirect);

      // Store in localStorage as fallback
      localStorage.setItem(
        "authRedirect",
        safeInternalRedirect(redirect)
      );
      if (plan) localStorage.setItem("selectedPlan", plan);
    }
  }, [searchParams]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values) {
    const { email, password } = values;
    setIsLoading(true);
    trackEvent("login_started", { method: "email" });

    if (isAuthenticated) {
      setIsLoading(false);
      router.push(redirectTo);
      return;
    }

    try {
      await loginWithEmail({
        email,
        password,
      });
      trackEvent("login_completed", { method: "email" });
      setIsLoading(false);
      router.push(redirectTo);
    } catch (error) {
      trackEvent("login_failed", {
        method: "email",
        error_category: error?.code || "invalid_credentials",
      });
      setIsLoading(false);
      // Handle login error
      form.setError("root", {
        type: "manual",
        message: "Invalid email or password",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email Address"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>

              <FormMessage />
              <Link
                href="/reset-password"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Forgot your password?
              </Link>
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <div className="text-destructive text-sm">
            {form.formState.errors.root.message}
          </div>
        )}
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading && <CgSpinner className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>
    </Form>
  );
});

const LoginCard = observer(() => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithGoogle } = MobxStore;

  const [redirectTo, setRedirectTo] = useState("/profile");
  const [googleError, setGoogleError] = useState(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isCheckoutContinuation = Boolean(searchParams.get("plan"));

  // Get redirect path and plan from query params
  useEffect(() => {
    const redirect = searchParams.get("redirect");
    const plan = searchParams.get("plan");

    if (redirect) setRedirectTo(redirectWithPlan(redirect, plan));
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    trackEvent("login_started", { method: "google" });
    try {
      console.log("Starting Google sign-in from login page");
      setIsGoogleLoading(true);
      setGoogleError(null);
      await signInWithGoogle();
      trackEvent("login_completed", { method: "google" });
      console.log("Google sign-in successful, redirecting to:", redirectTo);
      router.push(redirectTo);
    } catch (error) {
      trackEvent("login_failed", {
        method: "google",
        error_category: error?.code || "google_sign_in_failed",
      });
      console.error("Google sign-in error:", error);
      setGoogleError(error.message || "Failed to sign in with Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Card className="min-w-3xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Sign in to Galactic Omnivore</CardTitle>
        <CardDescription>
          {isCheckoutContinuation
            ? "Sign in to continue to secure membership checkout."
            : "Use your GO account to continue."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-1 gap-6">
          <Button
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <CgSpinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FaGoogle className="mr-2 h-4 w-4" />
            )}
            {isGoogleLoading ? "Signing in..." : "Continue with Google"}
          </Button>
          {googleError && (
            <div className="text-destructive text-sm text-center">
              {googleError}
            </div>
          )}
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <LoginForm />
      </CardContent>
      <CardFooter>
        <div className="flex flex-col text-center text-sm w-full gap-2">
          Don&apos;t have an account?
          <Link
            href={`/signup${
              searchParams.toString() ? `?${searchParams.toString()}` : ""
            }`}
          >
            <Button variant="outline" className="w-full">
              Create account
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
});

const LoginContent = () => {
  return (
    <div className="flex justify-center items-center mt-8">
      <LoginCard />
    </div>
  );
};

const LoginPage = () => {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center mt-8">Loading...</div>
      }
    >
      <LoginContent />
    </Suspense>
  );
};

export default LoginPage;
