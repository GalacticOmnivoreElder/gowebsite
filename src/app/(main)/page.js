"use client";
import React, { useEffect, useState } from "react";

// Landing components
import { HeroSection } from "@/components/landing/HeroSection";
import { SkillBanner } from "@/components/landing/SkillBanner";
import { PartnerBanner } from "@/components/landing/PartnerBanner";
import { FullCTA } from "@/components/landing/FullCTA";
import { PixelSectionDivider } from "@/components/landing/PixelSectionDivider";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { LandingOpenHours } from "@/components/landing/LandingOpenHours";
import { LandingDiscordJoin } from "@/components/landing/LandingDiscordJoin";
import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";
import { GoPillars } from "@/components/landing/GoPillars";

import background1Img from "../../assets/background1.png";
import heroImg from "../../assets/HERO.png";
import avatar1Img from "../../assets/avatar1.png";
import avatar2Img from "../../assets/avatar2.png";
import avatar3Img from "../../assets/avatar3.png";
import avatar4Img from "../../assets/avatar4.gif";

import achievementImg1 from "../../assets/A1.png";
import achievementImg2 from "../../assets/A2.png";
import achievementImg3 from "../../assets/A3.png";

import joinusImg from "../../assets/joinus.png";
import discordImg from "../../assets/discord.png";

import driveTruImg from "../../assets/logosImg.png";

import transparentImg from "../../assets/transparent.png";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  Clapperboard,
  Facebook,
  FolderKanban,
  Users,
  Instagram,
  Linkedin,
  PackageOpen,
  Radio,
  Search,
  Twitch,
  Twitter,
  Youtube,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ExploreGo } from "@/components/landing/ExploreGo";
import { trackEvent } from "@/lib/analytics/client";

const magenta = "#CA2280";

const TimerCountdown = () => {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  function getTimeLeft() {
    const now = new Date();
    const targetDate = new Date(Date.UTC(2025, 3, 4, 0, 0, 0)); // April 4, 2025
    const diff = Math.max(0, targetDate.getTime() - now.getTime());

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { days, hours, minutes, seconds };
  }

  return (
    <div className="flex items-center justify-center bg-[#CA2280] text-white font-bold text-xl tracking-wide max-w-[350px] p-3">
      {timeLeft.days}д {String(timeLeft.hours).padStart(2, "0")}:
      {String(timeLeft.minutes).padStart(2, "0")}:
      {String(timeLeft.seconds).padStart(2, "0")}
    </div>
  );
};

const pillarsData = [
  {
    img: background1Img,
    text: "we do what we do, we do what we do, we do what we do.we do what we do, we do what we do",
    dot: 1,
  },
  {
    img: background1Img,
    text: "we do what we do",
    dot: 2,
  },
  {
    img: background1Img,
    text: "we do what we do",
    dot: 3,
  },
];

const Dot = ({ isActive }) => (
  <div
    className={`h-4 w-4  mx-1 ${
      isActive ? "bg-white" : "border-2 border-white"
    }`}
  ></div>
);

const socialMedia = [
  {
    icon: <Facebook />,
    src: "https://www.facebook.com/profile.php?id=100088917386120",
  },
  { icon: <Twitter />, src: "https://twitter.com/GalacticOmnivor" },
  {
    icon: <Instagram />,
    src: "https://www.instagram.com/galacticomnivore/",
  },
  {
    icon: <Linkedin />,
    src: "https://www.linkedin.com/company/galactic-omnivore/",
  },
  {
    icon: <Youtube />,
    src: "https://www.youtube.com/@galacticomnivore",
  },
  {
    icon: <Twitch />,
    src: "https://www.twitch.tv/galactic_omnivore",
  },
  {
    icon: <discordImg />,
    src: "https://discord.gg/ZbSShxu6K4",
  },
];

const ContactUs = () => {
  return (
    <div className={`flex justify-center flex-col p-4 bg-[${magenta}]`}>
      <div className="text-4xl text-center mb-4 text-white">Contact GO</div>
      <div className="text-center lg:mx-[10%] text-white">
        Got a game idea, a unique skill set, or just want to connect with fellow
        game enthusiasts? Reach out! Whether you&apos;re here to learn
        (Education), build your brand (Portfolio), or find project support
        (Outsourcing), our community is here to help you thrive.
      </div>
      <a
        href="mailto:galacticomnivore@galacticomnivore.com"
        className="w-full flex justify-center"
      >
        <Button className="bg-white text-black p-4 mt-4 w-full lg:w-[200px] rounded-[0px]">
          Contact GO
        </Button>
      </a>
    </div>
  );
};

const SocialFooter = () => {
  return (
    <>
      <div className="flex gap-2 w-full justify-center my-8 sm:flex-row flex-wrap px-4">
        {socialMedia.map(
          (
            social,
            i // This uses the old socialMedia array
          ) => (
            <Link
              key={i}
              href={social.src}
              className="bg-gray-800 p-4 rounded-[0px]"
            >
              <div className="text-gray-500 hover:text-gray-300 transition-colors duration-300">
                {social.icon}
              </div>
            </Link>
          )
        )}
      </div>
      {/* Removed copyright text as it belongs in the main Footer.jsx */}
    </>
  );
};

const About = () => {
  return (
    <div
      id="about"
      className="relative scroll-mt-24 px-1 py-16 sm:px-6 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <h2 className="text-left text-3xl font-bold text-white sm:text-center sm:text-4xl">
          About Galactic Omnivore
        </h2>

        <div className="mt-8 space-y-7 text-left text-base leading-8 text-white/80 sm:text-center sm:text-lg lg:text-xl lg:leading-9">
          <p>
            Galactic Omnivore is an{" "}
            <strong className="font-semibold text-primary">
              independent nonprofit
            </strong>{" "}
            game-development community and platform based in Skopje and active
            across North Macedonia and beyond.
          </p>

          <p>
            GOHQ is our human ground station-a place where{" "}
            <strong className="font-semibold text-primary">
              useful signals become practical routes
            </strong>
            . We help creators learn game-development skills, find collaborators
            and suitable project roles, strengthen their portfolios, structure
            their work, and move ideas toward their{" "}
            <strong className="font-semibold text-primary">
              next playable milestone
            </strong>
            .
          </p>

          <p>
            We also support suitable projects through mentorship, visibility,
            publishing preparation, and pathways to relevant digital
            storefronts. Throughout the process, we protect{" "}
            <strong className="font-semibold text-primary">
              clear terms, proper credit, and fair collaboration
            </strong>
            .
          </p>
        </div>

        <figure className="mt-12 border-t border-white/10 pt-8">
          <figcaption className="text-left text-sm font-medium text-white/65 sm:text-center sm:text-base">
            Publishing and distribution pathways may include:
          </figcaption>
          <Image
            src={driveTruImg}
            width={1646}
            height={209}
            sizes="(max-width: 768px) calc(100vw - 48px), 768px"
            className="mx-auto mt-6 h-auto max-h-24 w-full max-w-3xl object-contain"
            alt="Steam, DriveThruRPG, and itch.io storefront logos"
          />
        </figure>
      </div>
    </div>
  );
};

const carouselData = [
  {
    title: "Glagolica 2.0",
    image: achievementImg2,
    text: "Read the linked project post to review its scope, current stage, credits, and any listed way to contribute.",
    link: "https://go-platform-eight.vercel.app/blog/macedonian-glagolitic-in-vr-immersive-letter-environments",
  },
  {
    title: "Print N'Play Games",
    image: achievementImg3,
    text: "Read the linked creator story for the work, project credits, and current context.",
    link: "https://go-platform-eight.vercel.app/blog/print-nplay-games-a-printable-games-brand-brewed-inside-the-community",
  },
  {
    title: "Human Rights Trivia Game",
    image: achievementImg1,
    text: "Open the linked project to review the current game information and creator credits.",
    link: "https://kikerkov.itch.io/navigator",
  },
  // {
  //   title: "Art & Design",
  //   image: heroImg,
  //   text: "Master the art of game visuals, including 2D and 3D asset creation, animation, and UI/UX design. Create stunning worlds that players will love to explore.",
  //   link: "#",
  // },
  // {
  //   title: "Programming",
  //   image: avatar1Img,
  //   text: "Dive deep into game programming with hands-on experience in popular engines and frameworks. Build the technical foundation you need for successful game development.",
  //   link: "#",
  // },
];

const CarouselItem = ({ title, image, text, link }) => {
  return (
    <div className="flex flex-col items-center p-4 bg-black border-2 border-white h-full">
      <div className="relative w-full mb-4" style={{ paddingTop: "56.25%" }}>
        {" "}
        {/* 56.25% = 9/16 * 100 */}
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="rounded-sm object-contain"
        />
      </div>
      <h3 className="text-2xl font-bold text-white mb-4 text-center">
        {title}
      </h3>
      <p className="text-white text-center mb-4">{text}</p>
      <div className="mt-auto">
        <a href={link} target="_blank" rel="noopener noreferrer">
          <Button className="bg-[#CA2280] text-white hover:bg-[#CA2280] rounded-[0px]">
            Learn more
          </Button>
        </a>
      </div>
    </div>
  );
};

const HomePage = () => {
  return (
    <div className="bg-black" id="home">
      <HeroSection />
      <SkillBanner />
      <PartnerBanner />
      <GoPillars />

      <section className="bg-black p-4 flex flex-col justify-center">
        <About />
      </section>

      <ExploreGo />

      <section className="relative">
        <div id="testimonials" className="absolute top-[-80px]"></div>
        <LandingTestimonials />
      </section>

      <section className="relative">
        <div id="discord" className="absolute top-[-80px]"></div>
        <LandingDiscordJoin />
      </section>

      <section className="relative">
        <div id="openhours" className="absolute top-[-80px]"></div>
        <LandingOpenHours />
      </section>

      <FullCTA />

      <PixelSectionDivider />
      <section
        id="newsletter"
        aria-labelledby="newsletter-heading-landing-page"
        className="bg-[#0a090a] px-4 py-14 text-white sm:px-6 sm:py-[72px] lg:py-24"
      >
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-primary/30 bg-[#151015] px-5 py-10 shadow-[0_0_80px_hsl(var(--primary)/0.08)] sm:px-10 sm:py-12 lg:px-16">
          <NewsletterSignup
            source="landing-page"
            variant="section"
            className="mx-auto w-full max-w-2xl text-center"
          />
        </div>
      </section>
    </div>
  );
};

export default HomePage;
