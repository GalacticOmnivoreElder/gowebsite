"use client";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import logoImg from "@/assets/logo.png";

export const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const LinkComp = ({ label, link, newPage, toggleMenu }) => {
    return (
      <a
        href={link}
        target={newPage ? "_blank" : "_self"}
        rel={newPage ? "noopener noreferrer" : ""}
        className="bg-black block px-4 py-2 lg:py-0 sm:px-3 lg:text-[14px]"
        onClick={toggleMenu}
      >
        {label}
      </a>
    );
  };

  const links = [
    {
      label: "HOME",
      link: "#home",
    },
    {
      label: "ABOUT",
      link: "#about",
    },
    {
      label: "GO PILLARS",
      link: "#pillars",
    },

    {
      label: "EVENTS",
      link: "#events",
    },

    {
      label: "OPEN HOURS",
      link: "#openhours",
    },
    {
      label: "JOIN DISCORD",
      link: "#discord",
    },
    {
      label: "TESTEMONIALS",
      link: "#testemonials",
    },
    {
      label: "CONTACT",
      link: "#contact",
    },
  ];

  return (
    <header className="sticky top-0 bg-black shadow-md z-50 bg-black">
      <div className="container mx-auto flex items-center justify-between p-4">
        <div>
          <Image src={logoImg} height={40} width={100} alt="Logo" />
        </div>
        <div className="flex items-center">
          <button onClick={toggleMenu} className="lg:hidden">
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <nav
            className={`flex-col ${
              menuOpen ? "flex" : "hidden"
            } absolute top-full left-0 w-full  lg:flex lg:flex-row lg:static lg:w-auto`}
          >
            {links.map((link, index) => (
              <LinkComp toggleMenu={toggleMenu} key={index} {...link} />
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};
