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
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MobxStore from "@/mobx";
import { observer } from "mobx-react";

const formSchema = z.object({
  username: z.string().min(4, {
    message: "Username must be at least 4 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email.",
  }),
});

export const SignupForm = observer(() => {
  const { signupWithEmail, upgradeAccount, isUserAnonymous, user } = MobxStore;
  const isAuthenticated = !!user;
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirectTo, setRedirectTo] = useState("/dashboard");

  // Get redirect path and plan from query params
  useEffect(() => {
    const redirect = searchParams.get("redirect");
    const plan = searchParams.get("plan");

    if (redirect) {
      if (plan) {
        setRedirectTo(`${redirect}?plan=${plan}`);
      } else {
        setRedirectTo(redirect);
      }

      // Store in localStorage as fallback
      localStorage.setItem("authRedirect", redirect);
      if (plan) localStorage.setItem("selectedPlan", plan);
    }
  }, [searchParams]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });

  async function onSubmit(values) {
    const { username, email, password } = values;
    setIsLoading(true);

    try {
      if (isAuthenticated && isUserAnonymous) {
        // Upgrade the anonymous account
        await upgradeAccount(email, password, username);
      } else {
        // Regular signup
        await signupWithEmail(email, password, username);
      }
      setIsLoading(false);
      router.push(redirectTo); // Redirect after successful operation
    } catch (error) {
      // Handle errors
      setIsLoading(false);
      form.setError("root", {
        type: "manual",
        message: error.message || "Failed to create account",
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
          name="username"
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  id="username"
                  type="string"
                  placeholder="First and Last Name"
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
                  placeholder="Password (8+ characters)"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>

              <FormMessage />
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
          Create Account
        </Button>
      </form>
    </Form>
  );
});

const SignupCard = observer(() => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isUserAnonymous, signInWithGoogle } = MobxStore;

  const [redirectTo, setRedirectTo] = useState("/dashboard");

  // Get redirect path and plan from query params
  useEffect(() => {
    const redirect = searchParams.get("redirect");
    const plan = searchParams.get("plan");

    if (redirect) {
      if (plan) {
        setRedirectTo(`${redirect}?plan=${plan}`);
      } else {
        setRedirectTo(redirect);
      }
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      router.push(redirectTo);
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <Card className="min-w-3xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">
          {isUserAnonymous
            ? "Upgrade to Permanent Account"
            : "Create an account"}
        </CardTitle>
        <CardDescription>
          {isUserAnonymous
            ? "Don't lose your hard work. Sign up to save your progress."
            : "Get started for free. No credit card required. Currently only available on desktop web"}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-1 gap-6">
          <Button variant="outline" onClick={handleGoogleSignIn}>
            <FaGoogle className="mr-2 h-4 w-4" />
            Google
          </Button>
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
        <SignupForm />
      </CardContent>
      <CardFooter className="flex flex-col">
        <div className="text-muted-foreground text-sm text-center">
          By continuing, you agree to Pathway&apos;s{" "}
          <Link href="/terms">Terms & Conditions</Link> and
          <Link href="/privacy"> Privacy Policy</Link>
        </div>
        <div className="flex flex-col gap-2 text-center mt-4 text-sm">
          Already Have An Account?{" "}
          <Link
            href={`/login${
              searchParams.toString() ? `?${searchParams.toString()}` : ""
            }`}
          >
            <Button variant="outline" className="w-full">
              Login
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
});

const Signup = () => {
  return (
    <div className="flex justify-center items-center mt-8">
      <SignupCard />
    </div>
  );
};
export default Signup;
