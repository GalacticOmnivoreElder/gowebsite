const OverlaySection = ({ image1, image2, image3 }) => {
  return (
    <div className="relative h-screen w-full">
      <div className="absolute inset-0">
        <Image
          src={image1}
          layout="fill"
          objectFit="cover"
          alt="Background Layer 1"
          className="opacity-100"
        />
      </div>
      <div className="absolute inset-0">
        <Image
          src={image2}
          layout="fill"
          objectFit="cover"
          alt="Background Layer 2"
          className="opacity-100"
        />
      </div>
      <div className="absolute inset-0">
        <Image
          src={image3}
          layout="fill"
          objectFit="cover"
          alt="Background Layer 3"
          className="opacity-100"
        />
      </div>
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="bg-gray-500 p-8">Your content here</div>
      </div>
    </div>
  );
};

export default OverlaySection;
