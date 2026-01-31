"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import Header from "../components/Header";
import PrintReceipt from "@/components/PrintReceipt";

/* -------------------------------------------------
   OFFER CALCULATOR (Fixed for Type-Safety & Display)
---------------------------------------------------*/
const calculateOfferDiscount = (billItems, offers) => {
  let totalDiscount = 0;
  const appliedOfferMap = new Map();

  for (const item of billItems) {
    let best = { discount: 0, name: null, id: null };

    // FIX: Convert IDs to strings to ensure matching works regardless of DB type
    const relevant = offers.filter((o) =>
      o.product_ids?.map(String).includes(String(item.product_id))
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
          id: offer.id
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
    appliedOfferIds: Array.from(appliedOfferMap.keys())
  };
};

/* -------------------------------------------------
   MAIN COMPONENT
---------------------------------------------------*/
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

  const [currentBillNumber, setCurrentBillNumber] = useState(null);
  const [todaysSpecialNumber, setTodaysSpecialNumber] = useState(null);
  const [isSpecialActive, setIsSpecialActive] = useState(false);
  const [activeOffers, setActiveOffers] = useState([]);

  /* -------------------------------------------------
  FETCH MENU
  ---------------------------------------------------*/
  const fetchMenu = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-todays-menu");
      if (error) throw error;

      const formatted = data?.todays_menu?.map((i) => ({
        id: i.id,
        product_id: i.product_id,
        name: i.name || "Unnamed Product",
        category: i.category || "Uncategorized",
        price: Number(i.price) || 0,
        quantity: i.quantity ?? 0,
        is_available: i.is_available ?? true
      })) || [];

      setMenuItems(formatted);
    } catch (err) {
      console.error(err);
      alert("Menu fetch failed.");
    }
    setLoading(false);
  }, []);

  /* -------------------------------------------------
  FETCH SPECIAL NUMBER
  ---------------------------------------------------*/
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
    } catch (err) {
      console.error("Fetch special number failed:", err);
    }
  }, []);

  /* -------------------------------------------------
  FETCH ACTIVE OFFERS (Constraint: User ID & Dates)
  ---------------------------------------------------*/
  const fetchActiveOffers = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const dow = new Date().getDay();

      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("user_id", user.id) // Filter by User ID
        .eq("is_active", true);

      if (error) throw error;

      const filtered = data.filter((offer) =>
        offer.is_recurring
          ? offer.day_of_week === dow
          : (!offer.start_date || offer.start_date <= today) &&
            (!offer.end_date || offer.end_date >= today)
      );

      setActiveOffers(filtered);
    } catch (err) {
      console.error("Offer Fetch Error:", err);
    }
  }, []);

  /* -------------------------------------------------
     BILL LOGIC
  ---------------------------------------------------*/
  const addToBill = useCallback((item) => {
    setBillItems((prev) => {
      const found = prev.find((b) => b.menu_item_id === item.id);
      if (found) {
        return prev.map((b) =>
          b.menu_item_id === item.id ? { ...b, quantity: b.quantity + 1 } : b
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          quantity: 1
        }
      ];
    });
  }, []);

  const updateBillQuantity = useCallback((id, qty) => {
    setBillItems((prev) =>
      qty <= 0
        ? prev.filter((b) => b.menu_item_id !== id)
        : prev.map((b) => (b.menu_item_id === id ? { ...b, quantity: qty } : b))
    );
  }, []);

  const removeFromBill = useCallback((id) => updateBillQuantity(id, 0), [updateBillQuantity]);

  /* -------------------------------------------------
     DERIVED TOTALS
  ---------------------------------------------------*/
  const subtotal = useMemo(
    () => billItems.reduce((s, i) => s + i.price * i.quantity, 0),
    [billItems]
  );

  const { totalOfferDiscount, appliedOfferNames } = useMemo(
    () => calculateOfferDiscount(billItems, activeOffers),
    [billItems, activeOffers]
  );

  const billTotal = subtotal; // For suggested amounts logic
  const effectiveDiscount = specialDiscount ? subtotal : totalOfferDiscount;
  const finalTotal = Math.max(0, subtotal - effectiveDiscount);

  const totalPaid = cashPaid + upiPaid;
  const pendingAmount = Math.max(0, finalTotal - totalPaid);
  const changeToGive = totalPaid > finalTotal ? totalPaid - finalTotal : 0;

  const getQuantity = useCallback(
    (menuItemId) => billItems.find((b) => b.menu_item_id === menuItemId)?.quantity || 0,
    [billItems]
  );

  const suggestedAmounts = useMemo(() => {
    if (finalTotal <= 0) return [];
    const roundUp = (n, step) => Math.ceil(n / step) * step;
    return [...new Set([roundUp(finalTotal, 10), roundUp(finalTotal, 50), roundUp(finalTotal, 100)])];
  }, [finalTotal]);

 /* -------------------------------------------------
     PAYMENT PROCESS (Fixed for Data Integrity)
  ---------------------------------------------------*/
/* -------------------------------------------------
     PAYMENT PROCESS (Refactored for Print Integrity)
  ---------------------------------------------------*/
  const handlePayment = async () => {
    // 1. Validation: Prevent processing empty bills
    if (!billItems.length) return alert("No items in the bill.");

    try {
      // 2. Authentication: Ensure user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication failed.");

      // 3. Prepare Transaction: Map state to DB payload
      const transactionPayload = {
        user_id: user.id,
        transaction_type: "SALE",
        total_amount: Number(finalTotal.toFixed(2)),
        discount: Number(effectiveDiscount.toFixed(2)),
        cash_paid: Number(cashPaid.toFixed(2)),
        upi_paid: Number(upiPaid.toFixed(2)),
      };

      // 4. Save Transaction: Insert into Supabase
      const { data: sale, error: saleError } = await supabase
        .from("transactions")
        .insert(transactionPayload)
        .select()
        .single();

      if (saleError) throw saleError;

      // 5. Check for Special Number Match (Winner Logic)
      const isWinner = Number(sale.daily_bill_no) === Number(todaysSpecialNumber);
      if (isWinner) {
        setIsSpecialActive(true);
        setSpecialDiscount(true);
      }

      // 6. Save Transaction Items: Link products to sale record
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

      // 7. Data Integrity Fix: Capture data in a local constant.
      // Do not rely on React state variables (like printJob) immediately after setting them.
      const receiptData = {
        shopName: "BABUJI CHAAY",
        billNo: sale.daily_bill_no,
        date: new Date().toLocaleString(),
        items: billItems.map((b) => ({
          qty: b.quantity,
          name: b.name,
          price: b.price,
          amt: b.price * b.quantity,
        })),
        subtotal: subtotal,
        discount: isWinner ? subtotal : effectiveDiscount,
        appliedOffers: isWinner ? ["SPECIAL NUMBER FREE BILL"] : appliedOfferNames,
        cashPaid: isWinner ? 0 : cashPaid,
        upiPaid: isWinner ? 0 : upiPaid,
        total: isWinner ? 0 : finalTotal,
      };

      // 8. Trigger Print Job: Pass the local constant directly
      setPrintJob({
        type: "SALE",
        data: receiptData,
      });

      // 9. Debug Logging: Log the actual data being sent to the printer
      console.group("Print Job Initialized");
      console.log("Status: Success");
      console.log("Bill No:", receiptData.billNo);
      console.log("Receipt Data Object:", receiptData);
      console.groupEnd();

      // 10. Clean Up: Reset billing state after a delay.
      // 2000ms ensures the PrintReceipt component has finished rendering 
      // and the browser has captured the DOM before the data is cleared.
      setTimeout(() => {
        setBillItems([]);
        setShowBill(false);
        setCashPaid(0);
        setUpiPaid(0);
        setSpecialDiscount(false);
        setIsSpecialActive(false);
        setPendingCashInput("");
      }, 2000); 

    } catch (err) {
      console.error("Payment Error:", err);
      alert(err.message);
    }
  };
  useEffect(() => {
    fetchMenu();
    fetchSpecialNumber();
    fetchActiveOffers();
  }, [fetchMenu, fetchSpecialNumber, fetchActiveOffers]);

  const filteredMenu = useMemo(
    () => menuItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
    [menuItems, search]
  );

  if (loading) return <p className="text-center mt-10">Loading menu...</p>;

  return (
    <div className={`min-h-screen flex flex-col bg-background transition-all ${isSpecialActive ? "animate-pulse" : ""}`}>
      <Header />
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full pt-20">
        <h2 className="text-2xl font-bold text-center text-primary">Today’s Menu</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu..."
          className="w-full p-3 my-6 rounded-lg border border-border bg-card"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMenu.map((item) => (
            <div key={item.id} className="p-4 bg-card border rounded-lg flex flex-col shadow-sm">
              <h3 className="text-lg font-bold text-primary">{item.name}</h3>
              <p className="text-sm text-muted-foreground">Stock: {item.quantity}</p>
              <p className="text-primary text-xl font-bold">₹{item.price}</p>
              <div className="flex items-center justify-between mt-3">
                <button className="bg-red-600 text-white w-10 h-10 rounded-full" onClick={() => updateBillQuantity(item.id, getQuantity(item.id) - 1)}>-</button>
                <span className="font-bold text-primary">{getQuantity(item.id)}</span>
                <button className="bg-green-600 text-white w-10 h-10 rounded-full" onClick={() => addToBill(item)}>+</button>
              </div>
            </div>
          ))}
        </div>

        {billItems.length > 0 && (
          <button className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-6 py-3 rounded-xl shadow-lg z-40" onClick={() => setShowBill(true)}>
            View Bill ({billItems.length})
          </button>
        )}

        {/* SIDEBAR BILL */}
        <div className={`fixed top-0 right-0 h-screen w-full md:max-w-md z-50 bg-card shadow-xl p-6 transition-transform duration-300 flex flex-col ${showBill ? "translate-x-0" : "translate-x-full"}`}>
          <button className="text-red-600 font-bold ml-auto mb-4" onClick={() => setShowBill(false)}>Close</button>
          <h2 className="text-2xl font-bold mb-4">Your Bill</h2>

          <div className="flex-1 overflow-y-auto flex flex-col gap-3">
            {billItems.map((item) => (
              <div key={item.menu_item_id} className="p-3 bg-background border rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">₹{item.price} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="bg-red-600 text-white w-8 h-8 rounded-full" onClick={() => updateBillQuantity(item.menu_item_id, item.quantity - 1)}>-</button>
                    <span className="font-semibold">{item.quantity}</span>
                    <button className="bg-green-700 text-white w-8 h-8 rounded-full" onClick={() => updateBillQuantity(item.menu_item_id, item.quantity + 1)}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t pt-4">
            <p className="text-lg">Subtotal: ₹{subtotal.toFixed(2)}</p>
            
            {/* APPLIED OFFERS DISPLAY */}
            {appliedOfferNames.length > 0 && !specialDiscount && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-700">
                <p className="text-xs font-bold uppercase mb-1">Applied Offers:</p>
                {appliedOfferNames.map(name => <p key={name} className="text-sm font-semibold">• {name}</p>)}
                <p className="text-sm font-bold mt-1">Discount: -₹{totalOfferDiscount.toFixed(2)}</p>
              </div>
            )}

            <p className="font-bold text-2xl mt-2 text-primary">Total: ₹{finalTotal.toFixed(2)}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {suggestedAmounts.map((amt) => (
                <button key={amt} onClick={() => setCashPaid(amt)} className={`px-4 py-2 rounded-lg font-bold ${cashPaid === amt ? "bg-green-600 text-white" : "bg-secondary text-secondary-foreground border"}`}>₹{amt}</button>
              ))}
            </div>

            {pendingAmount > 0 && (
              <div className="mt-4">
                <p className="text-red-600 font-bold">Pending: ₹{pendingAmount.toFixed(2)}</p>
                <input type="number" className="p-2 w-full border rounded my-2 bg-background" placeholder="Enter amount" value={pendingCashInput} onChange={(e) => setPendingCashInput(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => { setCashPaid(cashPaid + Number(pendingCashInput)); setPendingCashInput(""); }} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg flex-1 font-bold">Cash</button>
                  <button onClick={() => { setUpiPaid(upiPaid + Number(pendingCashInput)); setPendingCashInput(""); }} className="bg-green-700 text-white px-3 py-2 rounded-lg flex-1 font-bold">UPI</button>
                </div>
              </div>
            )}

            {changeToGive > 0 && <p className="text-green-600 font-bold mt-2">Return ₹{changeToGive.toFixed(2)}</p>}

            <button onClick={handlePayment} disabled={pendingAmount > 0 || billItems.length === 0} className="mt-4 w-full bg-primary text-primary-foreground p-3 rounded-xl font-bold disabled:opacity-50">
              Complete Payment
            </button>
          </div>
        </div>
        {printJob && <PrintReceipt type={printJob.type} data={printJob.data} onClose={() => setPrintJob(null)} />}
      </main>
    </div>
  );
};

export default Menu;