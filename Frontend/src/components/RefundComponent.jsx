"use client";

import React, { useState } from "react";
import supabase from "@/lib/supabaseClient";
import PrintReceipt from "@/components/PrintReceipt";

const RefundComponent = () => {
  const [billDate, setBillDate] = useState("");
  const [billNo, setBillNo] = useState("");
  const [transaction, setTransaction] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [printJob, setPrintJob] = useState(null);
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

  if (!billDate || !billNo) return setErrorMsg("Enter Date & Bill No.");

  setLoading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setErrorMsg("Auth Error");

    /** * THE FIX: Explicitly define the window in IST (+05:30).
     * This ensures the query captures early-morning transactions
     * that technically fall into the previous day in UTC.
     */
    const start = `${billDate}T00:00:00+05:30`;
    const end = `${billDate}T23:59:59+05:30`;

    const { data: trx, error: trxErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("daily_bill_no", Number(billNo))
      .eq("user_id", user.id)
      .gte("created_at", start)
      .lte("created_at", end)
      .single();

    if (trxErr || !trx) throw new Error("Bill not found.");

    setTransaction(trx);

    const { data: items, error: itemsErr } = await supabase
      .from("transaction_items")
      .select("id, product_id, quantity, unit_price, products(name)")
      .eq("transaction_id", trx.id)
      .eq("item_type", "SALE");

    if (itemsErr || !items || items.length === 0) throw new Error("No sale items found.");

    setBillItems(items.map(i => ({
      id: i.id,
      product_id: i.product_id,
      quantity: Number(i.quantity),
      price: Number(i.unit_price),
      name: i.products?.name || "Unnamed Product"
    })));
  } catch (err) {
    setErrorMsg(err.message);
  } finally {
    setLoading(false);
  }
};

  const updateRefundQty = (itemId, newQty) => {
    const item = billItems.find(i => i.id === itemId);
    const qty = Math.max(0, Math.min(Number(newQty), item.quantity));

    setSelectedRefunds(prev => {
      const filtered = prev.filter(x => x.billing_item_id !== itemId);
      return qty === 0 ? filtered : [...filtered, { billing_item_id: itemId, refund_qty: qty }];
    });
  };

  const totalRefund = selectedRefunds.reduce((sum, entry) => {
    const item = billItems.find(i => i.id === entry.billing_item_id);
    return sum + (entry.refund_qty * (item?.price || 0));
  }, 0);

  const submitRefund = async () => {
    if (!transaction || selectedRefunds.length === 0) return;
    setLoading(true);

    try {
      const entriesToInsert = selectedRefunds.map(entry => {
        const item = billItems.find(i => i.id === entry.billing_item_id);
        return {
          transaction_id: transaction.id,
          product_id: item.product_id,
          quantity: entry.refund_qty,
          unit_price: item.price,
          price: item.price * entry.refund_qty,
          item_type: "REFUND",
        };
      });

      const { error } = await supabase.from("transaction_items").insert(entriesToInsert);
      if (error) throw error;

      await supabase.from("transactions").update({
        refund: entriesToInsert.map(e => ({ product_id: e.product_id, qty: e.quantity, value: e.price }))
      }).eq("id", transaction.id);

      setPrintJob({
        type: "REFUND",
        data: {
          shopName: "BABUJI CHAAY",
          billNo: transaction.daily_bill_no,
          date: new Date().toLocaleString(),
          items: entriesToInsert.map(e => ({
            name: billItems.find(bi => bi.product_id === e.product_id).name,
            qty: e.quantity,
            price: e.unit_price,
            amt: e.price
          })),
          total: totalRefund
        }
      });

      setSuccessMsg("REFUND COMPLETE");
      setTimeout(() => {
        setBillItems([]);
        setTransaction(null);
        setBillNo("");
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <header className="mb-8 border-b-4 border-destructive pb-4">
        <h1 className="text-4xl font-black tracking-tighter">REFUND CENTER</h1>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Reversal & Credit Processing</p>
      </header>

      {/* STEP 1: BILL LOOKUP */}
      <section className="bg-card border-2 border-border p-6 rounded-2xl mb-6 shadow-sm">
        <h3 className="text-xs font-black uppercase mb-4 flex items-center gap-2">
          <span className="w-5 h-5 bg-primary text-primary-foreground flex items-center justify-center rounded-full text-[10px]">1</span>
          Locate Original Transaction
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase ml-1">Date of Purchase</label>
            <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)}
              className="w-full bg-background border-2 border-muted p-3 rounded-xl font-bold focus:border-primary outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase ml-1">Daily Bill Number</label>
            <input type="number" value={billNo} onChange={e => setBillNo(e.target.value)} placeholder="000"
              className="w-full bg-background border-2 border-muted p-3 rounded-xl font-bold focus:border-primary outline-none" />
          </div>
        </div>
        <button onClick={fetchBill} disabled={loading}
          className="w-full bg-foreground text-background font-black uppercase py-4 rounded-xl hover:opacity-90 transition-all active:scale-[0.98]">
          {loading ? "SEARCHING..." : "FETCH RECEIPT"}
        </button>
      </section>

      {errorMsg && <div className="p-4 mb-6 bg-red-50 border-2 border-red-200 text-red-700 font-black text-center uppercase text-xs rounded-xl">{errorMsg}</div>}
      {successMsg && <div className="p-4 mb-6 bg-green-50 border-2 border-green-200 text-green-700 font-black text-center uppercase text-xs rounded-xl tracking-widest animate-bounce">{successMsg}</div>}

      {/* STEP 2: ITEM SELECTION */}
      {billItems.length > 0 && (
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between items-end mb-2 px-1">
            <h3 className="text-xs font-black uppercase flex items-center gap-2">
              <span className="w-5 h-5 bg-primary text-primary-foreground flex items-center justify-center rounded-full text-[10px]">2</span>
              Select Items to Return
            </h3>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Bill #{transaction?.daily_bill_no}</span>
          </div>

          <div className="space-y-3">
            {billItems.map((item) => {
              const currentRefund = getRefundQty(item.id);
              return (
                <div key={item.id} className="bg-card border-2 border-border p-4 rounded-2xl flex justify-between items-center group hover:border-primary transition-colors">
                  <div>
                    <h4 className="font-black uppercase text-sm leading-tight">{item.name}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Bought: {item.quantity} × ₹{item.price}</p>
                  </div>
                  <div className="flex items-center bg-background border-2 border-muted rounded-xl p-1 gap-1">
                    <button onClick={() => updateRefundQty(item.id, currentRefund - 1)} className="w-8 h-8 flex items-center justify-center font-black hover:bg-muted rounded-lg">-</button>
                    <span className="w-10 text-center font-black text-sm">{currentRefund}</span>
                    <button onClick={() => updateRefundQty(item.id, currentRefund + 1)} className="w-8 h-8 flex items-center justify-center font-black hover:bg-muted rounded-lg">+</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TOTAL & SUBMIT */}
          <div className="mt-8 bg-destructive p-6 rounded-[2.5rem] text-destructive-foreground shadow-xl shadow-destructive/20">
            <div className="flex justify-between items-center mb-6">
              <span className="font-black uppercase tracking-widest text-xs opacity-80">Total Refund Credit</span>
              <span className="text-4xl font-black tracking-tighter">₹{totalRefund.toFixed(2)}</span>
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
        <PrintReceipt type="REFUND" data={printJob.data} onClose={() => setPrintJob(null)} />
      )}
    </div>
  );
};

export default RefundComponent;