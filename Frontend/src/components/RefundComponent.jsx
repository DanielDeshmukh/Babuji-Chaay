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

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  if (!BACKEND_URL) {
    console.warn("VITE_BACKEND_URL is missing in .env");
  }

  const getRefundQty = (itemId) =>
    selectedRefunds.find((x) => x.billing_item_id === itemId)?.refund_qty || 0;

  const fetchBill = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setSelectedRefunds([]);
    setBillItems([]);

    if (!billDate || !billNo) {
      return setErrorMsg("Please select both Date and Bill Number");
    }

    setLoading(true);

    const start = `${billDate}T00:00:00`;
    const end = `${billDate}T23:59:59`;

    const { data: trx, error: trxErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("daily_bill_no", Number(billNo))
      .gte("created_at", start)
      .lte("created_at", end)
      .single();

    if (trxErr) {
      setLoading(false);
      return setErrorMsg("Bill not found for the selected date.");
    }

    setTransaction(trx);

    const { data: items, error: itemsErr } = await supabase
      .from("billing_items")
      .select("*, products(name)")
      .eq("transaction_id", trx.id);

    setLoading(false);

    if (itemsErr) {
      return setErrorMsg("Unable to load bill items.");
    }

    setBillItems(items);
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
    return sum + entry.refund_qty * item.price;
  }, 0);

  const downloadReceipt = async (trxId) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/refund/${trxId}/receipt`,
        {
          method: "GET",
        }
      );

      if (!res.ok) {
        return setErrorMsg("Refund recorded but failed to download receipt.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Refund_Receipt_${trxId}.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch {
      setErrorMsg("Could not download receipt.");
    }
  };

  const submitRefund = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (selectedRefunds.length === 0) {
      return setErrorMsg("Please enter at least one refund quantity.");
    }

    setLoading(true);

    const payload = {
      transaction_id: transaction.id,
      entries: selectedRefunds,
      mode: "cash",
      reasons: ["Order cancellation"],
      other_reason: "",
    };

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/refund/record`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const text = await response.text();
      let result = {};

      try {
        result = JSON.parse(text || "{}");
      } catch {
        result.error = text;
      }

      if (!response.ok) {
        setLoading(false);
        return setErrorMsg(result.error || "Refund failed.");
      }

      setSuccessMsg("Refund recorded successfully.");
      await downloadReceipt(transaction.id);

      setLoading(false);
    } catch {
      setLoading(false);
      setErrorMsg("Network or server error.");
    }
  };

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
