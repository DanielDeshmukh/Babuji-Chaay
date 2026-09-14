"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import PrintReceipt from "./PrintReceipt";

interface Offer {
  id: number;
  name: string;
  description: string;
  product_ids: number[];
  is_active: boolean;
  is_recurring: boolean;
  discount_type: string;
  discount_value: number;
  day_of_week: number | null;
  start_date: string | null;
  end_date: string | null;
}

interface Product {
  id: number;
  name: string;
  price: number;
}

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const RefundComponent = () => {
  const [billDate, setBillDate] = useState("");
  const [billNo, setBillNo] = useState("");
  const [transaction, setTransaction] = useState<{
    id: string;
    daily_bill_no: number;
  } | null>(null);
  const [billItems, setBillItems] = useState<
    Array<{
      id: number;
      product_id: number;
      quantity: number;
      price: number;
      name: string;
    }>
  >([]);
  const [printJob, setPrintJob] = useState<{
    type: string;
    data: Record<string, unknown>;
  } | null>(null);
  const [selectedRefunds, setSelectedRefunds] = useState<
    Array<{ billing_item_id: number; refund_qty: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []));
  }, []);

  const getRefundQty = (itemId: number) =>
    selectedRefunds.find((x) => x.billing_item_id === itemId)?.refund_qty ||
    0;

  const fetchBill = async () => {
    if (loading) return;
    setErrorMsg("");
    setSuccessMsg("");
    setSelectedRefunds([]);
    setBillItems([]);

    if (!billDate || !billNo)
      return setErrorMsg("Enter Date & Bill No.");

    setLoading(true);
    try {
      const start = `${billDate}T00:00:00`;
      const end = `${billDate}T23:59:59`;

      const res = await fetch(
        `/api/transactions/lookup?billNo=${billNo}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      );
      const data = await res.json();

      if (!data.transaction) throw new Error("Bill not found.");

      setTransaction(data.transaction);

      const itemsRes = await fetch(
        `/api/transaction-items?transactionId=${data.transaction.id}`
      );
      const itemsData = await itemsRes.json();

      const saleItems = (itemsData.items || []).filter(
        (i: { item_type: string }) => i.item_type === "SALE"
      );

      if (saleItems.length === 0)
        throw new Error("No sale items found.");

      // Fetch product names
      const productsRes = await fetch("/api/products");
      const productsData = await productsRes.json();
      const productsMap = new Map(
        (productsData.products || []).map((p: Product) => [p.id, p.name])
      );

      setBillItems(
        saleItems.map(
          (i: {
            id: number;
            product_id: number;
            quantity: number;
            unit_price: number;
          }) => ({
            id: i.id,
            product_id: i.product_id,
            quantity: Number(i.quantity),
            price: Number(i.unit_price),
            name: productsMap.get(i.product_id) || "Unnamed Product",
          })
        )
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  };

  const updateRefundQty = (itemId: number, newQty: number) => {
    const item = billItems.find((i) => i.id === itemId);
    const qty = Math.max(0, Math.min(Number(newQty), item?.quantity || 0));

    setSelectedRefunds((prev) => {
      const filtered = prev.filter(
        (x) => x.billing_item_id !== itemId
      );
      return qty === 0
        ? filtered
        : [...filtered, { billing_item_id: itemId, refund_qty: qty }];
    });
  };

  const totalRefund = selectedRefunds.reduce((sum, entry) => {
    const item = billItems.find((i) => i.id === entry.billing_item_id);
    return sum + entry.refund_qty * (item?.price || 0);
  }, 0);

  const submitRefund = async () => {
    if (!transaction || selectedRefunds.length === 0) return;
    setLoading(true);

    try {
      const entriesToInsert = selectedRefunds.map((entry) => {
        const item = billItems.find(
          (i) => i.id === entry.billing_item_id
        )!;
        return {
          product_id: item.product_id,
          quantity: entry.refund_qty,
          unit_price: item.price,
          price: item.price * entry.refund_qty,
        };
      });

      const res = await fetch("/api/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: transaction.id,
          refund_items: entriesToInsert,
        }),
      });

      if (!res.ok) throw new Error("Refund failed");

      setPrintJob({
        type: "REFUND",
        data: {
          shopName: "BABUJI CHAAY",
          billNo: transaction.daily_bill_no,
          date: new Date().toLocaleString(),
          items: entriesToInsert.map((e) => ({
            name: billItems.find((bi) => bi.product_id === e.product_id)
              ?.name,
            qty: e.quantity,
            price: e.unit_price,
            amt: e.price,
          })),
          total: totalRefund,
        },
      });

      setSuccessMsg("REFUND COMPLETE");
      setTimeout(() => {
        setBillItems([]);
        setTransaction(null);
        setBillNo("");
      }, 1000);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 min-h-screen bg-background text-foreground">
      <header className="mb-8 border-b-4 border-destructive pb-4">
        <h1 className="text-4xl font-black tracking-tighter">
          REFUND CENTER
        </h1>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Reversal &amp; Credit Processing
        </p>
      </header>

      <section className="bg-card border-2 border-border p-6 rounded-2xl mb-6 shadow-sm">
        <h3 className="text-xs font-black uppercase mb-4 flex items-center gap-2">
          <span className="w-5 h-5 bg-primary text-primary-foreground flex items-center justify-center rounded-full text-[10px]">
            1
          </span>
          Locate Original Transaction
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase ml-1">
              Date of Purchase
            </label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full bg-background border-2 border-muted p-3 rounded-xl font-bold focus:border-primary outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase ml-1">
              Daily Bill Number
            </label>
            <input
              type="number"
              value={billNo}
              onChange={(e) => setBillNo(e.target.value)}
              placeholder="000"
              className="w-full bg-background border-2 border-muted p-3 rounded-xl font-bold focus:border-primary outline-none"
            />
          </div>
        </div>
        <button
          onClick={fetchBill}
          disabled={loading}
          className="w-full bg-foreground text-background font-black uppercase py-4 rounded-xl hover:opacity-90 transition-all active:scale-[0.98]"
        >
          {loading ? "SEARCHING..." : "FETCH RECEIPT"}
        </button>
      </section>

      {errorMsg && (
        <div className="p-4 mb-6 bg-red-50 border-2 border-red-200 text-red-700 font-black text-center uppercase text-xs rounded-xl">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 mb-6 bg-green-50 border-2 border-green-200 text-green-700 font-black text-center uppercase text-xs rounded-xl tracking-widest animate-bounce">
          {successMsg}
        </div>
      )}

      {billItems.length > 0 && (
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-end mb-2 px-1">
            <h3 className="text-xs font-black uppercase flex items-center gap-2">
              <span className="w-5 h-5 bg-primary text-primary-foreground flex items-center justify-center rounded-full text-[10px]">
                2
              </span>
              Select Items to Return
            </h3>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              Bill #{transaction?.daily_bill_no}
            </span>
          </div>

          <div className="space-y-3">
            {billItems.map((item) => {
              const currentRefund = getRefundQty(item.id);
              return (
                <div
                  key={item.id}
                  className="bg-card border-2 border-border p-4 rounded-2xl flex justify-between items-center group hover:border-primary transition-colors"
                >
                  <div>
                    <h4 className="font-black uppercase text-sm leading-tight">
                      {item.name}
                    </h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Bought: {item.quantity} x {item.price}
                    </p>
                  </div>
                  <div className="flex items-center bg-background border-2 border-muted rounded-xl p-1 gap-1">
                    <button
                      onClick={() =>
                        updateRefundQty(item.id, currentRefund - 1)
                      }
                      className="w-8 h-8 flex items-center justify-center font-black hover:bg-muted rounded-lg"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-black text-sm">
                      {currentRefund}
                    </span>
                    <button
                      onClick={() =>
                        updateRefundQty(item.id, currentRefund + 1)
                      }
                      className="w-8 h-8 flex items-center justify-center font-black hover:bg-muted rounded-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 bg-destructive p-6 rounded-[2.5rem] text-destructive-foreground shadow-xl shadow-destructive/20">
            <div className="flex justify-between items-center mb-6">
              <span className="font-black uppercase tracking-widest text-xs opacity-80">
                Total Refund Credit
              </span>
              <span className="text-4xl font-black tracking-tighter">
                {totalRefund.toFixed(2)}
              </span>
            </div>
            <button
              onClick={submitRefund}
              disabled={loading || totalRefund === 0}
              className="w-full bg-primary text-primary-foreground font-black uppercase py-5 rounded-2xl shadow-lg hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? "PROCESSING..." : "CONFIRM & PRINT REFUND"}
            </button>
          </div>
        </section>
      )}

      {printJob && (
        <PrintReceipt
          type="REFUND"
          data={printJob.data}
          onClose={() => setPrintJob(null)}
        />
      )}
    </div>
  );
};

export default RefundComponent;
