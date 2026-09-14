import React from "react";
import { SlCup } from "react-icons/sl";
import { CiCoffeeCup, CiFries } from "react-icons/ci";
import { PiHamburgerBold } from "react-icons/pi";
import { VscCoffee } from "react-icons/vsc";

const Background = () => {
  const iconList = [
    <SlCup key="cup" />,
    <CiCoffeeCup key="coffee1" />,
    <PiHamburgerBold key="burger" />,
    <CiFries key="fries" />,
    <VscCoffee key="coffee2" />,
  ];

  const randomIcons = Array.from({ length: 25 }).map((_, index) => {
    const Icon = iconList[Math.floor(Math.random() * iconList.length)];
    return (
      <div
        key={index}
        style={{
          position: "absolute",
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          color: "#FFD700", 
          fontSize: `${40 + Math.random() * 70}px`,
          opacity: 0.85,
          transform: `rotate(${Math.random() * 360}deg)`,
          textShadow: "0px 0px 10px rgba(255, 215, 0, 0.6)", 
          pointerEvents: "none", 
          userSelect: "none",
        }}
      >
        {Icon}
      </div>
    );
  });

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: "100vw",
        backgroundColor: "#1B3A2A", 
        overflow: "hidden",
        zIndex: -1,
      }}
    >
      {randomIcons}
    </div>
  );
};

export default Background;
