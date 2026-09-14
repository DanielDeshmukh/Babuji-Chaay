"use client";

import Header from "@/components/Header";
import SpecialNumber from "@/components/SpecialNumber";
import InventoryManager from "@/components/InventoryManager";
import OfferManager from "@/components/OfferManager";
import RefundComponent from "@/components/RefundComponent";

export default function CreatePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 px-4 sm:px-8 py-6 sm:py-10">
        <div className="max-w-5xl mx-auto">
          <div className="bg-card shadow-lg my-1 rounded-2xl p-6 sm:p-8 border border-border">
            <SpecialNumber />
          </div>

          <div className="bg-card shadow-lg rounded-2xl my-1 p-6 sm:p-8 border border-border">
            <InventoryManager />
          </div>

          <div className="bg-card shadow-lg rounded-2xl my-1 p-6 sm:p-8 border border-border">
            <OfferManager />
          </div>

          <div className="bg-card shadow-lg rounded-2xl my-1 p-6 sm:p-8 border border-border">
            <RefundComponent />
          </div>
        </div>
      </main>
    </div>
  );
}
