"use client";

import { useState } from "react";
import { ArrowRight, Building2, Check, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SubscribeButton from "@/components/ui/SubscribeButton";
import {
  BILLING_INTERVALS,
  MEMBERSHIP_PLANS,
} from "@/constants/membership";

const planIcons = {
  community: User,
  business: Building2,
};

export const PricingDisplay = () => {
  const [interval, setInterval] = useState("monthly");

  return (
    <div className="min-w-0 max-w-full space-y-8">
      <div className="flex justify-center">
        <div
          className="inline-flex w-full max-w-xs rounded-md border bg-muted/30 p-1"
          role="group"
          aria-label="Billing interval"
        >
          {BILLING_INTERVALS.map((option) => (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={interval === option.id ? "default" : "ghost"}
              className={`min-w-0 ${
                option.id === "annual" ? "flex-[1.65] gap-2" : "flex-1"
              }`}
              aria-pressed={interval === option.id}
              onClick={() => setInterval(option.id)}
            >
              {option.label}
              {option.id === "annual" && (
                <span
                  className={`shrink-0 rounded-sm px-2 py-0.5 text-xs font-semibold leading-none ${
                    interval === "annual"
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "bg-primary/15 text-primary"
                  }`}
                >
                  Save up to 20%
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid min-w-0 max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
        {MEMBERSHIP_PLANS.map((plan) => {
          const Icon = planIcons[plan.id];
          const price = plan.pricing[interval];

          return (
            <Card
              key={plan.id}
              className={`relative min-w-0 max-w-full flex h-full flex-col overflow-hidden ${
                plan.popular ? "border-primary" : ""
              }`}
            >
              <CardHeader className="min-w-0 space-y-5 px-4 pb-4 sm:px-6">
                <div className="flex min-h-8 flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <span className="min-w-0 text-sm font-medium text-muted-foreground">
                      {plan.audience}
                    </span>
                  </div>
                  {plan.popular && <Badge className="shrink-0">Most popular</Badge>}
                </div>

                <div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground sm:min-h-12">
                    {plan.description}
                  </p>
                </div>

                <div className="min-h-24">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold">€{price.amount}</span>
                    <span className="pb-1 text-muted-foreground">
                      / {price.period}
                    </span>
                  </div>
                  <div className="mt-2 flex min-h-6 flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{price.billingNote}</span>
                    {price.savings && (
                      <Badge variant="outline">{price.savings}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="min-w-0 flex-1 px-4 pt-2 sm:px-6">
                <ul className="space-y-3">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 break-words">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="min-w-0 px-4 pt-6 sm:px-6">
                <SubscribeButton
                  tier={plan.tier}
                  interval={interval}
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                >
                  Choose {plan.name}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </SubscribeButton>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Secure recurring billing through Polar. Prices are charged in EUR;
        applicable taxes are calculated at checkout.
      </p>
    </div>
  );
};
