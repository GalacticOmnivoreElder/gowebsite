"use client";
import React, { useEffect, useState } from "react";

// New Landing Components
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
  Search,
  Twitch,
  Twitter,
  Youtube,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ExploreGo } from "@/components/landing/ExploreGo";

const orbitRoutes = [
  {
    title: "Find a Project",
    signal: "Collaborate",
    icon: Search,
    description:
      "Browse approved game-development briefs and find a role that matches your skills and availability.",
    detail:
      "Review the project terms, current stage, and listed contribution routes before applying.",
    href: "/projects",
    cta: "Browse projects",
  },
  {
    title: "Create a Project",
    signal: "Launch",
    icon: FolderKanban,
    description:
      "Create a clear project brief, recruit collaborators, and manage a game-development team.",
    detail:
      "Project creation and team-management tools are included with GO Business.",
    href: "/membership?reason=creator",
    cta: "Review Business access",
  },
  {
    title: "Find a Mentor",
    signal: "Guidance",
    icon: Users,
    description:
      "Browse approved mentor profiles and request focused guidance when matching is enabled.",
    detail:
      "Completed engagements support private direct reviews and optional author-consented mentor references.",
    href: "/matchmaking",
    cta: "Explore matchmaking",
  },
  {
    title: "Learn",
    signal: "Develop",
    icon: BookOpen,
    description: "Build practical skills through current learning material and community knowledge.",
    detail: "Choose material that fits your role, current level, and next playable milestone.",
    href: "/education",
    cta: "Explore learning",
  },
  {
    title: "Video Bundles",
    signal: "Watch",
    icon: Clapperboard,
    description: "Follow focused video collections through eligible learning content.",
    detail: "Published availability, membership access, and progress are shown on each bundle without promising unavailable material.",
    href: "/video-bundles",
    cta: "Browse video bundles",
  },
  {
    title: "Community Resources",
    signal: "Connect",
    icon: PackageOpen,
    description: "Explore current resources, approved community asset packs, creator stories, games, and Discord.",
    detail: "Each resource route shows its published availability and any membership or account requirement.",
    href: "/resources",
    cta: "Explore resources",
  },
];

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

      <section
        id="orbits"
        aria-labelledby="orbits-heading"
        className="relative isolate overflow-hidden border-y border-primary/35 bg-[#a51561] px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_50%_-15%,rgba(255,255,255,0.2),transparent_34%),linear-gradient(135deg,rgba(48,5,31,0.16),rgba(202,34,128,0.18)_48%,rgba(35,4,24,0.28))]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-30 [background-image:radial-gradient(circle,rgba(255,255,255,0.75)_0.7px,transparent_0.8px),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:43px_43px,72px_72px,72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]"
        />

        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/75">
              Product routes through GO
            </p>
            <h2 id="orbits-heading" className="mt-3 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              Choose your next orbit
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              Find the project, guidance, learning, resources, or community
              route that fits your current mission.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-8">
            {orbitRoutes.map((orbit, index) => {
              const OrbitIcon = orbit.icon;

              return (
                <article
                  key={orbit.title}
                  className="group relative flex min-w-0 flex-col"
                >
                  <div className="mb-4 flex items-end justify-between px-1">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/60">
                        Route 0{index + 1} / {orbit.signal}
                      </span>
                      <h3 className="mt-1 text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
                        {orbit.title}
                      </h3>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/40 text-white shadow-[0_0_24px_rgba(255,255,255,0.12)] backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-1">
                      <OrbitIcon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>

                  <div className="relative flex min-h-[340px] flex-1 flex-col overflow-hidden border border-white/35 bg-[#080609]/95 p-6 shadow-[0_18px_55px_rgba(31,3,21,0.38),inset_0_1px_0_rgba(255,255,255,0.12)] sm:p-7">
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute left-0 top-10 h-24 w-px bg-gradient-to-b from-primary via-white/40 to-transparent"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute right-0 bottom-10 h-24 w-px bg-gradient-to-t from-primary via-white/40 to-transparent"
                    />
                    <div className="mb-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_rgba(202,34,128,0.9)]" />
                      Navigation channel online
                    </div>
                    <p className="text-lg font-medium leading-8 text-white">
                      {orbit.description}
                    </p>
                    <p className="mt-5 text-sm leading-6 text-white/65">
                      {orbit.detail}
                    </p>
                    <div
                      aria-hidden="true"
                      className="mt-auto flex items-center gap-2 pt-10"
                    >
                      <span className="h-px flex-1 bg-white/10" />
                      <span className="h-1.5 w-8 bg-primary/70" />
                      <span className="h-px w-8 bg-white/10" />
                    </div>
                  </div>

                  <Button
                    asChild
                    className="mt-3 h-12 w-full rounded-sm border border-white bg-white text-black shadow-[0_10px_28px_rgba(31,3,21,0.28)] hover:bg-neutral-100"
                  >
                    <Link href={orbit.href}>
                      {orbit.cta}
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

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
