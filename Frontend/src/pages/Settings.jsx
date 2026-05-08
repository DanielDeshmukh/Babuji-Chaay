import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ExportData from "@/components/ExportData";

const Settings = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <Header />

      <main className="flex-grow p-8">
        <h1 className="text-2xl font-semibold mb-6 border-b border-border pb-2">
          Settings
        </h1>

        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <span className="text-lg font-medium">Appearance</span>
            <span className="px-4 py-2 rounded-md bg-card border border-border text-foreground">
              Dark Theme
            </span>
          </div>

          <ExportData />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Settings;
