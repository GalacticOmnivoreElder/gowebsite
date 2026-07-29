"use client";
import React, { useEffect, useState } from "react";

// New Landing Components
import { HeroSection } from "@/components/landing/HeroSection";
import { SkillBanner } from "@/components/landing/SkillBanner";
import { FullCTA } from "@/components/landing/FullCTA";
import { PixelSectionDivider } from "@/components/landing/PixelSectionDivider";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { LandingOpenHours } from "@/components/landing/LandingOpenHours";
import { LandingDiscordJoin } from "@/components/landing/LandingDiscordJoin";
import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";

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

import edu1Img from "../../assets/EDUCATION.png";
import edu2Img from "../../assets/PORTFOLIO.png";
import edu3Img from "../../assets/OUTSOURCING.png";

import pixelUpImg from "../../assets/pixelup.png";

import driveTruImg from "../../assets/logosImg.png";

import transparentImg from "../../assets/transparent.png";

import Link from "next/link";
import Image from "next/image";
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitch,
  Twitter,
  Youtube,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ExploreGo } from "@/components/landing/ExploreGo";

const newsletterEnabled =
  process.env.NEXT_PUBLIC_NEWSLETTER_ENABLED === "true";

const practicalRoutes = [
  {
    title: "Learn",
    description: "Build practical skills with GO education and resources.",
    href: "/education",
  },
  {
    title: "Find a Project",
    description: "Explore approved projects and apply to suitable open roles.",
    href: "/projects",
  },
  {
    title: "Create a Project",
    description: "Business members can submit project needs for admin review.",
    href: "/project/create",
  },
  {
    title: "Join the Community",
    description: "Compare current membership options and community access.",
    href: "/membership",
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

const EduBox = ({ isFull, img, text, noImg }) => {
  return (
    <div
      className={`border-2 border-white bg-black flex ${
        isFull ? "w-full" : "w-[150px]"
      }
      ${noImg ? "p-4" : ""}
      h-[250px] md:h-[300px]
      `}
    >
      {!noImg && (
        <div className="flex-shrink-0 flex flex-col justify-center">
          <Image
            src={img}
            height={100}
            width={50}
            alt="Pillar Icon"
            className="h-full w-[30px] object-contain"
          />
        </div>
      )}
      <div
        className={`text-white flex flex-col w-full p-2 ${
          noImg ? "items-center text-center" : "justify-center"
        }`}
      >
        {text && <div className="text-white mb-4">{text}</div>}
      </div>
    </div>
  );
};

const EduBoxLarge = ({ title, jsx, img, noImg, buttonText, buttonLink }) => {
  return (
    <div className="flex flex-col bg-[#CA2380] p-4 sm:p-6 lg:p-8 justify-start items-center lg:w-1/3">
      <div className="text-3xl h-[70px] text-center mb-4 font-bold text-white sm:block hidden">
        {title}
      </div>
      <EduBox img={img} isFull text={jsx} noImg={noImg} />
      {buttonLink && buttonText && (
        <Button
          asChild
          className="bg-white text-black hover:bg-neutral-200 rounded-sm w-full mt-4"
        >
          <Link href={buttonLink}>{buttonText}</Link>
        </Button>
      )}
    </div>
  );
};

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
      <div className="text-4xl text-center mb-4 text-white">CONTACT US</div>
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
          CONTACT US!
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
    <div className="relative lg:my-16">
      <div id="about" className="absolute top-[-80px]"></div>
      <div className="text-4xl mb-8 text-center text-white">ABOUT</div>
      <div className="text-center mb-4 text-white lg:mx-[10%] lg:text-[22px]">
        Galactic Omnivore is{" "}
        <span className="text-primary">
          the only Game Dev. Community in Macedonia
        </span>{" "}
        where you can greet, meet and create your own game dev. team.{" "}
      </div>
      <div className="text-center mb-4 text-white lg:mx-[10%] lg:text-[22px]">
        We help in <span className="text-primary">teaching</span> new people{" "}
        <span className="text-primary">
          how to make games, build or expand their portfolio and structure their
          work.
        </span>{" "}
        We also help in <span className="text-primary">publishing games</span>{" "}
        to the world&apos;s most popular online stores.{" "}
      </div>
      <Image
        src={driveTruImg}
        width={1000}
        height={125}
        className="my-6 w-full max-w-3xl mx-auto h-auto object-contain"
        alt="Game distribution platforms like Steam, Itch.io, etc."
      />
    </div>
  );
};

const carouselData = [
  {
    title: "Glagolica 2.0",
    image: achievementImg2,
    text: "Curious about how you can be part of a groundbreaking VR project that brings the ancient Glagolitic script to life? We're inviting passionate creatives from all backgrounds to explore, collaborate, and shape immersive environments inspired by Macedonian heritage. If this sounds like something you'd love to contribute to, take a moment to dive into the details and register your interest—your journey starts here. Read more and apply.",
    link: "https://go-platform-eight.vercel.app/blog/macedonian-glagolitic-in-vr-immersive-letter-environments",
  },
  {
    title: "Print N'Play Games",
    image: achievementImg3,
    text: "Two years ago, game designer Andreja Popovik joined G.O. the local GameDev community, shifting from digital games to TTRPGs. He created the successful Kickstarter campaign within the Songs and Sagas, system leading to PrintN'Play's rise. Collaborations followed, including the tool Birthplace of Evil and the D&;D product Dezriel's Elemental Spellbook, showcasing community innovation in game development. Currently working on a Point & Click adventure with Monstergarden.",
    link: "https://go-platform-eight.vercel.app/blog/print-nplay-games-a-printable-games-brand-brewed-inside-the-community",
  },
  {
    title: "Human Rights Trivia Game",
    image: achievementImg1,
    text: "For Human Rights Day (December 10th), Galactic Omnivore, in collaboration with Europe House and the Macedonian Young Lawyers Association (MYLA), developed a trivia web game engaging thousands in an interactive learning experience. In just 14 days, it reached 48,332 unique plays, showcasing the power of gamification. Now available to play here, Navigator reflects our commitment to knowledge, evolution, and engagement.",
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
            LEARN MORE
          </Button>
        </a>
      </div>
    </div>
  );
};

const HomePage = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth <= 1024);
      }
    };

    if (typeof window !== "undefined") {
      handleResize();
      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  return (
    <div className="bg-black" id="home">
      <HeroSection />
      <SkillBanner />

      <section id="routes" className="border-y bg-background px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Four practical routes
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Choose what you want to do next
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {practicalRoutes.map((route) => (
              <article
                key={route.title}
                className="flex flex-col rounded-xl border bg-card p-5"
              >
                <h3 className="text-xl font-semibold">{route.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  {route.description}
                </p>
                <Button asChild variant="outline" className="mt-5 w-full">
                  <Link href={route.href}>Explore {route.title}</Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black p-4 flex flex-col justify-center">
        <About />
      </section>

      <div id="pillars" className="relative">
        <div className="absolute -top-20"></div>
      </div>
      <Image
        src={pixelUpImg}
        alt="pixel section divider"
        width={1920}
        height={100}
        className="w-full h-auto mb-[-1px]"
      />
      <div className="bg-[#CA2380]">
        <div className="container max-w-7xl mx-auto px-4 py-12 md:py-16 lg:py-20">
          <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-8 md:gap-12 lg:gap-8">
            <EduBoxLarge
              title="EDUCATION"
              noImg={!isMobile}
              img={edu1Img}
              jsx={
                <div className="text-center flex flex-col gap-2">
                  <div>As a community, we offer everyone an opportunity to</div>
                  <span className="text-primary">
                    become both students and mentors,
                  </span>
                  <div>
                    learning or sharing knowledge about game development.
                  </div>
                </div>
              }
              buttonText="See Education"
              buttonLink="/education"
            />
            <EduBoxLarge
              title="PORTFOLIO"
              img={edu2Img}
              noImg={!isMobile}
              jsx={
                <div className="text-center flex flex-col gap-2">
                  <div>Need help building your portfolio?</div>
                  <div>
                    We provide the know-how to{" "}
                    <span className="text-primary">
                      build, showcase, and present
                    </span>{" "}
                    your work effectively.
                  </div>
                  <div>
                    <span className="text-primary">Join</span> an existing
                    project or <span className="text-primary">start</span> your
                    own.
                  </div>
                </div>
              }
              buttonText="See Projects"
              buttonLink="/projects"
            />
            <EduBoxLarge
              title="BUSINESS"
              img={edu3Img}
              noImg={!isMobile}
              jsx={
                <div className="text-center flex flex-col gap-2">
                  <div>
                    Looking for your{" "}
                    <span className="text-primary">first job</span> or a
                    high-end <span className="text-primary">consultancy</span>{" "}
                    role?
                  </div>
                  <div>
                    We create{" "}
                    <span className="text-primary">B2B connections</span> and
                    provide{" "}
                    <span className="text-primary">work challenges</span> for
                    our community members.
                  </div>
                </div>
              }
              buttonText="Contact Us"
              buttonLink="/membership"
            />
          </div>
        </div>
      </div>

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

      {newsletterEnabled && (
        <>
          <PixelSectionDivider className="-my-px" />
          <section
            id="newsletter"
            className="bg-primary px-4 py-16 text-white sm:px-6 md:py-20"
          >
            <div className="mx-auto w-full max-w-7xl">
              <NewsletterSignup
                source="homepage"
                className="mx-auto w-full max-w-2xl text-center"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default HomePage;
