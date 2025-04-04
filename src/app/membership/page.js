"use client";

import { useState, useEffect } from "react";
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
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { observer } from "mobx-react-lite";
import MobxStore from "@/mobx";

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
  const [isPlaying, setIsPlaying] = useState(false);

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

export const GameOfTheMonth = ({fromLanding}) => (
  <div className="py-2 border-b">
    <div className="flex flex-col md:flex-row gap-8 items-center">
      {/* Image section - will appear first on mobile */}
      <div className="w-full md:w-1/2 order-1 md:order-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
          <Link href="/membership">
            <Image
              src="/g1/g1-mvp.png"
              alt="Top Rat Game"
              fill
              className="object-cover transition-transform duration-500 hover:scale-105 cursor-pointer"
              priority
            />
          </Link>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-4 left-4 right-4">
            <Badge className="bg-primary/90 text-white mb-2">
              Game of the Month
            </Badge>
            <p className="text-white text-sm">
              Available exclusively to members
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
          <h3 className="text-3xl font-bold mb-4">Top Rat</h3>
          <p className="text-lg text-muted-foreground mb-6">
            Dive into the toxic sewers with Mrale, a courageous rat on an endless platforming adventure. 
            Jump, dodge, and survive in this challenging game where every obstacle could be your last.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Includes:</h4>
          <ul className="space-y-2">
            {[
              "Complete game with endless platforming",
              "Top Rat Art Assets with 100+ sprites",
              "Original atmospheric soundtrack",
              "Game mechanics source code",
              "UI & Level Design templates",
              "Mini-games set in the Top Rat universe",
            ].map((item, index) => (
              <li key={index} className="flex items-start">
                <Check className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button size="lg" asChild className="mt-4">
          <Link href={fromLanding ? "/membership" : "/pricing"}>
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
  const searchParams = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState("monthly");

  const isAuthenticated = !!MobxStore.user;

  useEffect(() => {
    const planParam = searchParams.get("plan");
    const storedPlan = localStorage.getItem("selectedPlan");

    if (planParam && ["monthly", "annual"].includes(planParam)) {
      setSelectedPlan(planParam);
      localStorage.setItem("selectedPlan", planParam);
    } else if (storedPlan && ["monthly", "annual"].includes(storedPlan)) {
      setSelectedPlan(storedPlan);
    }

    if (storedPlan) {
      localStorage.removeItem("selectedPlan");
    }
  }, [searchParams]);

  return (
    <div className="bg-background text-foreground">
      <Head>
        <title>Membership - Your Game Dev Community</title>
        <meta
          name="description"
          content="Join our exclusive game development community and get access to monthly themed assets, tutorials, and more!"
        />
      </Head>

      <main className="container mx-auto px-4 py-16">
        <GameOfTheMonth />

        <DetailSection
          title="Theme of the Month Art Packages"
          description="Immerse yourself in our monthly themed art packages. This May, explore the gritty world of Top Rat with toxic sewer-inspired sprites, backgrounds, and UI elements. Perfect for creating atmospheric platformer games or adding a touch of urban adventure to your projects."
          imageSrc="/g1/g1-art.png"
          imageAlt="May Top Rat Theme Art Package Preview"
        />

        <DetailSection
          title="Curated Music Packs"
          description="Set the mood with our professionally composed music packs. Each month features a new theme, providing you with a variety of tracks to enhance your game's atmosphere. Listen to a preview of this month's toxic sewer-inspired melody:"
          imageSrc="/g1/g1-music.png"
          imageAlt="Music Pack Visualizer"
          reverse={true}
        >
          {/* <AudioPreview src="/path-to-audio-file.mp3" /> */}
        </DetailSection>

        <DetailSection
          title="Code Packs & Snippets"
          description="Accelerate your development with our monthly code packs. Get access to optimized algorithms, game mechanics, and systems tailored to the month's theme. This month, dive into endless platformer mechanics, obstacle generation, and power-up systems for your own games."
          imageSrc="/g1/g1-code.png"
          imageAlt="Code Snippet Preview"
        />

        <DetailSection
          title="UI & Level Design Templates"
          description="Create engaging and challenging levels with our professional UI and level design templates. Each month, we focus on techniques relevant to the theme. Learn how to design intuitive UI for platformers, implement difficulty progression, or create engaging obstacle patterns."
          imageSrc="/g1/g1-design.png"
          imageAlt="UI & Level Design Preview"
          reverse={true}
        />

        <DetailSection
          title="Exclusive Monthly Game"
          description="Get inspired by playing and deconstructing our monthly themed game. This May, enjoy 'Top Rat', an endless platformer that showcases the art, music, and code techniques covered in this month's resources. Dive deep into its mechanics and learn how it was built!"
          imageSrc="/g1/g1-mvp.png"
          imageAlt="Top Rat Game Screenshot"
        />

      

        <div className="text-center mt-16">
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
        </div>
      </main>
    </div>
  );
});

export default MembershipPage;
