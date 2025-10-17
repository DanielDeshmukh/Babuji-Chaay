import React from "react";
import Header from "../components/Header";
import SpecialNumber from "../components/SpecialNumber";

const CreationPage = () => {
  return (
    <div className="min-h-screen bg-[#F8F5F0] flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-8 py-6 sm:py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1E4B2E] mb-6">
            Create Page
          </h1>

          {/* Component for creating special number */}
          <div className="bg-white shadow-lg rounded-2xl p-6 sm:p-8 border border-[#E5E7EB]">
            <SpecialNumber />
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreationPage;
