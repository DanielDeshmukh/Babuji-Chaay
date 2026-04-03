import React from "react";
import Header from "../components/Header";
import SpecialNumber from "../components/SpecialNumber";
import InventoryManager from "@/components/InventoryManager";
import OfferManager from "@/components/OfferManager";
import RefundComponent from "@/components/RefundComponent";

const shellCardClassName =
  "min-w-0 rounded-3xl border border-border bg-card p-3 shadow-sm sm:p-4 lg:p-6";

const CreationPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex max-w-screen-xl flex-col gap-4 lg:gap-6">
          <section className={shellCardClassName}>
            <SpecialNumber />
          </section>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
            <section className={`${shellCardClassName} flex-1`}>
              <InventoryManager />
            </section>

            <div className="flex w-full flex-col gap-4 lg:min-w-0 lg:basis-[42%]">
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
