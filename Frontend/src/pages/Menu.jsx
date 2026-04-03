"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import Header from "../components/Header";
import PrintReceipt from "@/components/PrintReceipt";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const calculateOfferDiscount = (billItems, offers) => {
  let totalDiscount = 0;
  const appliedOfferMap = new Map();

  for (const item of billItems) {
    let best = { discount: 0, name: null, id: null };

    const relevant = offers.filter((offer) =>
      offer.product_ids?.map(String).includes(String(item.product_id))
    );

    for (const offer of relevant) {
      let discountAmount = 0;

      if (offer.discount_type === "percentage") {
        const pct = Number(offer.discount_value) || 0;
        discountAmount = (item.price * item.quantity * pct) / 100;
      }

      if (offer.discount_type === "bogo" && item.quantity >= 2) {
        const free = Math.floor(item.quantity / 2);
        discountAmount = free * item.price;
      }

      if (discountAmount > best.discount) {
        best = {
          discount: discountAmount,
          name: offer.name,
          id: offer.id,
        };
      }
    }

    if (best.discount > 0) {
      totalDiscount += best.discount;
      appliedOfferMap.set(best.id, best.name);
    }
  }

  return {
    totalOfferDiscount: totalDiscount,
    appliedOfferNames: Array.from(appliedOfferMap.values()),
    appliedOfferIds: Array.from(appliedOfferMap.keys()),
  };
};

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [printJob, setPrintJob] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [showBill, setShowBill] = useState(false);
  const [specialDiscount, setSpecialDiscount] = useState(false);
  const [cashPaid, setCashPaid] = useState(0);
  const [upiPaid, setUpiPaid] = useState(0);
  const [pendingCashInput, setPendingCashInput] = useState("");
  const [todaysSpecialNumber, setTodaysSpecialNumber] = useState(null);
  const [isSpecialActive, setIsSpecialActive] = useState(false);
  const [activeOffers, setActiveOffers] = useState([]);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-todays-menu");
      if (error) throw error;

      const formatted =
        data?.todays_menu?.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          name: item.name || "Unnamed Product",
          category: item.category || "Uncategorized",
          price: Number(item.price) || 0,
          quantity: item.quantity ?? 0,
          is_available: item.is_available ?? true,
        })) || [];

      setMenuItems(formatted);
    } catch (error) {
      console.error(error);
      alert("Menu fetch failed.");
    }
    setLoading(false);
  }, []);

  const fetchSpecialNumber = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("special_numbers")
        .select("number")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) setTodaysSpecialNumber(data.number);
    } catch (error) {
      console.error("Fetch special number failed:", error);
    }
  }, []);

  const fetchActiveOffers = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const dow = new Date().getDay();

      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;

      const filtered = data.filter((offer) =>
        offer.is_recurring
          ? offer.day_of_week === dow
          : (!offer.start_date || offer.start_date <= today) &&
            (!offer.end_date || offer.end_date >= today)
      );

      setActiveOffers(filtered);
    } catch (error) {
      console.error("Offer Fetch Error:", error);
    }
  }, []);

  const addToBill = useCallback((item) => {
    setBillItems((prev) => {
      const found = prev.find((billItem) => billItem.menu_item_id === item.id);
      if (found) {
        return prev.map((billItem) =>
          billItem.menu_item_id === item.id
            ? { ...billItem, quantity: billItem.quantity + 1 }
            : billItem
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  }, []);

  const updateBillQuantity = useCallback((id, qty) => {
    setBillItems((prev) =>
      qty <= 0
        ? prev.filter((billItem) => billItem.menu_item_id !== id)
        : prev.map((billItem) =>
            billItem.menu_item_id === id
              ? { ...billItem, quantity: qty }
              : billItem
          )
    );
  }, []);

  const subtotal = useMemo(
    () => billItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [billItems]
  );

  const { totalOfferDiscount, appliedOfferNames } = useMemo(
    () => calculateOfferDiscount(billItems, activeOffers),
    [billItems, activeOffers]
  );

  const effectiveDiscount = specialDiscount ? subtotal : totalOfferDiscount;
  const finalTotal = Math.max(0, subtotal - effectiveDiscount);
  const totalPaid = cashPaid + upiPaid;
  const pendingAmount = Math.max(0, finalTotal - totalPaid);
  const changeToGive = totalPaid > finalTotal ? totalPaid - finalTotal : 0;

  const getQuantity = useCallback(
    (menuItemId) =>
      billItems.find((billItem) => billItem.menu_item_id === menuItemId)
        ?.quantity || 0,
    [billItems]
  );

  const suggestedAmounts = useMemo(() => {
    if (finalTotal <= 0) return [];
    const roundUp = (n, step) => Math.ceil(n / step) * step;
    return [
      ...new Set([
        roundUp(finalTotal, 10),
        roundUp(finalTotal, 50),
        roundUp(finalTotal, 100),
      ]),
    ];
  }, [finalTotal]);

  const handlePayment = async () => {
    if (!billItems.length) return alert("No items in the bill.");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication failed.");

      const transactionPayload = {
        user_id: user.id,
        transaction_type: "SALE",
        total_amount: Number(finalTotal.toFixed(2)),
        discount: Number(effectiveDiscount.toFixed(2)),
        cash_paid: Number(cashPaid.toFixed(2)),
        upi_paid: Number(upiPaid.toFixed(2)),
      };

      const { data: sale, error: saleError } = await supabase
        .from("transactions")
        .insert(transactionPayload)
        .select()
        .single();

      if (saleError) throw saleError;

      const isWinner =
        Number(sale.daily_bill_no) === Number(todaysSpecialNumber);
      if (isWinner) {
        setIsSpecialActive(true);
        setSpecialDiscount(true);
      }

      await supabase.from("transaction_items").insert(
        billItems.map((item) => ({
          transaction_id: sale.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
          item_type: "SALE",
          user_id: user.id,
        }))
      );

      const receiptData = {
        shopName: "BABUJI CHAAY",
        billNo: sale.daily_bill_no,
        date: new Date().toLocaleString(),
        items: billItems.map((item) => ({
          qty: item.quantity,
          name: item.name,
          price: item.price,
          amt: item.price * item.quantity,
        })),
        subtotal,
        discount: isWinner ? subtotal : effectiveDiscount,
        appliedOffers: isWinner
          ? ["SPECIAL NUMBER FREE BILL"]
          : appliedOfferNames,
        cashPaid: isWinner ? 0 : cashPaid,
        upiPaid: isWinner ? 0 : upiPaid,
        total: isWinner ? 0 : finalTotal,
      };

      setPrintJob({
        type: "SALE",
        data: receiptData,
      });

      setTimeout(() => {
        setBillItems([]);
        setShowBill(false);
        setCashPaid(0);
        setUpiPaid(0);
        setSpecialDiscount(false);
        setIsSpecialActive(false);
        setPendingCashInput("");
      }, 2000);
    } catch (error) {
      console.error("Payment Error:", error);
      alert(error.message);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchSpecialNumber();
    fetchActiveOffers();
  }, [fetchMenu, fetchSpecialNumber, fetchActiveOffers]);

  const filteredMenu = useMemo(
    () =>
      menuItems.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      ),
    [menuItems, search]
  );

  if (loading) return <p className="mt-10 text-center">Loading menu...</p>;

  return (
    <div
      className={`min-h-screen bg-background text-foreground ${
        isSpecialActive ? "animate-pulse" : ""
      }`}
    >
      <Header />
      <main className="px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex max-w-screen-xl flex-col gap-4 lg:gap-6">
          <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-primary">Today&apos;s Menu</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quick billing with live offers and special-number logic
                </p>
              </div>
              <div className="w-full lg:max-w-md">
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search menu..."
                />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredMenu.map((item) => (
              <div
                key={item.id}
                className="flex flex-col rounded-3xl border border-border bg-card p-4 shadow-sm"
              >
                <h3 className="text-lg font-bold text-primary">{item.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Stock: {item.quantity}
                </p>
                <p className="mt-2 text-xl font-bold text-foreground">
                  Rs {item.price}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Button
                    variant="danger"
                    className="h-12 w-12 rounded-full p-0"
                    onClick={() =>
                      updateBillQuantity(item.id, getQuantity(item.id) - 1)
                    }
                  >
                    -
                  </Button>
                  <span className="font-bold text-primary">
                    {getQuantity(item.id)}
                  </span>
                  <Button
                    className="h-12 w-12 rounded-full p-0"
                    onClick={() => addToBill(item)}
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {billItems.length > 0 && (
            <div className="fixed bottom-6 right-6 z-40">
              <Button
                onClick={() => setShowBill(true)}
                className="px-6 shadow-lg"
              >
                View Bill ({billItems.length})
              </Button>
            </div>
          )}

          <div
            className={`fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-border bg-card p-6 shadow-xl transition-transform duration-300 ${
              showBill ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <Button
              variant="ghost"
              className="ml-auto w-auto px-4"
              onClick={() => setShowBill(false)}
            >
              Close
            </Button>
            <h2 className="mb-4 text-2xl font-bold text-primary">Your Bill</h2>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
              {billItems.map((item) => (
                <div
                  key={item.menu_item_id}
                  className="rounded-2xl border border-border bg-background p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Rs {item.price} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="danger"
                        className="h-12 w-12 rounded-full p-0"
                        onClick={() =>
                          updateBillQuantity(
                            item.menu_item_id,
                            item.quantity - 1
                          )
                        }
                      >
                        -
                      </Button>
                      <span className="font-semibold">{item.quantity}</span>
                      <Button
                        className="h-12 w-12 rounded-full p-0"
                        onClick={() =>
                          updateBillQuantity(
                            item.menu_item_id,
                            item.quantity + 1
                          )
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <p className="text-lg">Subtotal: Rs {subtotal.toFixed(2)}</p>

              {appliedOfferNames.length > 0 && !specialDiscount && (
                <div className="mt-2 rounded-2xl border border-border bg-background p-3">
                  <p className="mb-1 text-xs font-bold uppercase text-primary">
                    Applied Offers
                  </p>
                  {appliedOfferNames.map((name) => (
                    <p key={name} className="text-sm font-semibold">
                      {name}
                    </p>
                  ))}
                  <p className="mt-1 text-sm font-bold text-primary">
                    Discount: -Rs {totalOfferDiscount.toFixed(2)}
                  </p>
                </div>
              )}

              <p className="mt-2 text-2xl font-bold text-primary">
                Total: Rs {finalTotal.toFixed(2)}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setCashPaid(amount)}
                    className={`h-12 rounded-xl border px-4 font-bold ${
                      cashPaid === amount
                        ? "border-border bg-primary text-primary-foreground"
                        : "border-border bg-secondary text-secondary-foreground"
                    }`}
                  >
                    Rs {amount}
                  </button>
                ))}
              </div>

              {pendingAmount > 0 && (
                <div className="mt-4">
                  <p className="font-bold text-primary">
                    Pending: Rs {pendingAmount.toFixed(2)}
                  </p>
                  <Input
                    type="number"
                    className="my-2"
                    placeholder="Enter amount"
                    value={pendingCashInput}
                    onChange={(e) => setPendingCashInput(e.target.value)}
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      onClick={() => {
                        setCashPaid(cashPaid + Number(pendingCashInput));
                        setPendingCashInput("");
                      }}
                    >
                      Cash
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setUpiPaid(upiPaid + Number(pendingCashInput));
                        setPendingCashInput("");
                      }}
                    >
                      UPI
                    </Button>
                  </div>
                </div>
              )}

              {changeToGive > 0 && (
                <p className="mt-2 font-bold text-primary">
                  Return Rs {changeToGive.toFixed(2)}
                </p>
              )}

              <Button
                onClick={handlePayment}
                disabled={pendingAmount > 0 || billItems.length === 0}
                className="mt-4"
              >
                Complete Payment
              </Button>
            </div>
          </div>

          {printJob && (
            <PrintReceipt
              type={printJob.type}
              data={printJob.data}
              onClose={() => setPrintJob(null)}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Menu;
