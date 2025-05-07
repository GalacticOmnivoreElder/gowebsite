"use client";

import React from "react";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/navigation"; // Use if needed for CTAs
import MobxStore from "@/mobx";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PricingDisplay } from "@/components/pricing/PricingDisplay"; // Import the reusable pricing component
import { PricingTier } from "@/components/pricing/PricingTier"; // Import the PricingTier component
import { ArrowRight, Building, User } from "lucide-react";
import Head from "next/head";
import Image from "next/image";
import { Check } from "lucide-react";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { FullCTA } from "@/components/landing/FullCTA";

const DetailSection = ({
  title,
  description,
  imageSrc,
  imageAlt,
  reverse = false,
  children,
}) => (
  <div
    className={`flex flex-col ${
      reverse ? "md:flex-row-reverse" : "md:flex-row"
    } items-center gap-8 py-16`}
  >
    <div className="w-full md:w-1/2">
      <Image
        src={imageSrc || "/placeholder.svg"}
        alt={imageAlt}
        width={600}
        height={400}
        className="rounded-lg"
      />
    </div>
    <div className="w-full md:w-1/2">
      <h2 className="text-3xl font-bold mb-4">{title}</h2>
      <p className="text-lg">{description}</p>
      {children}
    </div>
  </div>
);

const AudioPreview = ({ src }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);

  const togglePlay = () => {
    const audio = document.getElementById("audio-preview");
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center space-x-4 mt-4">
      <Button onClick={togglePlay}>{isPlaying ? "Pause" : "Play"}</Button>
      <span>5-second preview</span>
      <audio id="audio-preview" src={src} />
    </div>
  );
};

const YouTubeEmbed = ({ videoId }) => (
  <div className="aspect-w-16 aspect-h-9 mt-4">
    <iframe
      src={`https://www.youtube.com/embed/${videoId}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className="w-full h-full rounded-lg"
    />
  </div>
);

export const GameOfTheMonth = ({ fromLanding }) => (
  <div className="py-2 border-b">
    <div className="flex flex-col md:flex-row gap-8 items-center">
      {/* Image section - will appear first on mobile */}
      <div className="w-full md:w-1/2 order-1 md:order-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
          <Link href="/membership">
            <Image
              src="/g1/g1-mvp.gif"
              alt="Top Rat Game"
              fill
              className="object-cover transition-transform duration-500 hover:scale-105 cursor-pointer"
              priority
            />
          </Link>
          {/* <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div> */}
          <div className="absolute bottom-4 left-4 right-4">
            <Badge className="bg-primary/90 text-white mb-2">
              Game of the Month
            </Badge>
            <p className="text-white text-sm">
              Available exclusively to this month&rsquo;s community members!
            </p>
          </div>
        </div>
      </div>

      {/* Content section - will appear second on mobile */}
      <div className="w-full md:w-1/2 space-y-6 order-2 md:order-1">
        <div>
          <h2 className="text-lg font-medium text-primary mb-2">
            FEATURED THIS MONTH
          </h2>
          <h3 className="text-3xl font-bold mb-4">
            G.O. Platformer Asset Pack - April 2025
          </h3>
          <p className="text-lg text-muted-foreground mb-6">
            Dive into the toxic sewers with Mrale, a courageous rat on an
            endless platforming adventure. Jump, dash, wall slide, and survive
            in this challenging game where a single misstep can take you for a
            swim with the radioactive fishes.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Includes:</h4>
          <ul className="space-y-2">
            {[
              "Playable prototype with endless platforming",
              "Tons of hand-drawn sprite frames ",
              "Original atmospheric soundtrack",
              "Secret Game Design scroll",
              "Unity Source code file",
            ].map((item, index) => (
              <li key={index} className="flex items-start">
                <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button size="lg" asChild className="mt-4">
          <Link href={fromLanding ? "/resources" : "/pricing"}>
            {fromLanding ? "Learn More" : "Become a Member"}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  </div>
);

const Badge = ({ children, className }) => (
  <span
    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
  >
    {children}
  </span>
);

const MembershipPage = observer(() => {
  const router = useRouter();

  // Define the same subscribe handler as in pricing, or a simplified one if needed
  const handleSubscribe = (plan) => {
    // Check if user is logged in
    if (MobxStore.user) {
      // Redirect to checkout page with plan parameter
      router.push(`/checkout?plan=${plan}`);
    } else {
      // Redirect to login page with return path
      router.push(`/login?redirect=/checkout&plan=${plan}`);
    }
  };

  const handleBusinessInquiry = () => {
    window.open(
      "https://galacticomnivore.atlassian.net/servicedesk/customer/portal/5/group/14/create/10385",
      "_blank"
    );
  };

  const businessBenefits = [
    "All Individual Plan Benefits",
    "Team Access & Management",
    "Volume Licensing Discounts",
    "Dedicated Account Manager",
    "Custom Onboarding & Support",
    "Usage Reporting",
  ];

  return (
    <div className="bg-background text-foreground">
      <Head>
        <title>Membership Plans - Your Game Dev Community</title>
        <meta
          name="description"
          content="Join our exclusive game development community. Choose a plan for individuals or contact us for business solutions."
        />
      </Head>

      <main className="container mx-auto px-4 py-16">
        {/* <DetailSection
          title="Theme of the Month Art Packages"
          description="Serve up a visually rich platformer with this handcrafted asset pack! Every element in this collection is lovingly illustrated by hand, bringing a fresh, organic feel to your game world—no pixels, just pure artistry. Whether you're crafting a roguelike, an action-packed adventure, or a whimsical platformer, these assets provide the perfect ingredients for a stunning game."
          imageSrc="/g1/g1-art.png"
          imageAlt="May Top Rat Theme Art Package Preview"
        /> */}

        {/* <DetailSection
          title="Curated Music Packs"
          description="Spice up your game with this sizzling selection of original sounds and music! Whether you're baking a brawler, frying up a fantasy quest, or slow-cooking a story-rich RPG, this audio asset pack delivers crispy sound design and mouth-watering melodies to level up your entire soundscape."
          imageSrc="/g1/g1-music.png"
          imageAlt="Music Pack Visualizer"
          reverse={true}
        >
          // <AudioPreview src="/path-to-audio-file.mp3" />
        </DetailSection> */}

        {/* <DetailSection
          title="Code Packs & Snippets"
          description="Get the actual Unity project of this month's game theme! You can eat up all of that pre-written code, modify your developer's meal at any moment, and add your own spices and flavours. Take this prototype in a completely different direction and unleash your creative hunger."
          imageSrc="/g1/g1-code.png"
          imageAlt="Code Snippet Preview"
        /> */}

        {/* <DetailSection
          title="UI & Level Design Templates"
          description="Great games, like great meals, start with the right ingredients and a well-thought-out recipe. If you're crafting a platformer and need a structured way to mix movement, levels, and progression into a deliciously balanced experience, the G.O Platformer Game Design Document is your ultimate game development cookbook."
          imageSrc="/g1/g1-design.png"
          imageAlt="UI & Level Design Preview"
          reverse={true}
        /> */}

        {/* <DetailSection
          title="Exclusive Monthly Game"
          description="TOP - RAT The Ultimate Pixel-Perfect Feast! 
Step into a handcrafted platforming experience where every jump, enemy, and level is a deliciously designed bite of gameplay perfection.
A full-course adventure served with style, challenge, and heart. Inspired by classic 2D platformers and spiced with modern mechanics, this is your chance to feast on gameplay that's as tight and satisfying as a perfectly cooked dish."
          imageSrc="/g1/g1-mvp.png"
          imageAlt="Top Rat Game Screenshot"
        /> */}

        {/* <div className="text-center mt-16">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Level Up Your Game Dev Journey?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/pricing">View Pricing Plans</Link>
            </Button>
            {!isAuthenticated && (
              <Button size="lg" variant="outline" asChild>
                <Link href="/login?redirect=/pricing">
                  Sign In to Subscribe
                </Link>
              </Button>
            )}
          </div>
        </div> */}

        {/* B2B / B2C Selection Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-semibold text-center mb-10">
            Plans for Everyone
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* B2C Card */}
            <Card className="flex flex-col items-center text-center p-8 bg-secondary/30 border-2 border-secondary hover:border-primary transition-colors duration-200">
              <CardHeader>
                <User className="h-12 w-12 mb-4 text-primary mx-auto" />
                <CardTitle className="text-2xl font-bold">
                  For Individuals
                </CardTitle>
                <CardDescription className="mt-2 text-muted-foreground">
                  Access monthly assets, tutorials, community support, and more
                  to boost your personal game dev journey.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button
                  onClick={() =>
                    document
                      .getElementById("individual-plans")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="mt-4"
                >
                  See Personal Plans
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* B2B Card */}
            <Card className="flex flex-col items-center text-center p-8 bg-secondary/30 border-2 border-secondary hover:border-primary transition-colors duration-200">
              <CardHeader>
                <Building className="h-12 w-12 mb-4 text-primary mx-auto" />
                <CardTitle className="text-2xl font-bold">
                  For Businesses & Studios
                </CardTitle>
                <CardDescription className="mt-2 text-muted-foreground">
                  Equip your team with resources, get tailored support, explore
                  bulk licensing, or discuss custom solutions.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button onClick={handleBusinessInquiry} className="mt-4">
                  Contact Us for Business Solutions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pricing Display Section (Individuals) */}
        <section id="individual-plans" className="mb-16 scroll-mt-20">
          <h2 className="text-3xl font-semibold text-center mb-10">
            Individual Membership Plans
          </h2>
          <PricingDisplay handleSubscribe={handleSubscribe} showTier2={true} />
        </section>

        {/* Business Pricing Section */}
        <section id="business-plan" className="mb-20 scroll-mt-20">
          <h2 className="text-3xl font-semibold text-center mb-10">
            Business & Enterprise Solutions
          </h2>
          <div className="max-w-md mx-auto">
            <PricingTier
              title="Business Plan"
              price="Custom Pricing"
              description="Tailored solutions for teams, studios, and educational institutions."
              benefits={businessBenefits}
              ctaText="Request a Quote"
              ctaAction={handleBusinessInquiry}
              variant="business"
              disabled={false}
            />
          </div>
          <p className="text-center text-muted-foreground mt-6 max-w-2xl mx-auto">
            Need something specific for your organization? Let&rsquo;s chat about your
            requirements.
          </p>
        </section>

        {/* Testimonials and Final CTA */}
        <LandingTestimonials />
        <FullCTA />
      </main>
    </div>
  );
});

export default MembershipPage;
