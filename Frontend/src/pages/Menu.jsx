"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback
} from "react";
import supabase from "../lib/supabaseClient";
import Header from "../components/Header";

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
     FETCH MENU (EDGE FUNC)
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
  console.log("Menu items:", menuItems);

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
     BILL / MENU LOGIC
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

  const removeFromMenu = async (menuId) => {
    try {
      const { error } = await supabase.functions.invoke("remove-menu", {
        body: { id: menuId }
      });
      if (error) throw error;
      setMenuItems((prev) => prev.filter((m) => m.id !== menuId));
    } catch (err) {
      alert("Cannot remove item.");
    }
  };

  /* -------------------------------------------------
     DERIVED
  ---------------------------------------------------*/
  const subtotal = useMemo(
    () =>
      billItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      ),
    [billItems]
  );

  const {
    totalOfferDiscount,
    appliedOfferNames,
    appliedOfferIds
  } = useMemo(
    () => calculateOfferDiscount(billItems, activeOffers),
    [billItems, activeOffers]
  );

  const finalTotal = specialDiscount
    ? 0
    : subtotal - totalOfferDiscount;

  const totalPaid = cashPaid + upiPaid;
  const pendingAmount = Math.max(0, finalTotal - totalPaid);
  const changeToGive =
    totalPaid > finalTotal ? totalPaid - finalTotal : 0;

  /* -------------------------------------------------
     PAYMENT LOGIC
  ---------------------------------------------------*/
  const handlePayment = async () => {
    if (billItems.length === 0) return alert("No items.");

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) throw new Error("Not authenticated.");

      const productIds = billItems.map((b) => b.product_id);
      const productsObj = billItems.map((b) => ({
        product_id: b.product_id,
        quantity: b.quantity,
        price: b.price
      }));

   const { data: tx, error } = await supabase
  .from("transactions")
  .insert([
    {
      user_id: user.id,
      total_amount: Number((subtotal - totalOfferDiscount).toFixed(2)),
      discount: Number(totalOfferDiscount.toFixed(2)),
      cash_paid: Number(cashPaid),
      upi_paid: Number(upiPaid),

      // FIX: always arrays, never null/undefined
      product_ids: productIds || [],
      products: productsObj || [],
      applied_offer_ids: appliedOfferIds || []
    }
  ])
  .select()
  .single();


      if (error) throw error;

      setCurrentBillNumber(tx.daily_bill_no);

      // Special number?
      const special =
        todaysSpecialNumber &&
        tx.daily_bill_no === todaysSpecialNumber;

      if (special) {
        setSpecialDiscount(true);
        setIsSpecialActive(true);

        import("canvas-confetti").then(({ default: confetti }) =>
          confetti({ particleCount: 200, spread: 80 })
        );

        await supabase
          .from("transactions")
          .update({
            total_amount: 0,
            discount: Number(subtotal.toFixed(2))
          })
          .eq("id", tx.id);
      }

    // Insert billing items
await supabase.from("billing_items").insert(
  billItems.map((b) => ({
    transaction_id: tx.id,
    menu_item_id: b.menu_item_id,
    product_id: b.product_id,       // ⭐ REQUIRED
    price: b.price,
    quantity: b.quantity,
    user_id: user.id
  }))
);



      alert(`Paid! Bill #${tx.daily_bill_no}`);

      setTimeout(() => {
        setBillItems([]);
        setShowBill(false);
        setCashPaid(0);
        setUpiPaid(0);
        setPendingCashInput("");
        setSpecialDiscount(false);
        setCurrentBillNumber(null);
        setIsSpecialActive(false);
      }, 1500);
    } catch (err) {
      alert(err.message);
    }
  };

  /* -------------------------------------------------
     INITIAL LOAD + REALTIME
  ---------------------------------------------------*/
  useEffect(() => {
    fetchMenu();
    fetchSpecialNumber();
    fetchActiveOffers();

    const channel = supabase
      .channel("rt-menu")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todays_menu" },
        fetchMenu
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  /* -------------------------------------------------
     UI HELPERS
  ---------------------------------------------------*/
  const filteredMenu = useMemo(
    () =>
      menuItems.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase())
      ),
    [menuItems, search]
  );

  const getQuantity = (id) =>
    billItems.find((b) => b.menu_item_id === id)?.quantity || 0;

  const suggestedAmounts = useMemo(() => {
    const base = specialDiscount
      ? 0
      : subtotal - totalOfferDiscount;
    const m5 = Math.ceil(base / 5) * 5;
    return [base, m5, m5 + 5, m5 + 10, 100, 200, 500];
  }, [subtotal, totalOfferDiscount, specialDiscount]);

  /* -------------------------------------------------
     RENDER
  ---------------------------------------------------*/
  if (loading)
    return (
      <p className="text-center text-foreground mt-10">
        Loading menu...
      </p>
    );

  return (
    <div
      className={`min-h-screen flex flex-col bg-background transition-all ${
        isSpecialActive
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
          className={`px-4 py-2 rounded-lg font-bold transition ${
            cashPaid === amt
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

       
      </main>
    </div>
  );
};

export default Menu;
