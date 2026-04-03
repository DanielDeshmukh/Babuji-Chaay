import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ExportData from "@/components/ExportData";

const Settings = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <Header />

      <main className="flex-grow px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex max-w-screen-xl flex-col gap-4 lg:gap-6">
          <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h1 className="border-b border-border pb-2 text-2xl font-semibold text-primary">
              Settings
            </h1>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mx-auto max-w-3xl">
              <ExportData />
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Settings;
