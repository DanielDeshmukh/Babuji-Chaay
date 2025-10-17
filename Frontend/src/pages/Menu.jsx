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
  const [currentBillNumber, setCurrentBillNumber] = useState(null);
  const [upiQr, setUpiQr] = useState(null);
  const [upiQrAmount, setUpiQrAmount] = useState(0);
  const [showQrModal, setShowQrModal] = useState(false);

  const UPI_ID = "deshmukhdaniel2005@okhdfcbank";

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

  const addToBill = (item) => {
    const existing = billItems.find((b) => b.menu_item_id === item.id);
    if (existing) {
      updateBillQuantity(item.id, existing.quantity + 1);
      return;
    }
    setBillItems((prev) => [
      ...prev,
      { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 },
    ]);
  };

  const updateBillQuantity = (menu_item_id, newQuantity) => {
    if (newQuantity <= 0) return removeFromBill(menu_item_id);
    setBillItems((prev) =>
      prev.map((b) =>
        b.menu_item_id === menu_item_id ? { ...b, quantity: newQuantity } : b
      )
    );
  };

  const removeFromBill = (menu_item_id) => {
    setBillItems((prev) => prev.filter((b) => b.menu_item_id !== menu_item_id));
  };

  const removeFromMenu = async (menuId) => {
    try {
      const { error } = await supabase.functions.invoke("remove-menu", { body: { id: menuId } });
      if (error) throw error;
      setMenuItems((prev) => prev.filter((m) => m.id !== menuId));
    } catch (err) {
      console.error("Error removing menu item:", err.message);
    }
  };

  const generateUpiQr = async (amount) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-upi-qr", {
        body: { upi: UPI_ID, amount },
      });
      if (error) throw error;
      if (data?.qr) {
        setUpiQr(data.qr);
        setUpiQrAmount(amount);
        setShowQrModal(true);
      }
    } catch (err) {
      console.error("Error generating UPI QR:", err);
    }
  };

  const handlePayment = async () => {
    const totalAmount = billItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    try {
      const { data: maxData, error: maxError } = await supabase
        .from("transactions")
        .select("id")
        .order("id", { ascending: false })
        .limit(1);
      if (maxError) throw maxError;

      const nextId = (maxData?.[0]?.id || 0) + 1;
      setCurrentBillNumber(nextId);

      const { data: specialData } = await supabase
        .from("special_numbers")
        .select("*")
        .eq("number", nextId)
        .single();
      setSpecialDiscount(Boolean(specialData));

      const { data: tx, error: txError } = await supabase
        .from("transactions")
        .insert([
          {
            id: nextId,
            total_amount: specialDiscount ? 0 : totalAmount,
            discount: specialDiscount ? totalAmount : 0,
            cash_paid: cashPaid,
            upi_paid: upiPaid,
          },
        ])
        .select()
        .single();
      if (txError) throw txError;

      const { error: billError } = await supabase.from("billing_items").insert(
        billItems.map((item) => ({
          transaction_id: tx.id,
          menu_item_id: item.menu_item_id,
          price: item.price,
          quantity: item.quantity,
        }))
      );
      if (billError) throw billError;

      alert(`Payment successful! Bill No: ${tx.id}`);

      setTimeout(() => {
        setBillItems([]);
        setShowBill(false);
        setCashPaid(0);
        setUpiPaid(0);
        setPendingCashInput("");
        setSpecialDiscount(false);
        setCurrentBillNumber(null);
        setUpiQr(null);
        setShowQrModal(false);
      }, 3000);
    } catch (err) {
      console.error("Error during payment:", err.message);
    }
  };

  useEffect(() => {
    fetchMenu();
    const channel = supabase
      .channel("realtime-todays-menu")
      .on("postgres_changes", { event: "*", schema: "public", table: "todays_menu" }, fetchMenu)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  if (loading) return <p className="text-center text-[#FDFCF6] mt-10">Loading today’s menu...</p>;

  const filteredMenu = menuItems.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = billItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const pendingAmount = Math.max(0, (specialDiscount ? 0 : totalAmount) - (cashPaid + upiPaid));

  const getQuantity = (menuId) =>
    billItems.find((b) => b.menu_item_id === menuId)?.quantity || 0;

  const getSuggestedAmounts = () => {
    const amount = specialDiscount ? 0 : totalAmount;
    const rounded = Math.ceil(amount / 5) * 5;
    return [amount, rounded, rounded + 5, rounded + 10, rounded + 50, 500];
  };

  return (
    <div className={`min-h-screen flex flex-col ${specialDiscount ? "bg-green-900 animate-pulse" : "bg-[#1E4B2E]"}`}>
      <Header />
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#D4A23A]">Today’s Menu</h2>

        <input
          type="text"
          placeholder="Search menu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 mb-6 rounded-lg border border-[#D4A23A] focus:ring-2 focus:ring-[#D4A23A] focus:outline-none bg-[#FDFCF6] text-[#1E4B2E] placeholder-gray-500"
        />

        {filteredMenu.length === 0 ? (
          <p className="text-center text-[#FDFCF6] mt-10">No matching items found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMenu.map((item) => (
              <div key={item.id} className="bg-[#FDFCF6] rounded-lg shadow-sm p-4 flex flex-col justify-between border border-[#D4A23A]/60 hover:shadow-md transition">
                <div>
                  <h3 className="text-lg font-semibold text-[#1E4B2E]">{item.name}</h3>
                  <p className="text-sm text-gray-700">Category: {item.category}</p>
                  <p className="text-sm text-gray-700">Stock: {item.quantity}</p>
                  <p className="text-[#D4A23A] font-bold mt-1 text-lg">₹{item.price}</p>
                </div>
                <div className="flex justify-between items-center mt-3 gap-2">
                  <button onClick={() => updateBillQuantity(item.id, getQuantity(item.id) - 1)} className="bg-red-500 text-white w-10 h-10 rounded-full hover:bg-red-600 transition">-</button>
                  <span className="font-bold text-[#1E4B2E] text-lg w-8 text-center">{getQuantity(item.id)}</span>
                  <button onClick={() => addToBill(item)} className="bg-green-500 text-white w-10 h-10 rounded-full hover:bg-green-600 transition">+</button>
                  <button onClick={() => removeFromMenu(item.id)} className="bg-red-600 text-white w-20 h-10 rounded-lg hover:bg-red-700 transition text-sm">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {billItems.length > 0 && (
          <button onClick={() => setShowBill(true)} className="fixed bottom-6 right-6 bg-[#D4A23A] text-[#1E4B2E] font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-[#e0b030] transition">View Bill</button>
        )}

        <div className={`fixed top-0 right-0 w-full md:w-96 h-full shadow-lg p-6 flex flex-col transform transition-transform duration-300 ${showBill ? "translate-x-0" : "translate-x-full"} ${specialDiscount ? "bg-green-100 border-4 border-green-500" : "bg-[#FDFCF6]"}`}>
          <button onClick={() => setShowBill(false)} className="self-end text-red-500 font-bold">Close</button>
          <h2 className="text-2xl font-bold text-[#1E4B2E] mb-2">Your Bill</h2>
          {currentBillNumber && <p className="font-bold mb-4">{`Bill Number: ${currentBillNumber}`}</p>}

          <div className="flex flex-col gap-4 overflow-y-auto flex-grow">
            {billItems.map((item) => (
              <div key={item.menu_item_id} className="flex justify-between items-center p-2 bg-[#e5e5e4] rounded-lg">
                <div>
                  <h3 className="font-semibold text-[#1E4B2E]">{item.name}</h3>
                  <p className="text-gray-700">₹{item.price} x {item.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateBillQuantity(item.menu_item_id, item.quantity - 1)} className="bg-red-500 text-white w-8 h-8 rounded-full">-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateBillQuantity(item.menu_item_id, item.quantity + 1)} className="bg-green-500 text-white w-8 h-8 rounded-full">+</button>
                  <button onClick={() => removeFromBill(item.menu_item_id)} className="ml-2 text-red-600 font-bold">x</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <p className="font-bold text-lg text-[#1E4B2E]">Total: ₹{specialDiscount ? 0 : totalAmount}</p>
            <div className="flex flex-wrap gap-2">
              {getSuggestedAmounts().map((amt, idx) => (
                <button key={idx} onClick={() => setCashPaid(amt)} className={`px-4 py-2 rounded-lg font-bold ${cashPaid === amt ? "bg-green-600 text-white" : "bg-[#D4A23A] text-[#1E4B2E]"} hover:bg-green-500 transition`}>
                  ₹{amt}
                </button>
              ))}
            </div>

            {pendingAmount > 0 && (
              <div className="mt-2 flex flex-col gap-2">
                <p className="font-bold text-red-600">Pending Amount: ₹{pendingAmount}</p>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={pendingCashInput}
                  onChange={(e) => setPendingCashInput(e.target.value)}
                  className="p-2 rounded-lg border border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#D4A23A]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const val = Number(pendingCashInput);
                      if (val > 0) setCashPaid(cashPaid + val);
                      setPendingCashInput("");
                    }}
                    className="px-3 py-1 bg-[#D4A23A] rounded-lg font-bold"
                    disabled={!pendingCashInput || Number(pendingCashInput) <= 0}
                  >
                    Pay Cash
                  </button>
                  <button
                    onClick={() => {
                      const val = Number(pendingCashInput);
                      if (val > 0) {
                        const newUpiPaid = upiPaid + val;
                        setUpiPaid(newUpiPaid);
                        const updatedPending = Math.max(0, totalAmount - (cashPaid + newUpiPaid));
                        generateUpiQr(updatedPending);
                      }
                      setPendingCashInput("");
                    }}
                    className="px-3 py-1 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition"
                    disabled={!pendingCashInput || Number(pendingCashInput) <= 0}
                  >
                    Pay UPI
                  </button>
                </div>
              </div>
            )}

            <p className={`font-bold mt-2 ${pendingAmount < 0 ? "text-red-600" : "text-green-600"}`}>
              {pendingAmount <= 0 && pendingAmount !== 0 ? `Return ₹${Math.abs(pendingAmount)} to customer` : pendingAmount === 0 ? "Payment complete" : ""}
            </p>

            <button
              onClick={handlePayment}
              className="mt-2 w-full bg-[#D4A23A] text-[#1E4B2E] py-2 rounded-lg font-bold hover:bg-[#e0b030] transition"
              disabled={pendingAmount > 0}
            >
              Complete Payment
            </button>
          </div>
        </div>

        {showQrModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-[#FDFCF6] p-6 rounded-lg flex flex-col items-center relative">
              <button onClick={() => setShowQrModal(false)} className="absolute top-2 right-2 text-red-500 font-bold">Close</button>
              <p className="font-bold text-lg text-[#1E4B2E] mb-4">Scan QR to pay ₹{upiQrAmount}</p>
              {upiQr && <img src={upiQr} alt="UPI QR" className="w-48 h-48" />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Menu;
