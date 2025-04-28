"use client";

import React from "react";
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
import { Badge } from "@/components/ui/badge";

export const PricingTier = ({
  title,
  price,
  description,
  benefits,
  ctaText,
  ctaAction,
  popular = false,
  discount = null,
  disabled = false,
  variant = "default", // Add variant prop: 'default' or 'business'
}) => (
  <Card
    className={`w-full max-w-md mx-auto ${
      popular ? "border-primary shadow-lg" : ""
    } relative flex flex-col h-full`}
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
      <CardTitle className={`text-2xl font-bold`}>{title}</CardTitle>
      <CardDescription className="text-xl">{price}</CardDescription>
    </CardHeader>
    <CardContent className="flex-grow">
      <p className="text-muted-foreground mb-4">{description}</p>
      <ul className="space-y-2">
        {benefits.map((benefit, index) => (
          <li key={index} className="flex items-center">
            <Check className={`mr-2 h-4 w-4 text-primary`} />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
    </CardContent>
    <CardFooter className="mt-auto">
      <Button
        className="w-full"
        onClick={ctaAction}
        disabled={disabled}
        variant={
          popular ? "default" : variant === "business" ? "default" : "outline"
        } // Maybe always default for business?
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
