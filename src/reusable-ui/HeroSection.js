import { Button } from "@/components/ui/button";
import Image from "next/image";

const HeroSection = ({ logo, bgImg }) => {
  return (
    <div
      style={{
        backgroundImage: `url(${bgImg})`,
        height: "200px",
        backgroundPosition: "center",
      }}
      className="flex justify-center items-center relative"
    >
      <Image src={logo} alt="title" width={200} height={200} />

      <a
        href="https://www.notion.so/dekimage/Dejan-Gavrilovic-Portfolio-Creative-4956513c17e44608baa428aa259fb83a?pvs=4"
        target="_blank"
      >
        <Button className="absolute top-[20px] right-[20px]">Tasks</Button>
      </a>
    </div>
  );
};

export default HeroSection;
