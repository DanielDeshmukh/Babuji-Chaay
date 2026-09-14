import React, { useEffect, useState } from "react";
import Logo from "../assets/Logo.png";

const SplashScreen = ({ message = "Restoring your session..." }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const enterTimer = setTimeout(() => setVisible(true), 100);

    return () => clearTimeout(enterTimer);
  }, []);

  return (
    <div
      className={`
        fixed inset-0 flex items-center justify-center bg-white
        transition-opacity duration-700 ease-out
        ${visible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <img
        src={Logo}
        alt="Splash Logo"
        className="w-60 h-60 rounded-full object-cover shadow-lg"
      />
      <p className="absolute bottom-16 text-sm font-medium text-muted-foreground">
        {message}
      </p>
    </div>
  );
};

export default SplashScreen;
