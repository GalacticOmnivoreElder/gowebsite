"use client";

import { useState } from "react";
import { observer } from "mobx-react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { CgSpinner } from "react-icons/cg";
import { PASSWORD_RESET_GENERIC_MESSAGE } from "@/lib/password-reset";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email.",
  }),
});

const ResetPasswordForm = observer(() => {
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { sendPasswordReset } = MobxStore;

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values) {
    setIsLoading(true);
    try {
      const result = await sendPasswordReset(values.email);
      setIsEmailSent(true);
      toast({
        title: "Check your email",
        description: result?.message || PASSWORD_RESET_GENERIC_MESSAGE,
      });
    } catch (error) {
      toast({
        title: "Password reset unavailable",
        description:
          error?.message ||
          "Password reset email could not be sent. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isEmailSent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            {PASSWORD_RESET_GENERIC_MESSAGE}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If the address is registered, use the link in the email to reset
            your password. Check your spam folder if it does not arrive.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsEmailSent(false)}
          >
            Try another email
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Back to login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you instructions to reset
          your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your email"
                      type="email"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <CgSpinner className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Instructions"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          Back to login
        </Link>
      </CardFooter>
    </Card>
  );
});

const ResetPasswordPage = () => {
  return (
    <div className="container max-w-screen-xl mx-auto py-8">
      <div className="flex justify-center items-center min-h-[60vh]">
        <ResetPasswordForm />
      </div>
    </div>
  );
};

export default ResetPasswordPage;
