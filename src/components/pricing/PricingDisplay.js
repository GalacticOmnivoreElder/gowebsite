"use client";

import React from "react";
import { PricingTier } from "./PricingTier"; // Import the extracted component

// Define the reusable PricingDisplay component
export const PricingDisplay = ({ handleSubscribe, showTier2 = true }) => {
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

  return (
    <>
      {/* Tier 1 Section */}
      <div className="mb-16">
        <h2 className="text-2xl font-semibold text-center mb-8">
          Tier 1 Packages
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <PricingTier
            title="Monthly Plan"
            price="500 MKD /month"
            description="Perfect for creators who want flexibility. Cancel anytime."
            benefits={tier1Benefits}
            ctaText="Subscribe Monthly"
            ctaAction={() => handleSubscribe("monthly")} // Use passed handler
          />

          <PricingTier
            title="Annual Plan"
            price="4,800 MKD /year"
            description="Our best value. Save 1,200 MKD compared to monthly."
            benefits={tier1Benefits}
            ctaText="Subscribe Yearly"
            ctaAction={() => handleSubscribe("annual")} // Use passed handler
            popular={true}
            discount="-20%"
          />
        </div>
      </div>

      {/* Conditionally render Tier 2 Section */}
      {showTier2 && (
        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-center mb-8">
            Tier 2 Packages
          </h2>
          <div className="max-w-md mx-auto">
            <PricingTier
              title="Premium Monthly"
              price="Coming Soon"
              description="Enhanced benefits and support for dedicated creators."
              benefits={[
                "All Tier 1 Benefits",
                "Priority Support",
                "Exclusive Content Previews",
                "Early Access to Betas",
              ]}
              ctaText="Coming Soon"
              disabled={true}
            />
          </div>
        </div>
      )}
    </>
  );
};
