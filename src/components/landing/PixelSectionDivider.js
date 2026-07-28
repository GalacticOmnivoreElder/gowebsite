import Image from "next/image";
import pixelDownImg from "@/assets/pixeldown.png";
import pixelUpImg from "@/assets/pixelup.png";

export function PixelSectionDivider({ className = "" }) {
  const imageClasses =
    "block h-16 w-full object-fill sm:h-20 md:h-24 lg:h-28 [image-rendering:pixelated]";

  return (
    <div
      className={`overflow-hidden bg-black ${className}`}
      aria-hidden="true"
    >
      <Image
        src={pixelDownImg}
        alt=""
        sizes="100vw"
        className={imageClasses}
      />
      <Image
        src={pixelUpImg}
        alt=""
        sizes="100vw"
        className={`${imageClasses} -mt-px`}
      />
    </div>
  );
}
