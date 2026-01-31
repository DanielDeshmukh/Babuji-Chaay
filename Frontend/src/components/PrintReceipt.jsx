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
      const content = document.getElementById("thermal-receipt-content").innerHTML;
      const safeDate = data.date.replace(/[/,:]/g, "-").replace(/\s/g, "_");
      document.title = `babuji-chaay_bill-no${data.billNo}_${safeDate}`;

      const pri = document.createElement('iframe');
      pri.style.position = 'absolute';
      pri.style.top = '-1000px';
      pri.style.left = '-1000px';
      document.body.appendChild(pri);

      const doc = pri.contentWindow.document;
      doc.open();
      doc.write(`
        <html>
          <head>
            <style>
              body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; width: 58mm; }
              .receipt { width: 58mm; color: #000; padding: 2mm; }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .italic { font-style: italic; }
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
              @page { size: 58mm auto; margin: 0; }
            </style>
          </head>
          <body>
            <div class="receipt">${content}</div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        pri.contentWindow.focus();
        pri.contentWindow.print();
        document.body.removeChild(pri);
        setPrintStatus("printed");
      }, 500);

    } catch (err) {
      console.error("Print Error:", err);
      setPrintStatus("failed");
    }
  };

  useEffect(() => {
    if (hasPrinted.current) return;
    hasPrinted.current = true;
    const timer = setTimeout(() => handleManualPrint(), 800);
    return () => clearTimeout(timer);
  }, []);

 return (
    <div className="receipt-overlay no-print">
      <div className="receipt-safe-wrapper">
        
        {/* 1. THE CONTROLS CARD */}
        <div className="controls-card-new">
          <div className="controls-header">
            <h2 style={{ margin: '0 0 5px 0', color: '#111' }}>
              {isRefund ? "Refund Processing" : "Payment Successful"}
            </h2>
            <p style={{ margin: '0 0 20px 0', color: '#666' }}>Bill #{data?.billNo} is ready.</p>
          </div>
          <div className="controls-actions">
            <button className="btn-primary" onClick={handleManualPrint}>Print</button>
            <button className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>

        {/* 2. THE RECEIPT */}
        <div className="receipt-container" id="thermal-receipt-content">
          <div className="receipt">
            <div className="center bold large-text">{shopName}</div>
            <div className="center x-small-text">{shopAddress}</div>
            <div className="center x-small-text">Tel: {shopPhone}</div>

            <div className="separator" />
            <div className="center bold medium-text">{isRefund ? "REFUND VOUCHER" : "TAX INVOICE / BILL"}</div>
            <div className="separator" />

            <div className="row x-small-text">
              <span>Bill No: {data?.billNo}</span>
              <span>{data?.date?.split(',')[1]}</span>
            </div>
            <div className="row x-small-text">
              <span>Date: {data?.date?.split(',')[0]}</span>
              <span>Type: {isRefund ? 'REF' : 'SALE'}</span>
            </div>

            <div className="separator" />
            <div className="row bold x-small-text">
              <span className="col-qty">QTY</span>
              <span className="col-desc">ITEM</span>
              <span className="col-amt">AMT</span>
            </div>
            <div className="separator-thin" />

            {data?.items?.map((item, idx) => (
              <div key={idx} className="item-row x-small-text">
                <div className="row">
                  <span className="col-qty">{item.qty}</span>
                  <span className="col-desc">{item.name.toUpperCase()}</span>
                  <span className="col-amt">{isRefund ? '-' : ''}{item.amt.toFixed(2)}</span>
                </div>
                <div className="row italic xx-small-text">
                  <span className="col-qty"></span>
                  <span className="col-desc">@ {item.price.toFixed(2)} per unit</span>
                </div>
              </div>
            ))}

            <div className="separator" />
            <div className="row small-text">
              <span>SUBTOTAL</span>
              <span>{data?.subtotal?.toFixed(2)}</span>
            </div>

            {!isRefund && data?.discount > 0 && (
              <div className="row small-text">
                <span>DISCOUNT</span>
                <span>-{data.discount.toFixed(2)}</span>
              </div>
            )}

            <div className="separator-double" />
            <div className="row bold medium-text">
              <span>{isRefund ? "REFUND TOTAL" : "NET AMOUNT"}</span>
              <span>INR {data?.total?.toFixed(2)}</span>
            </div>
            <div className="separator-double" />

            <div className="center bold x-small-text mt-2">THANK YOU! VISIT AGAIN</div>
            <div className="center xx-small-text italic">Computer Generated Invoice</div>
          </div>
        </div>
      </div>

      <style>{`
        .receipt-overlay {
          position: fixed;
          top: 0; left: 0;
          width: 100vw; height: 100vh;
          background: rgba(0, 0, 0, 0.95);
          z-index: 99999;
          overflow-y: scroll; /* Force scroll visibility */
          display: block; /* Remove Flexbox centering entirely */
        }

        .receipt-safe-wrapper {
          width: 100%;
          padding: 50px 0; /* Ensures content doesn't touch screen edges */
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .controls-card-new {
          background: #fff;
          padding: 30px;
          border-radius: 16px;
          width: 90%;
          max-width: 400px;
          margin-bottom: 30px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          text-align: center;
        }

        .receipt-container { 
          background: #fff; 
          padding: 20px; 
          box-shadow: 0 0 30px rgba(0,0,0,0.3);
          display: inline-block;
        }

        .receipt { width: 58mm; color: #000; font-family: 'Courier New', monospace; line-height: 1.3; }
        .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
        .col-qty { width: 15%; } .col-desc { width: 55%; } .col-amt { width: 30%; text-align: right; }
        
        .bold { font-weight: bold; } .center { text-align: center; } .italic { font-style: italic; }
        .large-text { font-size: 16px; } .medium-text { font-size: 14px; } .small-text { font-size: 12px; }
        .x-small-text { font-size: 11px; } .xx-small-text { font-size: 10px; }
        .separator { border-top: 1px dashed #000; margin: 8px 0; }
        .separator-thin { border-top: 0.5px solid #000; margin: 5px 0; }
        .separator-double { border-top: 1px double #000; border-bottom: 1px double #000; height: 4px; margin: 8px 0; }

        .controls-actions { display: flex; gap: 15px; }
        .btn-primary { flex: 2; background: #000; color: #fff; border: none; padding: 14px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem; }
        .btn-secondary { flex: 1; background: #f0f0f0; color: #333; border: none; padding: 14px; border-radius: 8px; cursor: pointer; font-size: 1rem; }

        @media print { 
          .no-print, .receipt-overlay { display: none !important; } 
        }
      `}</style>
    </div>
  );
};

export default PrintReceipt;