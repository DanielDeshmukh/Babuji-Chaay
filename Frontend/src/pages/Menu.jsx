"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback
} from "react";
import supabase from "../lib/supabaseClient";
import Header from "../components/Header";
import PrintReceipt from "@/components/PrintReceipt";

/* -------------------------------------------------
   OFFER CALCULATOR (Memo-Friendly)
---------------------------------------------------*/
const calculateOfferDiscount = (billItems, offers) => {
  let totalDiscount = 0;
  const appliedOfferMap = new Map();

  for (const item of billItems) {
    let best = { discount: 0, name: null, id: null };

    const relevant = offers.filter((o) =>
      o.product_ids?.includes(item.product_id)
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

      const formatted =
        data?.todays_menu?.map((i) => ({
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
  FETCH SPECIAL NUMBER (LAST ENTRY)
  ---------------------------------------------------*/
  const fetchSpecialNumber = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("special_numbers")
        .select("number")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Special number error:", error);
        return;
      }

      if (data) {
        setTodaysSpecialNumber(data.number);
      }
    } catch (err) {
      console.error("Fetch special number failed:", err);
    }
  }, []);

  /* -------------------------------------------------
     BILL TOTAL (DERIVED)
  ---------------------------------------------------*/
  const billTotal = useMemo(() => {
    return billItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [billItems]);

  /* -------------------------------------------------
 FILTERED MENU (DERIVED)
---------------------------------------------------*/
  const filteredMenu = useMemo(
    () =>
      menuItems.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      ),
    [menuItems, search]
  );

  /* -------------------------------------------------
     BILL ITEM QUANTITY HELPER
  ---------------------------------------------------*/
  const getQuantity = useCallback(
    (menuItemId) =>
      billItems.find((b) => b.menu_item_id === menuItemId)?.quantity || 0,
    [billItems]
  );
  /* -------------------------------------------------
      SUGGESTED AMOUNTS FOR PAYMENT
    ---------------------------------------------------*/



  const suggestedAmounts = useMemo(() => {
    if (billTotal <= 0) return [];

    const roundUp = (n, step) => Math.ceil(n / step) * step;

    const next10 = roundUp(billTotal, 10);
    const next50 = roundUp(billTotal, 50);
    const next100 = roundUp(billTotal, 100);

    // remove duplicates & keep order
    return [...new Set([next10, next50, next100])];
  }, [billTotal]);






  /* -------------------------------------------------
     FETCH ACTIVE OFFERS
  ---------------------------------------------------*/
  const fetchActiveOffers = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const dow = new Date().getDay();

      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("is_active", true)
        .or(`end_date.is.null,end_date.gte.${today}`);

      if (error) throw error;

      const filtered = data.filter((offer) =>
        offer.is_recurring
          ? offer.day_of_week === dow
          : (!offer.start_date || offer.start_date <= today) &&
          (!offer.end_date || offer.end_date >= today)
      );

      setActiveOffers(filtered);
    } catch (err) {
      console.error(err);
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
          b.menu_item_id === item.id
            ? { ...b, quantity: b.quantity + 1 }
            : b
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
        : prev.map((b) =>
          b.menu_item_id === id ? { ...b, quantity: qty } : b
        )
    );
  }, []);

  const removeFromBill = useCallback(
    (id) => updateBillQuantity(id, 0),
    [updateBillQuantity]
  );

  /* -------------------------------------------------
     DERIVED TOTALS
  ---------------------------------------------------*/
  const subtotal = useMemo(
    () => billItems.reduce((s, i) => s + i.price * i.quantity, 0),
    [billItems]
  );

  const {
    totalOfferDiscount,
    appliedOfferNames
  } = useMemo(
    () => calculateOfferDiscount(billItems, activeOffers),
    [billItems, activeOffers]
  );

  const effectiveDiscount = specialDiscount
    ? subtotal
    : totalOfferDiscount;

  const finalTotal = Math.max(0, subtotal - effectiveDiscount);

  const receiptAppliedOffers = useMemo(() => {
    if (specialDiscount) return ["Special Number Discount"];
    return appliedOfferNames;
  }, [specialDiscount, appliedOfferNames]);

  const totalPaid = cashPaid + upiPaid;
  const pendingAmount = Math.max(0, finalTotal - totalPaid);
  const changeToGive =
    totalPaid > finalTotal ? totalPaid - finalTotal : 0;

  /* -------------------------------------------------
     PAYMENT
  ---------------------------------------------------*/
const handlePayment = async () => {
  if (!billItems.length) {
    alert("No items in the bill.");
    return;
  }

  try {
    // 1. AUTHENTICATION
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user) throw new Error("Authentication failed. Please log in again.");

    // 2. PREPARE TRANSACTION PAYLOAD
    const transactionPayload = {
      user_id: user.id,
      transaction_type: "SALE",
      total_amount: Number(finalTotal.toFixed(2)),
      discount: Number(effectiveDiscount.toFixed(2)),
      cash_paid: Number(cashPaid.toFixed(2)),
      upi_paid: Number(upiPaid.toFixed(2)),
    };

    console.log("🧾 INSERTING TRANSACTION...", transactionPayload);

    // 3. EXECUTE TRANSACTION INSERT
    const { data: sale, error: saleError } = await supabase
      .from("transactions")
      .insert(transactionPayload)
      .select()
      .single();

    if (saleError) {
      console.error("❌ TRANSACTION INSERT FAILED", saleError);
      throw new Error(`Transaction failed: ${saleError.message}`);
    }

    console.log("✅ TRANSACTION SUCCESS:", sale);
    setCurrentBillNumber(sale.daily_bill_no);

    // 4. PREPARE & INSERT TRANSACTION ITEMS
    const itemsPayload = billItems.map((item) => ({
      transaction_id: sale.id, 
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.price,
      item_type: "SALE",
      user_id: user.id,
    }));

    const { error: itemsError } = await supabase
      .from("transaction_items")
      .insert(itemsPayload);

    if (itemsError) {
      console.error("❌ ITEMS INSERT FAILED", itemsError);
      // We don't throw here to avoid blocking the UI since the main sale succeeded,
      // but in production, you might want to log this to an error tracking service.
    }

    // 5. EXTERNAL SYNC (DISABLED)
    // We are commenting this out because the DB Trigger handles 'daily_sales_summary'.
    // This prevents the 500 Internal Server Error you were seeing.
    /*
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-daily-summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ user_id: user.id, timestamp: new Date().toISOString() }),
    }).catch(e => console.warn("⚠️ Sync Edge Function ignored:", e));
    */

    // 6. TRIGGER PRINT JOB
    setPrintJob({
      type: "SALE",
      data: {
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
        discount: Number(effectiveDiscount) || 0,
        appliedOffers: receiptAppliedOffers, // Pass the offer names here
        cashPaid: Number(cashPaid) || 0,
        upiPaid: Number(upiPaid) || 0,
        total: Number(finalTotal) || 0,
      },
    });

    // 7. UI RESET
    // We clear billItems after a short delay to ensure the PrintJob state has captured the data
    setTimeout(() => {
      setBillItems([]);
      setShowBill(false);
      setCashPaid(0);
      setUpiPaid(0);
      setPendingCashInput("");
      setCurrentBillNumber(null);
    }, 500);

  } catch (err) {
    console.error("💥 PAYMENT PROCESS ERROR:", err);
    alert(err.message || "An unexpected error occurred during payment.");
  }
};

  /* -------------------------------------------------
     INIT
  ---------------------------------------------------*/
  useEffect(() => {
    fetchMenu();
    fetchSpecialNumber();
    fetchActiveOffers();
  }, []);

  /* -------------------------------------------------
     RENDER
  ---------------------------------------------------*/
  if (loading) return <p className="text-center mt-10">Loading menu...</p>;

  return (
    <div
      className={`min-h-screen flex flex-col bg-background transition-all ${isSpecialActive
        ? "animate-[pulse_2s_ease-in-out_infinite]"
        : ""
        }`}
    >
      <Header />

      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full pt-20">
        <h2 className="text-2xl font-bold text-center text-primary">
          Today’s Menu
        </h2>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu..."
          className="w-full p-3 my-6 rounded-lg border border-border bg-card"
        />

        {/* MENU GRID */}
        {filteredMenu.length === 0 ? (
          <p className="text-center text-foreground">
            Nothing found.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMenu.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-card border rounded-lg flex flex-col"
              >
                <h3 className="text-lg font-bold text-primary">
                  {item.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Stock: {item.quantity}
                </p>
                <p className="text-primary text-xl font-bold">
                  ₹{item.price}
                </p>

                <div className="flex items-center justify-between mt-3">
                  <button
                    className="bg-red-600 text-white w-10 h-10 rounded-full"
                    onClick={() =>
                      updateBillQuantity(
                        item.id,
                        getQuantity(item.id) - 1
                      )
                    }
                  >
                    -
                  </button>

                  <span className="font-bold text-primary">
                    {getQuantity(item.id)}
                  </span>

                  <button
                    className="bg-green-600 text-white w-10 h-10 rounded-full"
                    onClick={() => addToBill(item)}
                  >
                    +
                  </button>

                  <button
                    onClick={() => removeFromMenu(item.id)}
                    className="bg-red-700 text-white px-3 py-2 rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {billItems.length > 0 && (
          <button
            className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-6 py-3 rounded-xl shadow-lg"
            onClick={() => setShowBill(true)}
          >
            View Bill
          </button>
        )}

        {/* SIDEBAR BILL */}
        <div
          className={`
    fixed top-0 right-0 
    h-screen w-full 
    md:max-w-md 
    z-50
    bg-card text-card-foreground 
    shadow-xl p-6 
    transition-transform duration-300 
    flex flex-col 
    ${showBill ? "translate-x-0" : "translate-x-full"}
  `}
        >
          {/* CLOSE BUTTON */}
          <button
            className="text-red-600 dark:text-red-400 font-bold ml-auto mb-4"
            onClick={() => setShowBill(false)}
          >
            Close
          </button>

          {/* BILL TITLE */}
          <h2 className="text-2xl font-bold mb-2">Your Bill</h2>

          {currentBillNumber && (
            <p className="font-bold mb-4">Bill #{currentBillNumber}</p>
          )}

          {/* BILL ITEMS (scrollable, auto height) */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
            {billItems.map((item) => (
              <div
                key={item.menu_item_id}
                className="p-3 bg-background border border-border rounded-lg shadow-sm"
              >
                <div className="flex justify-between">
                  {/* NAME + PRICE */}
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{item.price} × {item.quantity}
                    </p>
                  </div>

                  {/* CONTROLS */}
                  <div className="flex items-center gap-2">
                    <button
                      className="bg-red-600 text-white w-8 h-8 rounded-full"
                      onClick={() =>
                        updateBillQuantity(item.menu_item_id, item.quantity - 1)
                      }
                    >
                      -
                    </button>

                    <span className="font-semibold">{item.quantity}</span>

                    <button
                      className="bg-green-700 text-white w-8 h-8 rounded-full"
                      onClick={() =>
                        updateBillQuantity(item.menu_item_id, item.quantity + 1)
                      }
                    >
                      +
                    </button>

                    <button
                      onClick={() => removeFromBill(item.menu_item_id)}
                      className="text-red-600 font-bold"
                    >
                      x
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* SUMMARY SECTION */}
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-lg font-semibold">
              Subtotal: ₹{subtotal.toFixed(2)}
            </p>

            {/* OFFER DISCOUNT */}
            {!specialDiscount && totalOfferDiscount > 0 && (
              <div className="mt-3 p-3 bg-green-700/10 border border-green-700 rounded-lg">
                <p className="text-green-700 font-bold">
                  Offer Discount: -₹{totalOfferDiscount.toFixed(2)}
                </p>
                <ul className="list-disc ml-4 text-sm mt-1 text-green-700">
                  {appliedOfferNames.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* SPECIAL DISCOUNT BANNER */}
            {specialDiscount && (
              <div className="p-3 bg-accent/20 border border-accent rounded-lg mt-3">
                <p className="text-accent font-bold text-lg animate-pulse">
                  🎉 Special Number Discount Applied! 🎉
                </p>
              </div>
            )}

            {/* FINAL TOTAL */}
            <p className="font-bold text-2xl mt-4">
              Final Total: ₹{finalTotal.toFixed(2)}
            </p>

            {/* SUGGESTED AMOUNTS */}
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestedAmounts.map((amt, i) => (
                <button
                  key={i}
                  onClick={() => setCashPaid(amt)}
                  className={`px-4 py-2 rounded-lg font-bold transition ${cashPaid === amt
                    ? "bg-green-600 text-white"
                    : "bg-primary text-primary-foreground"
                    }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            {/* PENDING AMOUNT */}
            {pendingAmount > 0 && (
              <div>
                <p className="text-red-600 font-bold mt-3">
                  Pending: ₹{pendingAmount.toFixed(2)}
                </p>

                <input
                  type="number"
                  className="p-2 w-full border border-border rounded my-2 bg-background"
                  placeholder="Enter amount"
                  value={pendingCashInput}
                  onChange={(e) => setPendingCashInput(e.target.value)}
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const val = Number(pendingCashInput);
                      if (!val) return;
                      setCashPaid(cashPaid + val);
                      setPendingCashInput("");
                    }}
                    className="bg-primary text-primary-foreground px-3 py-2 rounded-lg"
                  >
                    Pay Cash
                  </button>

                  <button
                    onClick={() => {
                      const val = Number(pendingCashInput);
                      if (!val) return;
                      setUpiPaid(upiPaid + val);
                      setPendingCashInput("");
                    }}
                    className="bg-green-700 text-white px-3 py-2 rounded-lg"
                  >
                    Pay UPI
                  </button>
                </div>
              </div>
            )}

            {/* CHANGE TO RETURN */}
            {changeToGive > 0 && (
              <p className="text-green-600 font-bold mt-2">
                Return ₹{changeToGive.toFixed(2)}
              </p>
            )}

            {/* COMPLETE PAYMENT */}
            <button
              onClick={handlePayment}
              disabled={pendingAmount > 0 || billItems.length === 0}
              className="mt-4 w-full bg-primary text-primary-foreground p-3 rounded-xl font-bold disabled:opacity-50"
            >
              Complete Payment
            </button>
          </div>
        </div>
        {printJob && (
          <PrintReceipt
            type={printJob.type}
            data={printJob.data}
            onClose={() => setPrintJob(null)}
          />
        )}



      </main>
    </div>
  );
};

export default Menu;
