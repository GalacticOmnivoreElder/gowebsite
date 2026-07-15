"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { GenericCarousel } from "@/components/landing/GenericCarousel";

// Import existing data or define it here
import avatar1Img from "@/assets/avatar1.png";
import avatar2Img from "@/assets/avatar2.png";
import avatar3Img from "@/assets/avatar3.png";

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
  // Added Dummy Data
  // {
  //   img: avatar1Img, // Placeholder image
  //   fullName: "Elena Petrova",
  //   role: "Aspiring Artist",
  //   text: "Joining GO helped me connect with programmers and designers. Now my art is actually in a game! The feedback loop is invaluable.",
  //   link: "#",
  // },
  // {
  //   img: avatar2Img, // Placeholder image
  //   fullName: "Marko Georgiev",
  //   role: "Hobbyist Developer",
  //   text: "I learned so much about Unity and project management through the community projects. It's great to build things together.",
  //   link: "#",
  // },
  // {
  //   img: avatar3Img, // Placeholder image
  //   fullName: "Ana Ivanova",
  //   role: "Student",
  //   text: "The mentorship here is amazing. I got help setting up my portfolio and learned practical skills I didn't get in class.",
  //   link: "#",
  // },
];

const LandingTestimonialCard = ({ img, fullName, role, text, link }) => {
  return (
    <Card className="bg-neutral-900 border-neutral-800 text-white h-full flex flex-col overflow-hidden rounded-sm">
      <CardHeader className="items-center pt-6">
        <Image
          src={img}
          width={100} // Adjusted size
          height={100}
          alt={`Image of ${fullName}`}
          className="rounded-full border-2 border-primary mb-2"
        />
        <div className="text-center">
          <h3 className="text-lg font-semibold">{fullName}</h3>
          <p className="text-sm text-primary">{role}</p>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground text-center italic px-2">
          &ldquo;{text?.length > 150 ? `${text.slice(0, 150)}...` : text}&rdquo;
        </p>
      </CardContent>
      <CardFooter className="justify-center pb-6">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border-primary text-primary hover:bg-primary/10 hover:text-primary rounded-sm"
        >
          <Link href={link || "#"} target="_blank">
            More
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

const testimonialSlides = testimonialsData.map((item, i) => (
  <LandingTestimonialCard key={i} {...item} />
));

export const LandingTestimonials = () => {
  // Check if GenericCarousel is available, otherwise show static cards
  // For simplicity, assuming GenericCarousel is available and imported
  // Note: GenericCarousel might need slight adjustments to work outside page.js if it relied on state defined there.
  // If GenericCarousel is NOT exported or relies on HomePage state, this needs rework.

  if (typeof GenericCarousel === "undefined") {
    console.warn(
      "GenericCarousel component not found for LandingTestimonials."
    );
    // Fallback: Render first few testimonials statically?
    return (
      <section className="bg-black py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">
          What Our Community Says
        </h2>
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
          {testimonialsData.slice(0, 3).map((item, i) => (
            <LandingTestimonialCard key={i} {...item} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <GenericCarousel
      slides={testimonialSlides}
      title="What Our Community Says" // Changed title slightly
      backgroundColor="transparent" // Carousel itself is transparent, section bg is black
      className="bg-black py-16" // Added bg-black and padding here
      itemsPerViewDesktop={3}
      itemsPerViewTablet={2}
      itemsPerViewMobile={1}
    />
  );
};
