import React from "react";
import Header from "../components/Header";
import SpecialNumber from "../components/SpecialNumber";
import InventoryManager from "@/components/InventoryManager";
import OfferManager from "@/components/OfferManager";
import RefundComponent from "@/components/RefundComponent";

const CreationPage = () => {
  return (
    <div className="min-h-screen bg-[#F8F5F0] flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-8 py-6 sm:py-10">
        <div className="max-w-5xl mx-auto">
          
          {/* Component for creating special number */}
          <div className="bg-white shadow-lg my-1 rounded-2xl p-6 sm:p-8 border-[#E5E7EB]">
            <SpecialNumber />
          </div>

          {/* Inventory Manager */}
          <div className="bg-white shadow-lg rounded-2xl my-1 p-6 sm:p-8 border-[#E5E7EB]">
            <InventoryManager />
          </div>

          {/* Offer Manager */}
          <div className="bg-white shadow-lg rounded-2xl my-1 p-6 sm:p-8 border-[#E5E7EB]">
            <OfferManager />
          </div>

          {/* Refund Component */}
          <div className="bg-white shadow-lg rounded-2xl my-1 p-6 sm:p-8 border-[#E5E7EB]">
            <RefundComponent />
          </div>

        </div>
      </main>
    </div>
  );
};

export default CreationPage;
