"use client";

import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";

// Predefined refund reasons
const REASONS = [
  "Staff mistake",
  "Customer changed mind",
  "Order cancellation",
  "Wrong item served",
  "Item not prepared",
];

const RefundComponent = () => {
  // --- Bill Lookup ---
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Transaction + Items ---
  const [transaction, setTransaction] = useState(null);
  const [billItems, setBillItems] = useState([]);

  // --- Selection ---
  const [selected, setSelected] = useState({}); // billing_item_id: qty

  // --- User Session ---
  const [userId, setUserId] = useState(null);

  // --- Status Messages ---
  const [message, setMessage] = useState("");

  // --- Refund Meta ---
  const [mode, setMode] = useState("cash");
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [otherReason, setOtherReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Load supabase user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    })();
  }, []);

  // ================================
  // FETCH BILL
  // ================================
  const fetchBill = async () => {
    setMessage("");

    if (!billNo || !billDate) {
      setMessage("❌ Enter daily bill number and date.");
      return;
    }
    if (!userId) {
      setMessage("❌ You must be signed in.");
      return;
    }

    setLoading(true);
    setBillItems([]);
    setTransaction(null);
    setSelected({});

    try {
      // Fetch the transaction
      const { data: trx, error: trxErr } = await supabase
        .from("transactions")
        .select("*")
        .eq("daily_bill_no", Number(billNo))
        .gte("created_at", `${billDate} 00:00:00`)
        .lte("created_at", `${billDate} 23:59:59`)
        .single();

      if (trxErr || !trx) {
        setMessage("❌ No transaction found for that bill.");
        setLoading(false);
        return;
      }

      if (trx.user_id !== userId) {
        setMessage("❌ This bill does not belong to your account.");
        setLoading(false);
        return;
      }

      setTransaction(trx);

      // Fetch bill items
      const { data: items } = await supabase
        .from("billing_items")
        .select("id, menu_item_id, quantity, price")
        .eq("transaction_id", trx.id);

      const ids = [...new Set(items.map((i) => i.menu_item_id))];

      // Fetch products
      const { data: products } = await supabase
        .from("products")
        .select("id, name, price")
        .in("id", ids);

      const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

      // Build final list
      const enriched = items.map((b) => {
        const product = productMap[b.menu_item_id];
        const perUnit =
          Number(b.quantity) > 0 ? Number(b.price) / Number(b.quantity) : 0;

        return {
          ...b,
          product_name: product?.name || `#${b.menu_item_id}`,
          product_price: product?.price ?? perUnit,
          per_unit_price: perUnit,
        };
      });

      setBillItems(enriched);
    } catch (err) {
      console.error(err);
      setMessage("❌ Error loading bill.");
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // ITEM SELECTION
  // ================================
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const copy = { ...prev };
      copy[id] ? delete copy[id] : (copy[id] = 1);
      return copy;
    });
  };

  const setRefundQty = (id, qty) => {
    const item = billItems.find((b) => b.id === id);
    const max = item ? Number(item.quantity) : 1;
    const clean = Math.max(1, Math.min(max, Number(qty)));

    setSelected((prev) => ({
      ...prev,
      [id]: clean,
    }));
  };

  // ================================
  // REASONS HANDLER
  // ================================
  const toggleReason = (r) => {
    setSelectedReasons((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  // ================================
  // PROCESS REFUND
  // ================================
  const processRefund = async () => {
    setMessage("");

    if (!transaction) return setMessage("❌ Load a bill first.");
    if (Object.keys(selected).length === 0)
      return setMessage("❌ Select items to refund.");
    if (selectedReasons.length === 0 && !otherReason.trim())
      return setMessage("❌ Choose or enter a refund reason.");

    setProcessing(true);

    try {
      const entries = Object.keys(selected).map((id) => ({
        billing_item_id: Number(id),
        refund_qty: Number(selected[id]),
      }));

      const body = {
        transaction_id: transaction.id,
        entries,
        mode,
        reasons: selectedReasons,
        other_reason: otherReason,
        refunded_by: userId,
      };

      const resp = await fetch("http://localhost:3000/api/refund/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await resp.json();

      if (!resp.ok) {
        console.error(json);
        setMessage("❌ Refund failed.");
        setProcessing(false);
        return;
      }

      setMessage(
        `✅ Refund recorded: ₹${Number(json.refunded_amount).toFixed(2)}`
      );

      // Ask to download receipt
      if (confirm("Refund successful. Download refund receipt?")) {
        window.open(
          `/api/refund/${transaction.id}/receipt?format=pdf`,
          "_blank"
        );
      }

      // Reset + Refresh
      setSelected({});
      setSelectedReasons([]);
      setOtherReason("");
      await fetchBill();
    } catch (err) {
      console.error(err);
      setMessage("❌ Processing error.");
    } finally {
      setProcessing(false);
    }
  };

  // ================================
  // RENDER ITEM ROW
  // ================================
  const renderRow = (item) => {
    const isSelected = selected[item.id] != null;
    const qty = isSelected ? selected[item.id] : "";

    return (
      <div key={item.id} className="py-3 flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelect(item.id)}
            className="w-4 h-4 accent-accent"
          />

          <div>
            <div className="font-medium">{item.product_name}</div>
            <div className="text-sm text-muted-foreground">
              Ordered: {item.quantity} • Unit: ₹{item.per_unit_price.toFixed(2)} •
              Row: ₹{item.price.toFixed(2)}
            </div>
          </div>
        </div>

        {isSelected && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRefundQty(item.id, qty - 1)}
              className="px-2 py-1 border rounded"
            >
              –
            </button>

            <input
              type="number"
              value={qty}
              min="1"
              max={item.quantity}
              onChange={(e) => setRefundQty(item.id, e.target.value)}
              className="w-16 p-2 border rounded text-center"
            />

            <button
              onClick={() => setRefundQty(item.id, qty + 1)}
              className="px-2 py-1 border rounded"
            >
              +
            </button>
          </div>
        )}
      </div>
    );
  };

  // ================================
  // UI
  // ================================
  return (
    <div className="max-w-3xl mx-auto p-4 bg-background text-foreground rounded-lg shadow pb-40">

      <h2 className="text-2xl font-bold mb-4">Refund Manager</h2>

      {message && (
        <p
          className={`mb-4 ${
            message.startsWith("❌") ? "text-red-500" : "text-green-600"
          }`}
        >
          {message}
        </p>
      )}

      {/* BILL SEARCH */}
      <div className="p-4 border rounded bg-card mb-6">
        <h3 className="font-semibold mb-3">Find Bill</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="number"
            placeholder="Daily Bill Number"
            className="p-3 border rounded"
            value={billNo}
            onChange={(e) => setBillNo(e.target.value)}
          />

          <input
            type="date"
            className="p-3 border rounded"
            value={billDate}
            onChange={(e) => setBillDate(e.target.value)}
          />
        </div>

        <button
          onClick={fetchBill}
          disabled={loading}
          className="w-full mt-4 py-2 bg-primary text-white rounded"
        >
          {loading ? "Fetching..." : "Load Bill"}
        </button>
      </div>

      {/* BILL ITEMS */}
      {transaction && (
        <div className="p-4 border rounded bg-card">
          <h3 className="font-semibold mb-3">
            Bill #{transaction.daily_bill_no} —{" "}
            {new Date(transaction.created_at).toLocaleString()}
          </h3>

          {billItems.length === 0 ? (
            <p className="text-muted-foreground">No items in this bill.</p>
          ) : (
            <div className="divide-y">
              {billItems.map((item) => renderRow(item))}
            </div>
          )}

          {/* REFUND MODE */}
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Refund Mode</h4>

            <div className="flex gap-3">
              {["cash", "upi", "other"].map((m) => (
                <label
                  key={m}
                  className={`px-3 py-2 border rounded cursor-pointer ${
                    mode === m ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === m}
                    onChange={() => setMode(m)}
                    className="mr-2"
                  />
                  {m.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          {/* REASONS */}
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Refund Reason</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REASONS.map((r) => (
                <label
                  key={r}
                  className="p-2 border rounded flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedReasons.includes(r)}
                    onChange={() => toggleReason(r)}
                  />
                  {r}
                </label>
              ))}

              <label className="p-2 border rounded flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedReasons.includes("other")}
                  onChange={() => toggleReason("other")}
                />
                Other
              </label>
            </div>

            <textarea
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              placeholder="Explain if 'Other'..."
              className="w-full p-2 border rounded mt-3"
              rows={2}
            />
          </div>

          {/* PROCESS BUTTON */}
          {Object.keys(selected).length > 0 && (
            <button
              onClick={processRefund}
              disabled={processing}
              className="w-full mt-4 py-2 bg-red-600 text-white rounded"
            >
              {processing ? "Processing..." : "Refund Selected Items"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RefundComponent;
