"use client";

import React, { useState } from "react";
import supabase from "@/lib/supabaseClient";

const RefundComponent = () => {
  const [billDate, setBillDate] = useState("");
  const [billNo, setBillNo] = useState("");
  const [transaction, setTransaction] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [selectedRefunds, setSelectedRefunds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const getRefundQty = (itemId) =>
    selectedRefunds.find((x) => x.billing_item_id === itemId)?.refund_qty || 0;

  const fetchBill = async () => {
    if (loading) return;

    setErrorMsg("");
    setSuccessMsg("");
    setSelectedRefunds([]);
    setBillItems([]);

    if (!billDate || !billNo) {
      return setErrorMsg("Please select both Date and Bill Number");
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return setErrorMsg("User not authenticated");
      }

      const start = `${billDate}T00:00:00`;
      const end = `${billDate}T23:59:59`;

      // 1️⃣ Fetch transaction (user-scoped)
      const { data: trx, error: trxErr } = await supabase
        .from("transactions")
        .select("*")
        .eq("daily_bill_no", Number(billNo))
        .eq("user_id", user.id)
        .gte("created_at", start)
        .lte("created_at", end)
        .single();

      if (trxErr || !trx) {
        return setErrorMsg("Bill not found for the selected date.");
      }

      setTransaction(trx);

      // 2️⃣ Fetch SALE items only
      const { data: items, error: itemsErr } = await supabase
        .from("transaction_items")
        .select("id, product_id, quantity, unit_price, products(name)")
        .eq("transaction_id", trx.id)
        .eq("item_type", "SALE");

      if (itemsErr || !items || items.length === 0) {
        return setErrorMsg("No bill items found for this transaction.");
      }

      const mappedItems = items.map((i) => ({
        id: i.id,
        product_id: i.product_id,
        quantity: Number(i.quantity),
        price: Number(i.unit_price),
        products: { name: i.products?.name || "Unnamed Product" },
      }));

      setBillItems(mappedItems);
    } finally {
      setLoading(false);
    }
  };

  const updateRefundQty = (itemId, newQty) => {
    const item = billItems.find((i) => i.id === itemId);
    if (!item) return;

    let qty = Number(newQty);
    qty = Math.max(0, Math.min(qty, item.quantity));

    setSelectedRefunds((prev) => {
      const exists = prev.find((x) => x.billing_item_id === itemId);

      if (qty === 0) {
        return prev.filter((x) => x.billing_item_id !== itemId);
      }

      if (exists) {
        return prev.map((x) =>
          x.billing_item_id === itemId ? { ...x, refund_qty: qty } : x
        );
      }

      return [...prev, { billing_item_id: itemId, refund_qty: qty }];
    });
  };

  const totalRefund = selectedRefunds.reduce((sum, entry) => {
    const item = billItems.find((i) => i.id === entry.billing_item_id);
    if (!item) return sum;
    return sum + entry.refund_qty * item.price;
  }, 0);

  const submitRefund = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!transaction) {
      return setErrorMsg("No transaction selected.");
    }

    if (selectedRefunds.length === 0) {
      return setErrorMsg("Please select at least one item to refund.");
    }

    setLoading(true);

    try {
      const entriesToInsert = selectedRefunds.map((entry) => {
        const item = billItems.find((i) => i.id === entry.billing_item_id);

        if (!item || item.price <= 0) {
          throw new Error("Invalid refund item detected.");
        }

        return {
          transaction_id: transaction.id,
          product_id: item.product_id,
          quantity: entry.refund_qty,
          unit_price: item.price,
          price: item.price * entry.refund_qty,
          item_type: "REFUND",
        };
      });

      const { error } = await supabase
        .from("transaction_items")
        .insert(entriesToInsert);

      if (error) throw error;

      await supabase
        .from("transactions")
        .update({
          refund: entriesToInsert.map((e) => ({
            product_id: e.product_id,
            qty: e.quantity,
            value: e.price,
          })),
        })
        .eq("id", transaction.id);

      const url = `${import.meta.env.VITE_BACKEND_URL}/api/refund/${transaction.id}/receipt`;
      window.open(url, "_blank");

      setSuccessMsg("Refund processed & receipt printed");
      setSelectedRefunds([]);
      setBillItems([]);
      setTransaction(null);
      setBillDate("");
      setBillNo("");
    } catch (err) {
      setErrorMsg(err.message || "Refund failed");
    } finally {
      setLoading(false);
    }
  };

  // UI BELOW — UNCHANGED
  // renderItemRow + JSX kept intact


  // UI unchanged below
  // ⬇️ (renderItemRow + JSX kept intact)


  const renderItemRow = (item) => {
    const selected = getRefundQty(item.id);

    return (
      <div
        key={item.id}
        className="p-4 bg-card rounded-xl border border-border mb-4 shadow-sm"
      >
        <div className="flex justify-between items-center">
          <div>
            <p className="font-bold text-primary text-lg">
              {item.products?.name || "Unnamed Product"}
            </p>
            <p className="text-sm text-muted-foreground">
              Purchased Qty: {item.quantity}
            </p>
            <p className="text-sm text-foreground">Price: ₹{item.price}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg"
              onClick={() => updateRefundQty(item.id, Number(selected) - 1)}
            >
              -
            </button>

            <input
              type="number"
              min="0"
              max={item.quantity}
              value={selected}
              onChange={(e) => updateRefundQty(item.id, e.target.value)}
              className="w-16 text-center px-2 py-2 bg-muted border border-border text-foreground rounded-lg"
            />

            <button
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg"
              onClick={() => updateRefundQty(item.id, Number(selected) + 1)}
            >
              +
            </button>
          </div>
        </div>

        <p className="mt-2 text-sm text-primary font-medium">
          Refund Value: ₹{selected * item.price}
        </p>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-primary mb-6 text-center">
        Refund Processing
      </h1>

      <div className="bg-card p-5 rounded-xl shadow border border-border mb-6">
        <label className="text-primary font-semibold">Bill Date</label>
        <input
          type="date"
          value={billDate}
          onChange={(e) => setBillDate(e.target.value)}
          className="w-full mb-3 px-4 py-3 rounded-xl bg-muted border border-border text-foreground"
        />

        <label className="text-primary font-semibold">Bill Number</label>
        <input
          type="number"
          value={billNo}
          onChange={(e) => setBillNo(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground mb-4"
        />

        <button
          onClick={fetchBill}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 rounded-xl"
        >
          {loading ? "Loading…" : "Fetch Bill"}
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-600 text-white p-3 rounded-lg mb-4">
          {successMsg}
        </div>
      )}

      {billItems.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-primary mb-4">Bill Items</h2>

          {billItems.map((item) => renderItemRow(item))}

          <div className="mt-4 p-4 bg-secondary/20 border border-secondary rounded-xl">
            <p className="text-lg font-bold text-secondary-foreground">
              Total Refund Amount: ₹{totalRefund}
            </p>
          </div>

          <button
            onClick={submitRefund}
            disabled={loading}
            className="w-full mt-6 bg-accent text-accent-foreground hover:bg-accent/80 py-3 rounded-xl"
          >
            {loading ? "Processing…" : "Submit Refund"}
          </button>
        </>
      )}
    </div>
  );
};

export default RefundComponent;
