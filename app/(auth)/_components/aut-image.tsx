"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface AuthImageProps {
  className?: string;
}

const AUTH_IMAGES = [
  "/images/signin/auth1.webp",
  "/images/signin/auth2.webp",
  "/images/signin/auth4.webp",
  "/images/signin/auth5.webp",
  "/images/signin/auth6.webp",
  "/images/signin/auth7.webp",
];

export default function AuthImage({ className }: AuthImageProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (AUTH_IMAGES.length < 2) return;
    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % AUTH_IMAGES.length);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div
      className={`hidden md:block absolute inset-0 w-full h-full ${
        className || ""
      }`}
      aria-hidden="true"
    >
      {AUTH_IMAGES.length > 0 && (
        <Image
          src={AUTH_IMAGES[currentIndex]}
          alt="Authentication"
          priority={currentIndex === 0}
          width={760}
          height={1024}
          className="w-full h-full object-cover object-center"
        />
      )}
    </div>
  );
}
