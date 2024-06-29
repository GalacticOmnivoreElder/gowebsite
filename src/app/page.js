"use client";
import React, { useState } from "react";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import background1Img from "@/assets/background1.png";
import heroImg from "@/assets/hero1.png";
import avatar1Img from "@/assets/avatar1.png";

import joinusImg from "@/assets/joinus.png";
import discordImg from "@/assets/discord.png";

import edu1Img from "@/assets/EDUCATION.png";
import edu2Img from "@/assets/PORTFOLIO.png";
import edu3Img from "@/assets/OUTSOURCING.png";

import event1Img from "@/assets/event1.png";

import logoImg from "@/assets/logo.png";

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
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";

const CarouselSection = ({ sessions, title, description }) => {
  return (
    <div className="mb-8">
      <ScrollArea>
        <div className="flex gap-4"></div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
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

const PillarBox = ({ pillarData }) => {
  const { img, text, dot } = pillarData;
  return (
    <div className="flex flex-col p-4 h-full">
      <div className="flex flex-grow gap-4">
        <Image src={img} height={100} width={100} alt={text} />
        <div className="flex-grow">{text}</div>
      </div>
    </div>
  );
};

const Dot = ({ isActive }) => (
  <div
    className={`h-4 w-4  mx-1 ${
      isActive ? "bg-gray-800" : "border-2 border-gray-800"
    }`}
  ></div>
);

const EduBox = ({ isFull, img, text }) => {
  return (
    <div
      className={`border-2 border-white bg-black flex ${
        isFull ? "w-full" : "w-[150px]"
      }`}
    >
      <div className="flex-shrink-0 flex flex-col justify-center">
        <Image
          src={img}
          height={100}
          width={50}
          className="
        h-[250px] w-[30px]"
        ></Image>
      </div>
      <div className="ml-4 text-white flex flex-col justify-center">
        {text && <div>{text}</div>}
      </div>
    </div>
  );
};

const SwipeableSection = ({ slides, color = "#FF2768" }) => {
  const [activeSlide, setActiveSlide] = useState(0);

  const handleScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    const currentSlide = Math.round(scrollLeft / width);
    setActiveSlide(currentSlide);
  };

  const Slide = ({ children }) => (
    <div className="flex-none w-full md:w-1/4 snap-center h-[450px]">
      {children}
    </div>
  );

  return (
    <div className="relative overflow-hidden">
      <div
        className="flex overflow-x-auto md:overflow-x-hidden snap-x snap-mandatory"
        style={{ backgroundColor: color }}
        onScroll={handleScroll}
      >
        {slides.map((slide, index) => (
          <Slide key={index}>{slide.node}</Slide>
        ))}
      </div>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex justify-center items-center">
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((index) => (
            <Dot key={index} isActive={index === activeSlide} />
          ))}
        </div>
      </div>
    </div>
  );
};

const TestemonialCard = ({ img, fullName, role, text }) => {
  return (
    <div className="flex text-black gap-8">
      <div className="flex flex-col min-w-[35%]">
        <Image
          src={img}
          width={200}
          height={200}
          alt="Profile Image"
          className="w-[200px] h-[160px]"
        />
        <div className="text-[13px] font-bold">{fullName}</div>
        <div className="text-[10px] text-center">{role}</div>
      </div>
      <div>
        <div className="text-[14px] mb-4">{text}</div>
        <div className="flex justify-center items-center">
          <Button className="bg-black text-white rounded-sm hover:bg-gray-700">
            OUR GAMES
          </Button>
        </div>
      </div>
    </div>
  );
};

const EventCard = ({ title, instructor, date, location, image }) => {
  return (
    <div className="flex flex-col gap-2 bg-black">
      <div className="text-[24px] text-center">{title}</div>
      <div>
        <Image
          src={image}
          width={200}
          height={200}
          alt="Profile Image"
          className="w-[100%] h-[160px]"
        />
      </div>
      <div className="flex justify-between p-2">
        <div className=" text-center">{instructor}</div>
        <div className="flex gap-2">
          <div>{date}</div>
          <div>{location}</div>
        </div>
      </div>
    </div>
  );
};

const eventSlidesData = [
  {
    title: "ZINKA WORKSHOP # 3",
    instructor: "Andreja Popovik",
    date: "5 July, 19:00",
    location: "G.O. HQ ",
    image: event1Img,
  },
];

const eventSlides = [
  {
    node: (
      <div className="p-4 flex justify-center flex-col">
        <div className="text-3xl mb-4 text-center text-black">
          UPCOMING EVENTS:
        </div>
        <EventCard {...eventSlidesData[0]} />
        <div className="flex justify-center">
          <Button className="bg-black text-white rounded my-4 w-fit hover:bg-gray-700">
            BOOK YOUR SEAT
          </Button>
        </div>
      </div>
    ),
  },
];

const testemonialsData = [
  {
    img: avatar1Img,
    fullName: "Andreja Popovik",
    role: "Founder",
    text: "Galactic omnivore provided an already established community with talented people that eagerly awaited a challenge within the TTRPG genre and this is how PrintN’Play games was borne. ",
  },
  {
    img: avatar1Img,
    fullName: "Andreja Popovik",
    role: "Founder",
    text: "Galactic omnivore provided an already established community with talented people that eagerly awaited a challenge within the TTRPG genre and this is how PrintN’Play games was borne. ",
  },
  {
    img: avatar1Img,
    fullName: "Andreja Popovik",
    role: "Founder",
    text: "Galactic omnivore provided an already established community with talented people that eagerly awaited a challenge within the TTRPG genre and this is how PrintN’Play games was borne. ",
  },
  {
    img: avatar1Img,
    fullName: "Andreja Popovik",
    role: "Founder",
    text: "Galactic omnivore provided an already established community with talented people that eagerly awaited a challenge within the TTRPG genre and this is how PrintN’Play games was borne. ",
  },
];

const testemonialSlides = [
  {
    node: (
      <div className="p-4 flex justify-center flex-col">
        <div className="text-4xl mb-8 text-center text-black">
          TESTEMONIALS:
        </div>
        <TestemonialCard {...testemonialsData[0]} />
      </div>
    ),
  },
  {
    node: (
      <div className="p-4 flex justify-center flex-col">
        <div className="text-4xl mb-8 text-center text-black">
          TESTEMONIALS:
        </div>
        <TestemonialCard {...testemonialsData[1]} />
      </div>
    ),
  },
  {
    node: (
      <div className="p-4 flex justify-center flex-col">
        <div className="text-4xl mb-8 text-center text-black">
          TESTEMONIALS:
        </div>
        <TestemonialCard {...testemonialsData[2]} />
      </div>
    ),
  },
  {
    node: (
      <div className="p-4 flex justify-center flex-col">
        <div className="text-4xl mb-8 text-center text-black">
          TESTEMONIALS:
        </div>
        <TestemonialCard {...testemonialsData[3]} />
      </div>
    ),
  },
];

const pillarSlidesData = [
  {
    node: (
      <div className="p-4 flex justify-center flex-col">
        <div className="text-4xl mb-8 text-center text-black">WE PROVIDE:</div>
        <div className="flex gap-4">
          <EduBox img={edu1Img} />
          <EduBox img={edu2Img} />
          <EduBox img={edu3Img} />
        </div>
      </div>
    ),
  },
  {
    node: (
      <div className="p-4 flex justify-center flex-col">
        <div className="text-4xl mb-8 text-center text-black">WE PROVIDE:</div>
        <EduBox isFull img={edu1Img} />
      </div>
    ),
  },
  {
    node: (
      <div className="p-4 flex justify-center flex-col">
        <div className="text-4xl mb-8 text-center text-black">WE PROVIDE:</div>
        <EduBox isFull img={edu2Img} />
      </div>
    ),
  },
  {
    node: (
      <div className="p-4 flex justify-center flex-col">
        <div className="text-4xl mb-8 text-center text-black">WE PROVIDE:</div>
        <EduBox isFull img={edu3Img} />
      </div>
    ),
  },
];

const ContactBox = ({ image, title, description, jsx }) => {
  return (
    <div className="flex p-2 gap-2">
      <div>
        <Image src={image} width={200} height={200} alt={title}></Image>
      </div>
      <div className="flex flex-col gap-2">
        <div className="font-bold text-lg">{title}</div>
        <div className="text-gray-400 text-md">{description}</div>
        <div>{jsx}</div>
      </div>
    </div>
  );
};

const BackgroundBox = () => {
  return (
    <div className="relative h-[450px] w-full">
      <Image
        src={joinusImg}
        layout="fill"
        objectFit="cover"
        alt="Background Image"
      />
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <div className="text-4xl text-center my-8">OVER 200 OMNIVORES</div>
        <div className="my-4 text-center">
          From junior game developers to senior app developers who never made a
          game in their life, artists who want to switch to digital and writers
          who always wanted to write a game...everyone is welcome from any
          industry.{" "}
        </div>
        <Button className="bg-[#B1B1B1] text-gray-300 p-4">
          <Image
            src={discordImg}
            alt="discord"
            height="18"
            width="18"
            className="mr-1"
          />{" "}
          JOIN US
        </Button>
        <div className="my-4">
          Invites left: <span className="text-gray-600">00</span>0
        </div>
      </div>
    </div>
  );
};

const socialMedia = [
  {
    icon: <Facebook />,
    src: "https://www.facebook.com/profile.php?id=100088917386120",
  },
  { icon: <Twitter />, src: "https://twitter.com/GalcticOmnivore" },
  { icon: <Instagram />, src: "https://www.instagram.com/galacticomnivore/" },
  {
    icon: <Linkedin />,
    src: "https://www.linkedin.com/company/galactic-omnivore/",
  },

  { icon: <Youtube />, src: "https://www.youtube.com/@galacticomnivore" },
  { icon: <Twitch />, src: "https://www.twitch.tv/galactic_omnivore" },
  // { icon: Itchio, src: "https://galactic-omnivore.itch.io/" },
  // {
  //   icon: What,
  //   src: "https://api.whatsapp.com/send/?phone=%2B38970386917&text&type=phone_number&app_absent=0",
  // },
];

const HomePage = () => {
  return (
    <div className="" id="#home">
      <Header />

      <Image src={heroImg} alt="Hero Image" width={1920} height={1080} />

      {/* ABOUT */}
      <section className="bg-black p-4 flex flex-col justify-center">
        <div className="text-4xl mb-8 text-center">ABOUT</div>
        <div className="text-center mb-4">
          Galactic Omnivore is the only Game Dev. Community in North Macedonia
          where you can greet, meet and create your own game dev. team.{" "}
        </div>
        <div className="text-center mb-4">
          We help in <span className="text-[#EED75F]">teaching</span> new people
          how to make games, how to{" "}
          <span className="text-[#EED75F]">build a portfolio</span> and
          structure their work and how to{" "}
          <span className="text-[#EED75F]">publish games</span> to the world’s
          most popular online stores.{" "}
        </div>
      </section>

      <section>
        <SwipeableSection slides={pillarSlidesData} />
      </section>

      <section>
        <SwipeableSection slides={testemonialSlides} color="#CBEACD" />
      </section>

      <section>
        <SwipeableSection slides={eventSlides} color="#DBAE93" />
      </section>

      <section>
        <BackgroundBox />
      </section>

      <section>
        <div className="flex gap-2 w-full justify-center my-16 sm:flex-row flex-wrap px-4">
          {socialMedia.map((social, i) => (
            <Link href={social.src} className="bg-gray-800 rounded-full p-4">
              <div className="text-gray-500 hover:text-gray-300 transition-colors duration-300">
                {social.icon}
              </div>
            </Link>
          ))}
        </div>
        <div className="text-gray-400 w-full text-center mb-8">
          Copyright ©Galactic Omnivore 2024
        </div>
      </section>
    </div>
  );
};

export default HomePage;
