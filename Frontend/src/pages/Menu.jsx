"use client";

import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import Header from "../components/Header";

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
  const [currentBillNumber, setCurrentBillNumber] = useState(null); // This will now hold the daily_bill_no
  const [todaysSpecialNumber, setTodaysSpecialNumber] = useState(null);
  const [isSpecialActive, setIsSpecialActive] = useState(false);

  // ✅ Fetch today’s menu
  const fetchMenu = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-todays-menu");
      if (error) throw error;
      setMenuItems(data?.todays_menu ?? []);
    } catch (err) {
      console.error("Error fetching menu:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch hidden special number
  const fetchSpecialNumber = async () => {
    try {
      const { data, error } = await supabase
        .from("special_numbers")
        .select("number")
        .order("id", { ascending: false })
        .limit(1)
        .single();
      if (!error && data) setTodaysSpecialNumber(data.number);
    } catch (err) {
      console.error("Error fetching special number:", err.message);
    }
  };

  // ✅ Add item to bill
  const addToBill = (item) => {
    const existing = billItems.find((b) => b.menu_item_id === item.id);
    if (existing) return updateBillQuantity(item.id, existing.quantity + 1);
    setBillItems((prev) => [
      ...prev,
      { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 },
    ]);
  };

  // ✅ Update quantity
  const updateBillQuantity = (menu_item_id, newQuantity) => {
    if (newQuantity <= 0) return removeFromBill(menu_item_id);
    setBillItems((prev) =>
      prev.map((b) =>
        b.menu_item_id === menu_item_id ? { ...b, quantity: newQuantity } : b
      )
    );
  };

  // ✅ Remove from bill
  const removeFromBill = (menu_item_id) => {
    setBillItems((prev) => prev.filter((b) => b.menu_item_id !== menu_item_id));
  };

  // ✅ Remove from today’s menu
  const removeFromMenu = async (menuId) => {
    try {
      const { error } = await supabase.functions.invoke("remove-menu", {
        body: { id: menuId },
      });
      if (error) throw error;
      setMenuItems((prev) => prev.filter((m) => m.id !== menuId));
    } catch (err) {
      console.error("Error removing menu item:", err.message);
    }
  };

  // --- REFACTORED PAYMENT HANDLER ---
  // This now inserts the transaction, gets the daily_bill_no,
  // and *then* checks for the special number.
  const handlePayment = async () => {
    const totalAmount = billItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    try {
      // 1. Get the next *Primary Key* (id). We still need this.
      const { data: maxData } = await supabase
        .from("transactions")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);
      const nextId = (maxData?.[0]?.id || 0) + 1;

      // 2. Prepare product arrays
      const productIds = billItems.map(item => item.menu_item_id);
      const productsArray = billItems.map(item => ({
        product_id: item.menu_item_id,
        quantity: item.quantity,
        price: item.price
      }));

      // 3. Insert transaction and get the new row (with daily_bill_no) back
      const { data: newTransaction, error: insertError } = await supabase
        .from("transactions")
        .insert([
          {
            id: nextId, // This is the unique Primary Key
            total_amount: totalAmount, // Insert preliminary total
            discount: 0, // Insert preliminary discount
            cash_paid: cashPaid,
            upi_paid: upiPaid,
            product_ids: productIds,
            products: productsArray,
            // 'daily_bill_no' will be set by the trigger
          },
        ])
        .select() // <-- Ask Supabase to return the inserted row
        .single(); // <-- We only inserted one

      if (insertError) throw insertError;

      // 4. Now we have the *actual* daily_bill_no from the database!
      const newDailyBillNo = newTransaction.daily_bill_no;
      setCurrentBillNumber(newDailyBillNo); // Set for the UI

      // 5. Check if this bill is the special one
      const isSpecial = todaysSpecialNumber && newDailyBillNo === todaysSpecialNumber;
      setSpecialDiscount(isSpecial);

      // 6. If it IS special, apply discount and run confetti
      if (isSpecial) {
        setIsSpecialActive(true);
        import("canvas-confetti").then(({ default: confetti }) => {
          const end = Date.now() + 6 * 1000;
          const colors = ['#bb0000', '#ffffff'];

          (function frame() {
            confetti({
              particleCount: 2,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
              colors: colors,
            });
            confetti({
              particleCount: 2,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
              colors: colors,
            });

            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          })();
        });

        // Update the transaction in the DB to reflect the 100% discount
        await supabase
          .from("transactions")
          .update({
            total_amount: 0, // Final total is 0
            discount: totalAmount // Discount is the full amount
          })
          .eq('id', nextId); // Update the row we just created
      }

      // 7. Insert into billing_items (uses the Primary Key 'nextId', which is correct)
      await supabase.from("billing_items").insert(
        billItems.map((item) => ({
          transaction_id: nextId, // This is the correct foreign key (the PK)
          menu_item_id: item.menu_item_id,
          price: item.price,
          quantity: item.quantity,
        }))
      );

      // 8. Show the *daily_bill_no* in the alert
      alert(`✅ Payment successful! Bill #${newDailyBillNo}`);

      // 9. Reset UI
      setTimeout(() => {
        setBillItems([]);
        setShowBill(false);
        setCashPaid(0);
        setUpiPaid(0);
        setPendingCashInput("");
        setSpecialDiscount(false);
        setCurrentBillNumber(null);
        setIsSpecialActive(false);
      }, 2500);
    } catch (err) {
      console.error("Error during payment:", err.message);
    }
  };
  // --- END OF REFACTORED FUNCTION ---

  useEffect(() => {
    fetchMenu();
    fetchSpecialNumber();
    const channel = supabase
      .channel("realtime-todays-menu")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todays_menu" },
        fetchMenu
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  if (loading)
    return (
      <p className="text-center text-foreground mt-10">
        Loading today’s menu...
      </p>
    );

  const filteredMenu = menuItems.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = billItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );
  const totalPaid = cashPaid + upiPaid;
  // Use 'specialDiscount' state, which is set *after* the check
  const finalTotal = specialDiscount ? 0 : totalAmount;
  const pendingAmount = Math.max(0, finalTotal - totalPaid);
  const changeToGive = totalPaid > finalTotal
    ? totalPaid - finalTotal
    : 0;

  const getQuantity = (menuId) =>
    billItems.find((b) => b.menu_item_id === menuId)?.quantity || 0;

  const getSuggestedAmounts = () => {
    const amount = specialDiscount ? 0 : totalAmount;
    const multiplesOf5 = Math.ceil(amount / 5) * 5;
    return [amount, multiplesOf5, multiplesOf5 + 5, multiplesOf5 + 10, 100, 200, 500];
  };

  return (
    <div
      className={`min-h-screen flex flex-col bg-background transition-all duration-700 ${
        isSpecialActive ? "animate-[pulse_2s_ease-in-out_infinite]" : ""
      }`}
    >
      <Header />
      <style>
        {`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 25px #1e40ff44; }
          50% { box-shadow: 0 0 60px #1e40ff; }
        }
        `}
      </style>

      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full pt-16 sm:pt-20">
        <h2 className="text-2xl font-bold mb-6 text-center text-primary">
          Today’s Menu
        </h2>

        <input
          type="text"
          placeholder="Search menu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 mb-6 rounded-lg border border-primary focus:ring-2 focus:ring-primary focus:outline-none bg-card text-foreground placeholder-muted-foreground"
        />

        {filteredMenu.length === 0 ? (
          <p className="text-center text-foreground mt-10">
            No matching items found.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMenu.map((item) => (
              <div
                key={item.id}
                className="bg-card rounded-lg shadow-sm p-4 flex flex-col justify-between border border-border hover:shadow-md transition"
              >
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {item.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Category: {item.category}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Stock: {item.quantity}
                  </p>
                  <p className="text-primary font-bold mt-1 text-lg">
                    ₹{item.price}
                  </p>
                </div>
                <div className="flex justify-between items-center mt-3 gap-2">
                  <button
                    onClick={() =>
                      updateBillQuantity(item.id, getQuantity(item.id) - 1)
                    }
                    className="bg-red-600 text-white w-10 h-10 rounded-full hover:bg-red-700 transition"
                  >
                    -
                  </button>
                  <span className="font-bold text-foreground text-lg w-8 text-center">
                    {getQuantity(item.id)}
                  </span>
                  <button
                    onClick={() => addToBill(item)}
                    className="bg-green-600 text-white w-10 h-10 rounded-full hover:bg-green-700 transition"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromMenu(item.id)}
                    className="bg-red-700 text-white w-20 h-10 rounded-lg hover:bg-red-800 transition text-sm"
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
            onClick={() => setShowBill(true)}
            className="fixed bottom-6 right-6 bg-primary text-background font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-accent transition"
          >
            View Bill
          </button>
        )}

        {/* Bill Sidebar */}
        <div
          className={`fixed top-0 right-0 w-full md:w-96 h-full shadow-lg p-6 flex flex-col transform transition-transform z-50 duration-300 bg-card border-l border-border ${
            showBill ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <button
            onClick={() => setShowBill(false)}
            className="self-end text-red-500 font-bold"
          >
            Close
          </button>
          <h2 className="text-2xl font-bold text-foreground mb-2">Your Bill</h2>
          {currentBillNumber && (
            <p className="font-bold mb-4">{`Bill Number: ${currentBillNumber}`}</p>
          )}

          <div className="flex flex-col gap-4 overflow-y-auto flex-grow">
            {billItems.map((item) => (
              <div
                key={item.menu_item_id}
                className="flex justify-between items-center p-2 bg-background rounded-lg"
              >
                <div>
                  <h3 className="font-semibold text-foreground">
                    {item.name}
                  </h3>
                  <p className="text-muted-foreground">
                    ₹{item.price} x {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateBillQuantity(
                        item.menu_item_id,
                        item.quantity - 1
                      )
                    }
                    className="bg-red-600 text-white w-8 h-8 rounded-full"
                  >
                    -
                  </button>
                  <span className="text-foreground">{item.quantity}</span>
                  <button
                    onClick={() =>
                      updateBillQuantity(
                        item.menu_item_id,
                        item.quantity + 1
                      )
                    }
                    className="bg-green-600 text-white w-8 h-8 rounded-full"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromBill(item.menu_item_id)}
                    className="ml-2 text-red-600 font-bold"
                  >
                    x
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <p className="font-bold text-lg text-foreground">
              Total: ₹{finalTotal}
            </p>

            <div className="flex flex-wrap gap-2">
              {getSuggestedAmounts().map((amt, idx) => (
                <button
                  key={idx}
                  onClick={() => setCashPaid(amt)}
                  className={`px-4 py-2 rounded-lg font-bold ${
                    cashPaid === amt
                      ? "bg-green-600 text-white"
                      : "bg-primary text-background"
                  } hover:bg-green-500 transition`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            {pendingAmount > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                <p className="font-bold text-red-600">
                  Pending: ₹{pendingAmount}
                </p>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={pendingCashInput}
                  onChange={(e) => setPendingCashInput(e.target.value)}
                  className="p-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const val = Number(pendingCashInput);
                      if (val > 0) setCashPaid(cashPaid + val);
                      setPendingCashInput("");
                    }}
                    className="px-3 py-1 bg-primary rounded-lg font-bold hover:bg-accent transition"
                  >
                    Pay Cash
                  </button>
                  <button
                    onClick={() => {
                      const val = Number(pendingCashInput);
                      if (val > 0) setUpiPaid(upiPaid + val);
                      setPendingCashInput("");
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
                  >
                    Pay UPI
                  </button>
                </div>
              </div>
            )}

            {changeToGive > 0 && (
              <p className="font-bold text-green-600">
                Return ₹{changeToGive} to customer
              </p>
            )}

            {pendingAmount === 0 && changeToGive === 0 && (
              <p className="text-green-600 font-semibold">✅ Payment complete</p>
            )}

            <button
              onClick={handlePayment}
              className="mt-3 w-full bg-primary text-background py-2 rounded-lg font-bold hover:bg-accent transition"
              disabled={pendingAmount > 0}
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