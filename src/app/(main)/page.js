"use client";
import React, { useEffect, useState, useRef } from "react";


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

import pixelDownImg from "../../assets/pixeldown.png";
import pixelUpImg from "../../assets/pixelup.png";


import driveTruImg from "../../assets/logosImg.png";


import hqImg from "../../assets/openhours.png";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GameOfTheMonth } from "../membership/page";

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

const EduBox = ({ isFull, img, text, noImg, link }) => {
  return (
    <div
      className={`border-2 border-white bg-black flex ${
        isFull ? "w-full" : "w-[150px]"
      }`}
    >
      {!noImg && (
        <div className="flex-shrink-0 flex flex-col justify-center">
          <Image
            src={img}
            height={100}
            width={50}
            className=" h-full w-[30px]"
          ></Image>
        </div>
      )}
      <div className="text-white flex flex-col justify-start p-2 h-[350px] justify-center">
        {text && <div className="text-white">{text}</div>}
      </div>
    </div>
  );
};

const EduBoxLarge = ({ title, jsx, img, noImg }) => {
  return (
    <div className="flex flex-col bg-[#CA2380] p-8 pt-4 justify-center items-center lg:w-1/3">
      <div className="text-[32px] text-center mb-4 font-bold text-white">
        {title}
      </div>
      <EduBox img={img} isFull text={jsx} noImg={noImg} />
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
    <div className="flex-none max-w-[100vw] lg:w-1/4 snap-center">
      {children}
    </div>
  );

  // if (!slides.length && slideType == "event") {
  //   return (
  //     <div className="flex justify-center flex-col h-[350px]">
  //       <EventCard
  //         title=""
  //         instructor=""
  //         date=""
  //         location=""
  //         image={event1Img}
  //         hook="More events"
  //         cta="COMING SOON"
  //         noData
  //       />
  //     </div>
  //   );
  // }

  return (
    <div className="relative overflow-hidden">
      <div
        className="flex overflow-x-auto lg:overflow-x-hidden snap-x snap-mandatory h-full lg:h-[450px] items-center justify-center max-w-[100vw]"
        style={{ backgroundColor: color }}
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

const TestimonialCard = ({ img, fullName, role, text, link }) => {
  return (
    <div className="flex bg-black gap-2 flex-col items-center justify-center border-2 border-white">
      <div className="flex flex-col  h-[150px]">
        <Image
          src={img}
          width={200}
          height={200}
          alt="Profile Image"
          className="w-[120px] h-[120px] mt-4"
        />
        <div className="text-[13px] text-white font-bold">{fullName}</div>
        <div className="text-[10px] text-white text-center">{role}</div>
      </div>
      <div className="h-[120px] flex items-center">
        <div className="text-[12px] text-white px-4 pr-2 text-center">
          {text?.length > 160 ? `${text.slice(0, 160)}...` : text}
        </div>
      </div>
      <div className="flex justify-center items-center pb-4 w-full">
        <Link href={link || "#"} target="_blank">
          <Button
            className={`bg-white  text-black rounded-sm hover:bg-[${magenta}] w-full rounded-[0px] w-full`}
          >
            MORE
          </Button>
        </Link>
      </div>
    </div>
  );
};

// const EventCard = ({ title, image, cta, link, noData }) => {
//   return (
//     <div
//       className={`flex flex-col gap-2 border-2 border-white mx-2 justify-center w-full  ${
//         noData ? `bg-[${magenta}] h-[360px]` : "bg-black h-[360px]"
//       }`}
//     >
//       {/* <div className="text-[24px] min-h-[28px] text-center text-white">{title}</div> */}
//       <div className="relative flex justify-center items-center">
//         <div className="relative w-full mb-4" style={{ paddingTop: "56.25%" }}>
//           {" "}
//           {/* 56.25% = 9/16 * 100 */}
//           <Image
//             src={image}
//             alt={title}
//             layout="fill"
//             objectFit="contain"
//             className="rounded-sm"
//           />
//         </div>
//       </div>
//       <div className="flex justify-center p-2">
//         <a href={link || "#"}>
//           <Button
//             className={`text-white bg-[#CA2280] hover:bg-[#CA2280] w-[220px] rounded-[0px]`}
//           >
//             {cta}
//           </Button>
//         </a>
//       </div>
//     </div>
//   );
// };

// const eventSlidesData = [
//   {
//     title: "MAKE YOUR TTRPG!",
//     date: "",
//     location: "",
//     image: event1Img,
//     cta: "ROLL THE DICE",
//     link: "https://forms.gle/kGjR45M2FGczKHUw8",
//   },
//   {
//     title: "LEARN ABOUT!",
//     date: "",
//     location: "",
//     image: event2Img,
//     hook: "",
//     cta: "GAME OVER?",
//     link: "https://forms.gle/uJCoqUCnoyNGyg6V7",
//   },
// ];

// const eventSlides = eventSlidesData.map((item) => (
//   <div className="flex justify-center flex-col h-[350px]">
//     <EventCard {...item} />
//   </div>
// ));

const testimonialsData = [
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
    text: "Galactic omnivore provided an already established community with talented people that eagerly awaited a challenge within the TTRPG genre and this is how PrintN'Play games was borne. ",
    link: "https://linktr.ee/PrintNplay",
  },
  {
    img: avatar3Img,
    fullName: "Andrej Burovski ",
    role: "Community Member",
    text: "The game development community has been an exceptional source of inspiration and support, fueling my creativity and enhancing my skills. The collaborative environment and wealth of knowledge I've found here have made my journey in game development truly rewarding.",
    link: "https://k32n31-p4n1c.github.io/Index.html",
  },
];

const testimonialSlides = testimonialsData.map((item) => (
  <div className="flex justify-center flex-col bg-black">
    <TestimonialCard {...item} />
  </div>
));

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
          text={
            <div className="text-center flex flex-col gap-2">
              <div>As a community, we offer everyone an opportunity to</div>
              <span className="text-primary">
                become both students and mentors.
              </span>
              <div>They can learn or share knowledge about :</div>
              <div>
                <span className="text-primary">
                  2D & 3D Art, Tech Art, Programming, Audio, Game Testing, Game
                  Design, Game Production, Marketing, Biz Support, Data and
                </span>
              </div>
            </div>
          }
        />
      </div>
    ),
  },
  {
    node: (
      <div className="p-4 flex justify-center flex-col">
        <div className="text-4xl mb-8 text-center text-black">WE PROVIDE:</div>
        <EduBox
          isFull
          img={edu2Img}
          text={
            <div className="text-center flex flex-col gap-2">
              <div>
                Everyone needs to{" "}
                <span className="text-primary">start somewhere</span>, but not
                everyone knows how.
              </div>
              <div>
                We have the know-how to help you{" "}
                <span className="text-primary">
                  build, showcase and present your portfolio.
                </span>
              </div>
              <div>
                <span className="text-primary">Join</span> an existing project
                or <span className="text-primary">start</span> your own and
                have others join you.
              </div>
            </div>
          }
        />
      </div>
    ),
  },
  {
    node: (
      <div className="p-4 flex justify-center flex-col">
        <div className="text-4xl mb-8 text-center text-black">WE PROVIDE:</div>
        <EduBox
          isFull
          img={edu3Img}
          text={
            <div className="text-center flex flex-col gap-2">
              <div>
                Looking for your{" "}
                <span className="text-primary">first job</span> or looking for
                a high end <span className="text-primary">consultancy</span>{" "}
                position?
              </div>
              <div>
                Sometimes we don't even need to do anything to help you. By
                being surrounded with like-minded folks your opportunity will
                reach you.
              </div>
              <div>
                Otherwise, we create{" "}
                <span className="text-primary">B2B connections</span> and
                provide <span className="text-primary">work challenges</span>{" "}
                to those who seek it.
              </div>
            </div>
          }
        />
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
      <div className="absolute inset-0 flex items-center justify-center flex-col p-4 text-white">
        <div className="text-4xl text-center my-4">OVER 260 OMNIVORES</div>
        <div className="mb-4 text-center lg:mx-[10%]">
          From junior game developers to senior app developers who never made a
          game in their life, artists who want to switch to digital and writers
          who always wanted to write a game...everyone is welcome from any
          industry.{" "}
        </div>
        <a
          href="https://discord.gg/ZbSShxu6K4"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full lg:w-[200px] flex justify-center"
        >
          <Button className="w-full bg-[#c82484] text-white hover:bg-[#c82484] lg:w-[200px] mt-12 rounded-[0px]">
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
];

const ContactUs = () => {
  return (
    <div className={`flex justify-center flex-col p-4 bg-[${magenta}]`}>
      <div className="text-4xl text-center mb-4 text-white">CONTACT US</div>
      <div className="text-center lg:mx-[10%] text-white">
        Got a game idea, a unique skill set, or just want to connect with fellow
        game enthusiasts? Reach out! Whether you're here to learn (Education),
        build your brand (Portfolio), or find project support (Outsourcing), our
        community is here to help you thrive.
      </div>
      <a
        href="mailto:galacticomnivore@gmail.com"
        className="w-full flex justify-center"
      >
        <Button className="bg-white text-black p-4 mt-4 w-full lg:w-[200px] rounded-[0px]">
          CONTACT US!
        </Button>
      </a>
    </div>
  );
};

const Newsletter = () => {
  return (
    <div
      className={`flex justify-center flex-col p-4 pt-16 bg-[${magenta}] text-white`}
    >
      <div className="text-4xl text-center mb-4">NEWSLETTER</div>
      <div className="text-center lg:mx-[10%]">
        Want exclusive insights, the latest updates, and new opportunities from
        the Galactic Omnivore community?
      </div>
      <a
        href="https://forms.gle/QGDQWhbRQGfc8YaY9"
        className="w-full flex justify-center"
      >
        <Button className="bg-white text-black p-4 mt-4 w-full lg:w-[200px] rounded-[0px]">
          SUBSCRIBE!
        </Button>
      </a>
    </div>
  );
};

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
      <div className="absolute inset-0 flex flex-col p-4 top-0 text-white">
        <div className="text-4xl text-center my-4">WANT TO VISIT US?</div>
        <div className="text-4xl text-center mb-4">HQ OPEN HOURS:</div>
        <div className="mb-4 text-center lg:mx-[10%]">
          Located on the eleventh floor in the building next to the Macedonian
          Archbishop Cathedral, we have 60 square meters of game-making
          community space with a cool view to stimulate the best game creation
          ideas.
        </div>

        <div className="text-center text-lg font-semibold my-4">
          <p>Monday - Friday</p>
          <p>12:00 - 20:00</p>
        </div>

        <Link
          target="blank"
          className="w-full flex justify-center"
          href="https://calendar.app.google/H7Zwkwm81SMrbp7F9"
        >
          <Button className="w-full bg-[#c82484] text-white hover:bg-[#c82484] lg:w-[200px] rounded-[0px]">
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
          <Link href={social.src} className="bg-gray-800 p-4 rounded-[0px]">
            <div className="text-gray-500 hover:text-gray-300 transition-colors duration-300">
              {social.icon}
            </div>
          </Link>
        ))}
      </div>
      <div className="text-gray-400 w-full text-center pb-12">
        Copyright ©Galactic Omnivore 2025
      </div>
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
          the only Game Dev. Community in North Macedonia
        </span>{" "}
        where you can greet, meet and create your own game dev. team.{" "}
      </div>
      <div className="text-center mb-4 text-white lg:mx-[10%] lg:text-[22px]">
        We help in <span className="text-primary">teaching</span> new people{" "}
        <span className="text-primary">
          how to make games, build or expand their portfolio and structure their
          work.
        </span>{" "}
        We also help in <span className="text-primary">publishing games</span> to
        the world's most popular online stores.{" "}
      </div>
      <Image
        src={driveTruImg}
        className="my-6"
        alt="game shops"
        width={1920}
        height={1080}
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
    text: "Two years ago, game designer Andreja Popovik joined G.O. the local GameDev community, shifting from digital games to TTRPGs. He created the successful Kickstarter campaign within the Songs and Sagas, system leading to PrintN'Play's rise. Collaborations followed, including the tool Birthplace of Evil and the D&;D product Dezriel's Elemental Spellbook, showcasing community innovation in game development. Currently working on a Point & Click adventure with Monstergarden.",
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
          layout="fill"
          objectFit="contain"
          className="rounded-sm"
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

const achievementSlides = carouselData.map((item) => (
  <CarouselItem {...item} />
));

const GenericCarousel = ({
  slides,
  itemsPerViewDesktop = 3,
  itemsPerViewTablet = 2,
  itemsPerViewMobile = 1,
  backgroundColor = "#CA2280",
  title,
  className = "",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(itemsPerViewDesktop);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 600) {
        setItemsPerView(itemsPerViewMobile);
      } else if (window.innerWidth < 1000) {
        setItemsPerView(itemsPerViewTablet);
      } else {
        setItemsPerView(itemsPerViewDesktop);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [itemsPerViewDesktop, itemsPerViewTablet, itemsPerViewMobile]);

  const totalSlides = Math.ceil(slides.length / itemsPerView);

  const handleStart = (e) => {
    setIsDragging(true);
    setStartX(e.type === "mousedown" ? e.pageX : e.touches[0].clientX);
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    const x = e.type === "mousemove" ? e.pageX : e.touches[0].clientX;
    const walk = x - startX;
    setCurrentX(walk);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    const threshold = window.innerWidth / 4;
    if (Math.abs(currentX) > threshold) {
      if (currentX > 0 && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      } else if (currentX < 0 && currentIndex < totalSlides - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    }
    setIsDragging(false);
    setCurrentX(0);
  };

  return (
    <div
      className={`${
        backgroundColor ? `bg-[${backgroundColor}]` : ""
      } ${className}`}
    >
      {title && (
        <div className="text-4xl text-center text-white pt-8 mb-4">{title}</div>
      )}
      <div className="relative py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative overflow-hidden">
            <div
              ref={containerRef}
              className="flex touch-pan-y"
              style={{
                transform: `translateX(${
                  -currentIndex * (100 / itemsPerView) +
                  (isDragging
                    ? (currentX / containerRef.current?.offsetWidth) * 100
                    : 0)
                }%)`,
                transition: isDragging ? "none" : "transform 0.3s ease-out",
              }}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
            >
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 px-2"
                  style={{ width: `${100 / itemsPerView}%` }}
                >
                  {slide}
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                currentIndex > 0 && setCurrentIndex((prev) => prev - 1)
              }
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/10 p-2 rounded-full"
            >
              <ChevronLeft className="text-white" />
            </button>

            <button
              onClick={() =>
                currentIndex < totalSlides - 1 &&
                setCurrentIndex((prev) => prev + 1)
              }
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/10 p-2 rounded-full"
            >
              <ChevronRight className="text-white" />
            </button>
          </div>

          <div className="flex justify-center mt-4 gap-2">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-sm transition-colors ${
                  index === currentIndex ? "bg-white" : "bg-white/30"
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </div>
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
      <div className="sm:px-8 px-2">
        <GameOfTheMonth fromLanding={true} />
      </div>

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

      <div className="flex flex-col gap-4 justify-between pb-32 bg-[#CA2380] lg:flex-row lg:justify-center lg:items-start">
        <EduBoxLarge
          title="EDUCATION"
          noImg={!isMobile}
          img={edu1Img}
          jsx={
            <div className="text-center flex flex-col gap-2">
              <div>As a community, we offer everyone an opportunity to</div>
              <span className="text-primary">
                become both students and mentors.
              </span>
              <div>They can learn or share knowledge about :</div>
              <div>
                <span className="text-primary">
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
          noImg={!isMobile}
          jsx={
            <div className="text-center flex flex-col gap-2">
              <div>
                Everyone needs to{" "}
                <span className="text-primary">start somewhere</span>, but not
                everyone knows how.
              </div>
              <div>
                We have the know-how to help you{" "}
                <span className="text-primary">
                  build, showcase and present your portfolio.
                </span>
              </div>
              <div>
                <span className="text-primary">Join</span> an existing project
                or <span className="text-primary">start</span> your own and
                have others join you.
              </div>
            </div>
          }
        />
        <EduBoxLarge
          title="OUTSOURCING"
          img={edu3Img}
          noImg={!isMobile}
          jsx={
            <div className="text-center flex flex-col gap-2">
              <div>
                Looking for your{" "}
                <span className="text-primary">first job</span> or looking for
                a high end <span className="text-primary">consultancy</span>{" "}
                position?
              </div>
              <div>
                Sometimes we don't even need to do anything to help you. By
                being surrounded with like-minded folks your opportunity will
                reach you.
              </div>
              <div>
                Otherwise, we create{" "}
                <span className="text-primary">B2B connections</span> and
                provide <span className="text-primary">work challenges</span>{" "}
                to those who seek it.
              </div>
            </div>
          }
        />
      </div>

      <Image
        src={pixelDownImg}
        alt="Background Image"
        width={1920}
        height={1080}
      />

      <section className="relative">
        <div id="openhours" className="absolute top-[-80px]"></div>
        <HqOpenhours />
      </section>

      <section className="relative">
        <div id="discord" className="absolute top-[-80px]"></div>
        <DiscordJoin />
      </section>

      <section className="relative">
        <div id="testimonials" className="absolute top-[-80px]"></div>
        <div className="bg-black h-[600px] flex flex-col items-center">
          <GenericCarousel
            slides={testimonialSlides}
            title="TESTIMONIALS:"
            backgroundColor="transparent"
            className="h-full"
          />
        </div>
      </section>

      <Image src={pixelUpImg} alt="pixel section" width={1920} height={1080} />
    </div>
  );
};

export default HomePage;
