import React from "react";
import Header from "../components/Header";
import SpecialNumber from "../components/SpecialNumber";
import InventoryManager from "@/components/InventoryManager";
import OfferManager from "@/components/OfferManager";
import RefundComponent from "@/components/RefundComponent";

const shellCardClassName =
  "min-w-0 rounded-3xl border border-white/10 bg-slate-950/55 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-4 lg:p-6";

const CreationPage = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_transparent_28%),linear-gradient(180deg,_#03120d_0%,_#081b14_48%,_#03100d_100%)] text-amber-50">
      <Header />

      <main className="flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:gap-5 lg:gap-6">
          <section className={shellCardClassName}>
            <SpecialNumber />
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-start">
            <section className={shellCardClassName}>
              <InventoryManager />
            </section>

            <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
              <section className={shellCardClassName}>
                <OfferManager />
              </section>

              <section className={shellCardClassName}>
                <RefundComponent />
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreationPage;
