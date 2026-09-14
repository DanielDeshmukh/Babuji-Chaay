"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen({
  message = "Restoring your session...",
}: {
  message?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const enterTimer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(enterTimer);
  }, []);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-white transition-opacity duration-700 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <Image
        src="/Logo.png"
        alt="Splash Logo"
        width={240}
        height={240}
        className="w-60 h-60 rounded-full object-cover shadow-lg"
        priority
      />
      <p className="absolute bottom-16 text-sm font-medium text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
