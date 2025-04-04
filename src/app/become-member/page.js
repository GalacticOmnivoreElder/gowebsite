"use client";

import Head from "next/head";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InfoIcon } from "lucide-react";

const BankDetails = () => (
  <Card className="w-full max-w-md mx-auto mt-8">
    <CardHeader>
      <CardTitle>Bank Account Details</CardTitle>
      <CardDescription>Use these details to make your payment</CardDescription>
    </CardHeader>
    <CardContent>
      <ul className="space-y-2">
        <li>
          <strong>Bank Name:</strong> Your Bank Name
        </li>
        <li>
          <strong>Account Name:</strong> Your Company Name
        </li>
        <li>
          <strong>Account Number:</strong> 1234567890
        </li>
        <li>
          <strong>IBAN:</strong> AB12 CDEF 3456 7890
        </li>
        <li>
          <strong>SWIFT/BIC:</strong> ABCDEFGH
        </li>
        <li>
          <strong>Amount:</strong> 500 DEN
        </li>
        <li>
          <strong>Reference:</strong> Your Email Address
        </li>
      </ul>
    </CardContent>
  </Card>
);

const PaymentInstructions = () => (
  <ol className="list-decimal list-inside space-y-4 mt-8">
    <li>Make a payment of 500 DEN to the bank account provided above.</li>
    <li>
      In the payment reference or &quot;cel na doznaka&quot;, include the email
      address you used to create your account.
    </li>
    <li>
      After making the payment, click the &quot;Notify Admin&quot; button below
      to speed up the verification process.
    </li>
    <li>
      Our system admin will verify your payment and activate your membership
      within 24 hours.
    </li>
    <li>
      Once approved, you&quot;ll get instant access to all packages and assets
      for the current month, as well as upcoming events.
    </li>
  </ol>
);

export default function BecomeMemberPage() {
  const handleNotifyAdmin = () => {
    // Here you would implement the logic to notify the admin
    // For now, well just show an alert
    alert("Admin has been notified of your payment. Thank you!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Head>
        <title>Become a Member - Your Game Dev Community</title>
        <meta
          name="description"
          content="Join our exclusive game development community. Follow these steps to become a member and get access to our monthly resources and events."
        />
      </Head>

      <main className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-8">Join Us Today</h1>

        <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
          <div className="w-full md:w-1/2">
            <Image
              src="/placeholder.svg?height=400&width=600"
              alt="Join our community"
              width={600}
              height={400}
              className="rounded-lg"
            />
          </div>
          <div className="w-full md:w-1/2">
            <h2 className="text-2xl font-bold mb-4">
              Become a Member in a Few Simple Steps
            </h2>
            <p className="text-lg mb-4">
              Join our thriving game development community and get access to
              exclusive resources, events, and networking opportunities. Follow
              the instructions below to complete your membership registration.
            </p>
          </div>
        </div>

        <div className="mb-8 p-4 border rounded-lg bg-slate-900 text-slate-100 flex items-start gap-3 border-slate-700">
          <InfoIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium mb-1">Important Information</h3>
            <p className="text-slate-300">
              We are currently working on integrating our system with online
              banking. In the meantime, please follow the manual payment process
              outlined below.
            </p>
          </div>
        </div>

        <BankDetails />

        <PaymentInstructions />

        <div className="text-center mt-12">
          <p className="mb-4">
            After making your payment, click the button below to notify our
            admin for faster approval:
          </p>
          <Button onClick={() => handleNotifyAdmin} size="lg">
            Notify Admin of Payment
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            If you don&quot;t notify us, don&quot;t worry. Your membership will
            be automatically processed within 24 hours of payment.
          </p>
        </div>
      </main>
    </div>
  );
}
