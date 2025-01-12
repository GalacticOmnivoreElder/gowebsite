"use client";
import React, { useEffect, useState } from "react";


import background1Img from "@/assets/background1.png";
import heroImg from "@/assets/hero1.png";
import avatar1Img from "@/assets/avatar1.png";
import avatar2Img from "@/assets/avatar2.png";
import avatar3Img from "@/assets/avatar3.png";
import avatar4Img from "@/assets/avatar4.gif";


import joinusImg from "@/assets/joinus.png";
import discordImg from "@/assets/discord.png";

import edu1Img from "@/assets/EDUCATION.png";
import edu2Img from "@/assets/PORTFOLIO.png";
import edu3Img from "@/assets/OUTSOURCING.png";

import pixelDownImg from "@/assets/pixeldown.png";
import pixelUpImg from "@/assets/pixelup.png";

import driveTruImg from "@/assets/drivetru.png";

import event1Img from "@/assets/event1.png";
import event2Img from "@/assets/event2.png";
import event3Img from "@/assets/event3.png";
import hqImg from "@/assets/openhours.png";
import transparentImg from "@/assets/transparent.png";

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

const magenta = "#CA2280";

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
          className=" h-full w-[30px]"
        ></Image>
      </div>
      <div className="text-white flex flex-col justify-start p-2">
        {text && <div className="text-white">{text}</div>}
      </div>
    </div>
  );
};

const EduBoxLarge = ({ title, jsx, img }) => {
  return (
    <div className="flex flex-col bg-[#CA2380] p-8 pt-4 justify-center items-center">
      <div className="text-[32px] text-center mb-4">{title}</div>
      <EduBox img={img} isFull text={jsx} />
    </div>
  );
};

const SwipeableSection = ({
  slides,
  slideType = "event",
  color = "#FF2768",
}) => {
  const [activeSlide, setActiveSlide] = useState(0);

  const handleScroll = (e) => {
    const scrollLeft = e.target.scrollLeft;
    const width = e.target.clientWidth;
    const currentSlide = Math.round(scrollLeft / width);
    setActiveSlide(currentSlide);
  };

  const Slide = ({ children }) => (
    <div className="flex-none w-full md:w-1/4 snap-center">{children}</div>
  );

  if (!slides.length && slideType == "event") {
    return (
      <div className="flex justify-center flex-col h-[350px]">
        <EventCard
          title=""
          instructor=""
          date=""
          location=""
          image={event1Img}
          hook="More events"
          cta="COMING SOON"
          noData
        />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div
        className="flex overflow-x-auto md:overflow-x-hidden snap-x snap-mandatory h-[50%]"
        // style={{ backgroundColor: color }}
        onScroll={handleScroll}
      >
        {slides.map((slide, index) => (
          <Slide key={index}>{slide.node}</Slide>
        ))}
      </div>
      {slides.length > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex justify-center items-center">
          <div className="flex gap-2">
            {Array.from({ length: slides.length }).map((_, index) => (
              <Dot key={index} isActive={index === activeSlide} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TestemonialCard = ({ img, fullName, role, text, link }) => {
  return (
    <div className="flex  bg-black gap-2">
      <div className="flex flex-col min-w-[35%]">
        <Image
          src={img}
          width={200}
          height={200}
          alt="Profile Image"
          className="w-[120px] h-[120px]"
        />
        <div className="text-[13px] text-white font-bold">{fullName}</div>
        <div className="text-[10px] text-white text-center">{role}</div>
      </div>
      <div>
        <div className="text-[12px] text-white px-4 pr-2 text-center mb-4">
          {text}
        </div>
        <div className="flex justify-center items-center">
          <Link href={link} target="_blank">
            <Button
              className={`bg-white  text-black rounded-sm hover:bg-[${magenta}] w-full `}
            >
              MORE
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

const EventCard = ({
  title,
  image,
  cta,
  link,
  noData,
}) => {
  return (
    <div
      className={`flex flex-col gap-2   ${
        noData ? `bg-[${magenta}] h-[360px]` : "bg-black h-[360px]"
      }`}
    >
      <div className="text-[24px] min-h-[28px] text-center">{title}</div>
      <div className="relative flex justify-center items-center">
        <Image
          src={image}
          width={1920}
          height={1080}
          alt="Profile Image"
          className="w-[220px] h-[220px]"
        />
      </div>
      <div className="flex justify-center p-2">
        <a href={link}>
          <Button className={`text-white bg-[#CA2280] hover:bg-[#CA2280]`}>
            {cta}
          </Button>
        </a>
      </div>
    </div>
  );
};

const eventSlidesData = [
  {
    title: "",
    date: "",
    location: "",
    image: event3Img,
    cta: "ENGAGE",
    link: "https://itch.io/jam/gogamejam2024",
  },
  {
    title: "MAKE YOUR TTRPG!",
    date: "",
    location: "",
    image: event1Img,
    cta: "ROLL THE DICE",
    link: "https://forms.gle/kGjR45M2FGczKHUw8",
  },
  {
    title: "LEARN ABOUT!",
    date: "",
    location: "",
    image: event2Img,
    hook: "",
    cta: "GAME OVER?",
    link: "https://forms.gle/uJCoqUCnoyNGyg6V7",
  },
];

const eventSlides = [
  {
    node: (
      <div className="flex justify-center flex-col h-[350px]">
        <EventCard {...eventSlidesData[0]} />
      </div>
    ),
  },
  {
    node: (
      <div className="flex justify-center flex-col h-[350px]">
        <EventCard {...eventSlidesData[1]} />
      </div>
    ),
  },
  {
    node: (
      <div className="flex justify-center flex-col h-[350px]">
        <EventCard {...eventSlidesData[2]} />
      </div>
    ),
  },
];

const testemonialsData = [
  {
    img: avatar1Img,
    fullName: "Ivan Kikerkov",
    role: "Founder",
    text: "I love making games every day, and that's why I founded Galactic Omnivore.",
    link: "https://kikerkov.itch.io/",
  },
  {
    img: avatar2Img,
    fullName: "Andreja Popovik",
    role: "Community Member",
    text: "Galactic omnivore provided an already established community with talented people that eagerly awaited a challenge within the TTRPG genre and this is how PrintN’Play games was borne. ",
    link: "https://linktr.ee/PrintNplay",
  },
  {
    img: avatar3Img,
    fullName: "Andrej Burovski ",
    role: "Community Member",
    text: "The game development community has been an exceptional source of inspiration and support, fueling my creativity and enhancing my skills. The collaborative environment and wealth of knowledge I've found here have made my journey in game development truly rewarding.",
    link: "https://k32n31-p4n1c.github.io/Index.html",
  },
  {
    img: avatar4Img,
    fullName: "ROGUE TANKS",
    role: "Product",
    text: "A roguelike inspired by old NES-era games with a modern design twist. Developed by Game Development Community Galactic Omnivore Skopje. Early Access Password 'rogueTanksBetaTesting'",
    link: "https://galactic-omnivore.itch.io/rogue-tanks",
  },
];

const testemonialSlides = [
  {
    node: (
      <div className="p-4 flex justify-center flex-col bg-black h-[300px]">
        <TestemonialCard {...testemonialsData[0]} />
      </div>
    ),
  },
  {
    node: (
      <div className="p-4 flex justify-center flex-col bg-black h-[300px]">
        <TestemonialCard {...testemonialsData[1]} />
      </div>
    ),
  },
  {
    node: (
      <div className="p-4 flex justify-center flex-col bg-black h-[300px]">
        <TestemonialCard {...testemonialsData[2]} />
      </div>
    ),
  },
  {
    node: (
      <div className="p-4 flex justify-center flex-col bg-black h-[300px]">
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
        <EduBox
          isFull
          img={edu1Img}
          text={<div>hellohellohellohellohello</div>}
        />
      </div>
    ),
  },
  {
    node: (
      <div className="p-4 flex justify-center flex-col">
        <div className="text-4xl mb-8 text-center text-black">WE PROVIDE:</div>
        <EduBox isFull img={edu2Img} text="hellohellohellohellohello" />
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

const DiscordJoin = () => {
  return (
    <div className="relative h-[450px] w-full">
      <Image
        src={joinusImg}
        layout="fill"
        objectFit="cover"
        alt="Background Image"
      />
      <div className="absolute inset-0 flex items-center justify-center flex-col p-4">
        <div className="text-4xl text-center my-4">OVER 250 OMNIVORES</div>
        <div className="mb-4 text-center">
          From junior game developers to senior app developers who never made a
          game in their life, artists who want to switch to digital and writers
          who always wanted to write a game...everyone is welcome from any
          industry.{" "}
        </div>
        <a href="https://discord.gg/ZbSShxu6K4" target="_blank" rel="noopener noreferrer" className="w-full">
          <Button className="w-full bg-[#c82484] text-white hover:bg-[#c82484]">
            <Image
              src={discordImg}
              alt="discord"
              height="18"
              width="18"
              className="mr-1"
            />{" "}
            JOIN US
          </Button>
        </a>
      </div>
    </div>
  );
};

const socialMedia = [
  {
    icon: <Facebook />,
    src: "https://www.facebook.com/profile.php?id=100088917386120",
  },
  { icon: <Twitter />,
    src: "https://twitter.com/GalacticOmnivor"},
  { 
    icon: <Instagram />,
     src: "https://www.instagram.com/galacticomnivore/"},
  {
    icon: <Linkedin />,
    src: "https://www.linkedin.com/company/galactic-omnivore/",
  },
  { 
    icon: <Youtube />, 
    src: "https://www.youtube.com/@galacticomnivore"},
  { 
    icon: <Twitch />,
    src: "https://www.twitch.tv/galactic_omnivore"},
];

const ContactUs = () => {
  return (
    <div className={`flex justify-center flex-col p-4 bg-[${magenta}]`}>
      <div className="text-4xl text-center mb-4">CONTACT US</div>
      <div className="text-center">
      Got a game idea, a unique skill set, or just want to connect with fellow game enthusiasts? 
      Reach out! Whether you're here to learn (Education), build your brand (Portfolio), or find
      project support (Outsourcing), our community is here to help you thrive.
      </div>
      <a href="mailto:galacticomnivore@gmail.com" className="w-full">
        <Button className="bg-white text-black p-4 mt-4 w-full">
          CONTACT US!
        </Button>
      </a>
    </div>
  );
};




const Newsletter = () => {
  return (
    <div className={`flex justify-center flex-col p-4 bg-[${magenta}]`}>
      <div className="text-4xl text-center mb-4">NEWSLETTER</div>
      <div className="text-center">
      Want exclusive insights, the latest updates, and new
      opportunities from the Galactic Omnivore community?
      </div>
      <a href="https://forms.gle/QGDQWhbRQGfc8YaY9" className="w-full">
        <Button className="bg-white text-black p-4 mt-4 w-full">
          SUBSCRIBE!
        </Button>
      </a>
    </div>
  );
};


// const CalendarButton = () => {
//   useEffect(() => {
//     const loadGoogleCalendarScript = () => {
//       if (
//         typeof window !== "undefined" &&
//         !document.getElementById("google-calendar-script")
//       ) {
//         const script = document.createElement("script");
//         script.id = "google-calendar-script";
//         script.src =
//           "https://calendar.google.com/calendar/scheduling-button-script.js";
//         script.async = true;
//         script.onload = () => {
//           const target = document.getElementById("calendar-scheduling-button");
//           if (window.calendar && window.calendar.schedulingButton) {
//             window.calendar.schedulingButton.load({
//               url: "https://calendar.google.com/calendar/appointments/schedules/AcZssZ3VDpBu45xKIza2MVgLs_P0lsiN6y7sCWbBpU5mBYOlulceCJawKoonMNvGBP2Paj3y1G0kD3_w?gv=true",
//               color: "#c82484",
//               label: "SCHEDULE A VISIT",
//               target,
//             });

//             const applyCustomStyles = () => {
//               const button = target.querySelector("button");
//               if (button) {
//                 button.style.width = "100%";
//                 button.style.fontFamily = orbitron.style.fontFamily;
//                 button.style.boxSizing = "border-box";
//                 button.style.display = "block";
//               }
//             };
//             applyCustomStyles();
//           } else {
//             console.error("Google Calendar schedulingButton is not available.");
//           }
//         };
//         script.onerror = () => {
//           console.error("Failed to load the Google Calendar script.");
//         };
//         document.body.appendChild(script);
//       }
//     };

//     const loadGoogleCalendarCSS = () => {
//       if (
//         typeof window !== "undefined" &&
//         !document.getElementById("google-calendar-css")
//       ) {
//         const link = document.createElement("link");
//         link.id = "google-calendar-css";
//         link.href =
//           "https://calendar.google.com/calendar/scheduling-button-script.css";
//         link.rel = "stylesheet";
//         link.onload = () => {
//           console.log("Google Calendar CSS loaded.");
//         };
//         link.onerror = () => {
//           console.error("Failed to load the Google Calendar CSS.");
//         };
//         document.head.appendChild(link);
//       }
//     };

//     // Only execute in the browser
//     if (typeof window !== "undefined") {
//       loadGoogleCalendarScript();
//       loadGoogleCalendarCSS();
//     }
//   }, []);

//   return <div id="calendar-scheduling-button"></div>;
// };

const HqOpenhours = () => {
  return (
    <div className="relative h-[450px] mb-8 w-full">
      <Image
        src={hqImg}
        layout="fill"
        objectFit="cover"
        alt="Background Image"
      />
      <Image
        src={transparentImg}
        layout="fill"
        objectFit="cover"
        alt="Transparent Image"
      />
      <div className="absolute inset-0 flex flex-col p-4 top-0">
        <div className="text-4xl text-center my-4">HQ OPEN HOURS:</div>
        <div className="mb-16 text-center">
          Located on the eleventh floor in the building next to the Macedonian
          Archbishop Cathedral, we have 60 square meters of game making
          community space with a cool view to stimulate the best game creation
          ideas.
        </div>

        <Link
          target="blank"
          className="w-full"
          href="https://calendar.app.google/H7Zwkwm81SMrbp7F9"
        >
          <Button className="w-full bg-[#c82484] text-white hover:bg-[#c82484]">
            SCHEDULE A VISIT
          </Button>
        </Link>
      </div>
    </div>
  );
};

const SocialFooter = () => {
  return (
    <>
      <div className="flex gap-2 w-full justify-center my-8 sm:flex-row flex-wrap px-4">
        {socialMedia.map((social, i) => (
          <Link href={social.src} className="bg-gray-800 rounded-full p-4">
            <div className="text-gray-500 hover:text-gray-300 transition-colors duration-300">
              {social.icon}
            </div>
          </Link>
        ))}
      </div>
      <div className="text-gray-400 w-full text-center mb-8">
        Copyright ©Galactic Omnivore 2025
      </div>
    </>
  );
};

const About = () => {
  return (
    <div className="relative">
      <div id="about" className="absolute top-[-80px]"></div>
      <div className="text-4xl mb-8 text-center">ABOUT</div>
      <div className="text-center mb-4">
        Galactic Omnivore is the only Game Dev. Community in North Macedonia
        where you can greet, meet and create your own game dev. team.{" "}
      </div>
      <div className="text-center mb-4">
        We help in <span className="text-[#EED75F]">teaching</span> new people
        how to make games, how to{" "}
        <span className="text-[#EED75F]">build a portfolio</span> and structure
        their work and how to{" "}
        <span className="text-[#EED75F]">publish games</span> to the world’s
        most popular online stores.{" "}
      </div>
      <Image
        src={driveTruImg}
        className="mb-4"
        alt="game shops"
        width={1920}
        height={1080}
      />
    </div>
  );
};

const HomePage = () => {
  return (
    <div className="bg-black" id="home">
      <Header />

      <a href="https://forms.gle/rbaowWxTUdJYVVpv5" target="_blank" rel="noopener noreferrer">  <Image src={heroImg} alt="Hero Image" width={1920} height={1920} /></a>

      <section className="bg-black p-4 flex flex-col justify-center">
        <About />
      </section>

      <Image
        id="pillars"
        src={pixelUpImg}
        alt="pixel section"
        width={1920}
        height={1080}
      />

      <EduBoxLarge
        title="EDUCATION"
        img={edu1Img}
        jsx={
          <div className="text-center flex flex-col gap-2">
            <div>As a community, we offer everyone an opportunity to</div>
            <span className="text-[#EED75F]">
              become both students and mentors.
            </span>
            <div>
              Regardless of their background, they can learn or share knowledge
              about :
            </div>
            <div>
              <span className="text-[#EED75F]">
                2D & 3D Art, Tech Art, Programming, Audio, Game Testing, Game
                Design, Game Production, Marketing, Biz Support, Data and
              </span>
            </div>
          </div>
        }
      />
      <EduBoxLarge
        title="PORTFOLIO"
        img={edu2Img}
        jsx={
          <div className="text-center flex flex-col gap-2">
            <div>
              Everyone needs to{" "}
              <span className="text-[#EED75F]">start somewhere</span>, but not
              everyone knows how.
            </div>

            <div>
              We have the know-how to help you{" "}
              <span className="text-[#EED75F]">
                build, showcase and present your portfolio.
              </span>
            </div>
            <div>
              <span className="text-[#EED75F]">Join</span> an existing project
              or <span className="text-[#EED75F]">start</span> your own and have
              others join you.
            </div>
          </div>
        }
      />
      <EduBoxLarge
        title="OUTSOURCING"
        img={edu3Img}
        jsx={
          <div className="text-center flex flex-col gap-2">
            <div>
              Looking for your <span className="text-[#EED75F]">first job</span>{" "}
              or looking for a high end{" "}
              <span className="text-[#EED75F]">consultancy</span> position?
            </div>

            <div>
              Sometimes we don’t even need to do anything to help you. By being
              surrounded with like-minded folks your opportunity will reach you.
            </div>
            <div>
              Otherwise, we create{" "}
              <span className="text-[#EED75F]">B2B connections</span> and
              provide <span className="text-[#EED75F]">work challenges</span> to{" "}
              those who seek it.
            </div>
          </div>
        }
      />

      {/* <section className="h-screen">
        <SwipeableSection slides={pillarSlidesData} />
      </section> */}

      <div className="flex justify-center bg-[#CA2380]">
        <div className="relative text-3xl mb-4 text-center text-white">
          <div id="events" className="absolute top-[-80px]"></div>
          UPCOMING EVENTS:
        </div>
      </div>

      <section className="">
        <SwipeableSection slides={eventSlides} color="#DBAE93" />
      </section>

      <Image
        src={pixelDownImg}
        alt="Background Image"
        width={1920}
        height={1080}
      />
      <div className="flex justify-center py-8">
        <div className="text-center text-4xl">WANT TO VISIT US?</div>
      </div>

      <section className="relative">
        <div id="openhours" className="absolute top-[-80px]"></div>
        <HqOpenhours />
      </section>

      <section className="relative">
        <div id="discord" className="absolute top-[-80px]"></div>
        <DiscordJoin />
      </section>

      <section className="bg-black">
        <div className="relative text-4xl my-8 text-center text-white bg-black">
          <div id="testemonials" className="absolute top-[-80px]"></div>
          TESTEMONIALS:
        </div>
        <SwipeableSection slides={testemonialSlides} />
      </section>

      <Image src={pixelUpImg} alt="pixel section" width={1920} height={1080} />

      <section className="relative">
        <div id="contact" className="absolute top-[-80px]"></div>
        <ContactUs />
      </section>

      <section className="relative">
        <div id="newsletter" className="absolute top-[-80px]"></div>
        <Newsletter/>
      </section>

      <Image
        src={pixelDownImg}
        alt="pixel section"
        width={1920}
        height={1080}
      />

      <section>
        <SocialFooter />
      </section>
    </div>
  );
};

export default HomePage;
