import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const Settings = () => {
  const THEME_KEY = "vite-ui-theme";
  const [theme, setTheme] = useState("system");

  // Load theme from storage
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) || "system";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  // Apply Tailwind dark mode class
  const applyTheme = (mode) => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (mode === "dark" || (mode === "system" && prefersDark)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  // Handle theme change
  const handleChange = (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    applyTheme(newTheme);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-grow p-8">
        <h1 className="text-2xl font-semibold mb-6 border-b border-border pb-2">
          Settings
        </h1>

        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Theme Section */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <label htmlFor="theme" className="text-lg font-medium">
              Appearance
            </label>
            <select
              id="theme"
              value={theme}
              onChange={handleChange}
              className="px-4 py-2 rounded-md bg-card border border-border text-foreground 
                focus:ring-2 focus:ring-accent focus:outline-none transition-colors cursor-pointer"
            >
              <option value="system">System Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Settings;
