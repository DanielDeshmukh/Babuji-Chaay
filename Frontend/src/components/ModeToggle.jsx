// Frontend/src/components/ModeToggle.jsx

import { useTheme } from "../components/theme-provider";
import { FaMoon, FaSun } from "react-icons/fa";
import { useState, useEffect } from "react";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [isDark, setIsDark] = useState(theme === "dark");

  useEffect(() => {
    setIsDark(theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    setIsDark(!isDark);
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-5 right-5 w-14 h-8 flex items-center rounded-full 
                 bg-[#0b0b14] border border-[#64dcff50] hover:border-[#64dcff] 
                 transition-all duration-300 shadow-md"
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center 
                    transform transition-all duration-300
                    ${isDark ? "translate-x-7 bg-[#141421]" : "translate-x-1 bg-[#fafafa]"}`}
      >
        {isDark ? (
          <FaMoon className="text-[#afa4e9] text-sm" />
        ) : (
          <FaSun className="text-[#f7e592] text-sm" />
        )}
      </div>
    </button>
  );
}
