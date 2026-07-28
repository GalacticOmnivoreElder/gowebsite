import Image from "next/image";
import pixelDownImg from "@/assets/pixeldown.png";
import pixelUpImg from "@/assets/pixelup.png";

export function PixelSectionDivider({ className = "" }) {
  const imageClasses =
    "block h-[14.6vw] min-h-[3rem] w-full object-fill [image-rendering:pixelated]";

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
