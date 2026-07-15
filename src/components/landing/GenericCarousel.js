"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const GenericCarousel = ({
  slides,
  itemsPerViewDesktop = 3,
  itemsPerViewTablet = 2,
  itemsPerViewMobile = 1,
  backgroundColor = "transparent",
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
      let newItemsPerView = itemsPerViewDesktop;
      if (window.innerWidth < 768) {
        newItemsPerView = itemsPerViewMobile;
      } else if (window.innerWidth < 1024) {
        newItemsPerView = itemsPerViewTablet;
      }
      setItemsPerView(newItemsPerView);
      const maxIndex = Math.max(0, slides.length - newItemsPerView);
      if (currentIndex > maxIndex) {
        setCurrentIndex(maxIndex);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [
    slides.length,
    itemsPerViewDesktop,
    itemsPerViewTablet,
    itemsPerViewMobile,
    currentIndex,
  ]);

  const maxIndex = Math.max(0, slides.length - itemsPerView);

  const handleStart = (event) => {
    setIsDragging(true);
    setStartX(
      event.type === "mousedown" ? event.pageX : event.touches[0].clientX
    );
  };

  const handleMove = (event) => {
    if (!isDragging) return;
    const x =
      event.type === "mousemove" ? event.pageX : event.touches[0].clientX;
    setCurrentX(x - startX);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    const threshold = containerRef.current?.offsetWidth / itemsPerView / 2;

    let newIndex = currentIndex;
    if (Math.abs(currentX) > threshold) {
      if (currentX > 0 && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (currentX < 0 && currentIndex < maxIndex) {
        newIndex = currentIndex + 1;
      }
    }
    setCurrentIndex(newIndex);
    setIsDragging(false);
    setCurrentX(0);
  };

  const goToNext = () => {
    setCurrentIndex((previous) => Math.min(previous + 1, maxIndex));
  };

  const goToPrevious = () => {
    setCurrentIndex((previous) => Math.max(previous - 1, 0));
  };

  return (
    <div
      className={`${
        backgroundColor === "transparent" ? "" : `bg-[${backgroundColor}]`
      } ${className}`}
    >
      {title && (
        <div className="mb-12 pt-8 text-center text-4xl text-white">
          {title}
        </div>
      )}
      <div className="relative py-4">
        <div className="mx-auto max-w-7xl px-4">
          <div className="relative overflow-hidden">
            <div
              ref={containerRef}
              className="flex"
              style={{
                transform: `translateX(-${
                  (currentIndex * 100) / slides.length
                }%)`,
                width: `${(slides.length / itemsPerView) * 100}%`,
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
                  style={{ width: `${100 / slides.length}%` }}
                >
                  {slide}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              aria-label="Previous testimonials"
              className={`absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 transition-opacity duration-200 ${
                currentIndex === 0
                  ? "cursor-not-allowed opacity-30"
                  : "opacity-100 hover:bg-white/20"
              }`}
            >
              <ChevronLeft className="text-white" />
            </button>

            <button
              type="button"
              onClick={goToNext}
              disabled={currentIndex === maxIndex}
              aria-label="Next testimonials"
              className={`absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 transition-opacity duration-200 ${
                currentIndex === maxIndex
                  ? "cursor-not-allowed opacity-30"
                  : "opacity-100 hover:bg-white/20"
              }`}
            >
              <ChevronRight className="text-white" />
            </button>
          </div>

          <div className="mt-8 flex justify-center gap-2">
            {Array.from({
              length: Math.ceil(slides.length / itemsPerView),
            }).map((_, pageIndex) => (
              <button
                type="button"
                key={pageIndex}
                aria-label={`Show testimonial page ${pageIndex + 1}`}
                className={`h-3 w-3 rounded-sm transition-colors ${
                  currentIndex >= pageIndex * itemsPerView &&
                  currentIndex < (pageIndex + 1) * itemsPerView
                    ? "bg-white"
                    : "bg-white/30"
                }`}
                onClick={() =>
                  setCurrentIndex(Math.min(pageIndex * itemsPerView, maxIndex))
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
