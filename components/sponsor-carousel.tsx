"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

const sponsors = [
  {
    src: "/luzdemarfil.jpeg",
    alt: "Luz de Marfil Pet Shop Vivero",
  },
  {
    src: "/golymorfi.jpeg",
    alt: "Gol y Morfi El Buffet",
  },
];

export function SponsorCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSponsor = sponsors[activeIndex];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current === sponsors.length - 1 ? 0 : current + 1));
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  function showPrevious() {
    setActiveIndex((current) => (current === 0 ? sponsors.length - 1 : current - 1));
  }

  function showNext() {
    setActiveIndex((current) => (current === sponsors.length - 1 ? 0 : current + 1));
  }

  return (
    <div className="space-y-4">
      <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white sm:h-72 lg:h-80">
        <Image
          key={activeSponsor.src}
          src={activeSponsor.src}
          alt={activeSponsor.alt}
          fill
          sizes="(min-width: 1024px) 1024px, calc(100vw - 48px)"
          className="object-contain p-3"
          priority={activeIndex === 0}
        />

        <button
          type="button"
          onClick={showPrevious}
          className="absolute left-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm ring-1 ring-gray-200 transition hover:bg-white"
          aria-label="Sponsor anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={showNext}
          className="absolute right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm ring-1 ring-gray-200 transition hover:bg-white"
          aria-label="Sponsor siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2">
        {sponsors.map((sponsor, index) => (
          <button
            key={sponsor.src}
            type="button"
            onClick={() => setActiveIndex(index)}
            className={`h-2.5 w-2.5 rounded-full transition ${
              index === activeIndex ? "bg-pitch" : "bg-gray-300 hover:bg-gray-400"
            }`}
            aria-label={`Ver ${sponsor.alt}`}
            aria-current={index === activeIndex ? "true" : undefined}
          />
        ))}
      </div>
    </div>
  );
}
