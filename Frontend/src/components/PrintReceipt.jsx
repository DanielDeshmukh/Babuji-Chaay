"use client";

import React, { useEffect, useState, useRef } from "react";

const PrintReceipt = ({ type, data, onClose }) => {
  const [printStatus, setPrintStatus] = useState("pending");
  const hasPrinted = useRef(false);

  const shopName = "BABUJI CHAAY";
  const shopAddress = "Shop no. 7, K.D. Empire, Mira Road (E), Thane - 401107";
  const shopPhone = "+91 9076165666";

  const isRefund = type === "REFUND";

  const handleManualPrint = () => {
    try {
      const safeDate = data.date.replace(/[/,:]/g, "-").replace(/\s/g, "_");
      document.title = `${shopName.replace(/\s/g, "_")}_${type}_Bill-${data.billNo}_${safeDate}`;
      window.print();
      setPrintStatus("printed");
    } catch (err) {
      setPrintStatus("failed");
    }
  };

  useEffect(() => {
    if (hasPrinted.current) return;
    hasPrinted.current = true;
    const timer = setTimeout(() => handleManualPrint(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="receipt-overlay no-print">
      {/* PROFESSIONAL OVERLAY UI */}
      <div className="controls-card">
        <div className="controls-header">
          <h2>{isRefund ? "Refund Processing" : "Payment Successful"}</h2>
          <p>Bill #{data.billNo} is ready for printing.</p>
        </div>
        <div className="controls-actions">
          <button className="btn-primary" onClick={handleManualPrint}>
            Print Receipt
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* THE 58MM THERMAL RECEIPT */}
      <div className="receipt-container">
        <div className="receipt">
          {/* Header */}
          <div className="center bold large-text">{shopName}</div>
          <div className="center x-small-text">{shopAddress}</div>
          <div className="center x-small-text">Tel: {shopPhone}</div>

          <div className="separator" />
          <div className="center bold medium-text">
            {isRefund ? "REFUND VOUCHER" : "TAX INVOICE / BILL"}
          </div>
          <div className="separator" />

          {/* Metadata */}
          <div className="row x-small-text">
            <span>Bill No: {data.billNo}</span>
            <span>{data.date.split(',')[1]}</span>
          </div>
          <div className="row x-small-text">
            <span>Date: {data.date.split(',')[0]}</span>
            <span>Type: {isRefund ? 'REF' : 'SALE'}</span>
          </div>

          <div className="separator" />

          {/* Items Table */}
          <div className="row bold x-small-text">
            <span className="col-qty">QTY</span>
            <span className="col-desc">ITEM</span>
            <span className="col-amt">AMT</span>
          </div>
          <div className="separator-thin" />

          {data.items.map((item, idx) => (
            <div key={idx} className="item-row x-small-text">
              <div className="row">
                <span className="col-qty">{item.qty}</span>
                <span className="col-desc">{item.name.toUpperCase()}</span>
                <span className="col-amt">
                   {isRefund ? '-' : ''}{item.amt.toFixed(2)}
                </span>
              </div>
              <div className="row italic xx-small-text">
                <span className="col-qty"></span>
                <span className="col-desc">@ {item.price.toFixed(2)} per unit</span>
              </div>
            </div>
          ))}

          <div className="separator" />

          {/* Summary Section */}
          <div className="row small-text">
            <span>SUBTOTAL</span>
            <span>{data.subtotal.toFixed(2)}</span>
          </div>

          {!isRefund && data.discount > 0 && (
            <div className="row small-text">
              <span>DISCOUNT</span>
              <span>-{data.discount.toFixed(2)}</span>
            </div>
          )}

          {!isRefund && (
            <div className="payment-breakdown xx-small-text italic">
              <div className="row">
                <span>CASH TENDERED</span>
                <span>{data.cashPaid?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="row">
                <span>UPI SETTLED</span>
                <span>{data.upiPaid?.toFixed(2) || "0.00"}</span>
              </div>
            </div>
          )}

          <div className="separator-double" />
          <div className="row bold medium-text">
            <span>{isRefund ? "REFUND TOTAL" : "NET AMOUNT"}</span>
            <span>INR {data.total.toFixed(2)}</span>
          </div>
          <div className="separator-double" />

          {/* Footer */}
          <div className="center bold x-small-text mt-2">
            {isRefund ? "REFUND ACKNOWLEDGEMENT" : "THANK YOU! VISIT AGAIN"}
          </div>
          <div className="center xx-small-text italic">
            Computer Generated Invoice
          </div>
        </div>
      </div>

      <style>{`
        /* SCREEN DISPLAY */
        .receipt-overlay {
          position: fixed; top: 0; left: 0;
          width: 100vw; height: 100vh;
          background: rgba(15, 15, 15, 0.95);
          z-index: 9999; display: flex; flex-direction: column;
          align-items: center; justify-content: center; padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .controls-card {
          background: #fff; padding: 24px; border-radius: 8px;
          margin-bottom: 24px; width: 100%; max-width: 340px;
          text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        
        .controls-header h2 { margin: 0; font-size: 1.25rem; color: #111; }
        .controls-header p { margin: 8px 0 20px; font-size: 0.9rem; color: #666; }

        .controls-actions { display: flex; gap: 12px; }
        .btn-primary { 
          flex: 2; background: #111; color: #fff; border: none; 
          padding: 12px; border-radius: 6px; font-weight: 600; cursor: pointer;
        }
        .btn-secondary { 
          flex: 1; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db;
          padding: 12px; border-radius: 6px; font-weight: 600; cursor: pointer;
        }

        .receipt-container {
          background: #fff; padding: 4mm; box-shadow: 0 0 40px rgba(0,0,0,0.3);
        }

        /* THERMAL RECEIPT STYLING */
        .receipt {
          width: 58mm; color: #000;
          font-family: 'Courier New', Courier, monospace;
          line-height: 1.2;
        }

        .center { text-align: center; }
        .bold { font-weight: bold; }
        .italic { font-style: italic; }
        .mt-2 { margin-top: 8px; }

        .large-text { font-size: 16px; margin-bottom: 2px; }
        .medium-text { font-size: 14px; }
        .small-text { font-size: 12px; }
        .x-small-text { font-size: 11px; }
        .xx-small-text { font-size: 10px; }

        .separator { border-top: 1px dashed #000; margin: 6px 0; }
        .separator-thin { border-top: 0.5px solid #000; margin: 4px 0; }
        .separator-double { border-top: 1px double #000; border-bottom: 1px double #000; height: 3px; margin: 6px 0; }

        .row { display: flex; justify-content: space-between; align-items: flex-start; }
        .item-row { margin-bottom: 6px; }

        .col-qty { width: 15%; text-align: left; }
        .col-desc { width: 55%; text-align: left; overflow-wrap: break-word; }
        .col-amt { width: 30%; text-align: right; }

        .payment-breakdown { margin-top: 4px; padding-left: 8px; border-left: 1px solid #eee; }

        /* PRINT SETTINGS */
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .receipt-container, .receipt-container * { visibility: visible; }
          .receipt-container { 
            position: absolute; left: 0; top: 0; 
            width: 58mm; padding: 0; margin: 0;
            box-shadow: none;
          }
          .receipt { width: 58mm; padding: 2mm; margin: 0; }
          @page { size: 58mm auto; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default PrintReceipt;