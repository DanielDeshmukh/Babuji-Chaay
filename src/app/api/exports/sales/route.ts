import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireSession } from "@/lib/admin";
import ExcelJS from "exceljs";

function getClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "monthly";
    const dateRangeStart = searchParams.get("dateRangeStart");
    const dateRangeEnd = searchParams.get("dateRangeEnd");
    const singleDate = searchParams.get("singleDate");
    const client = getClient();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Babuji Chaay";
    workbook.created = new Date();

    if (type === "daily" && singleDate) {
      const start = `${singleDate} 00:00:00`;
      const end = `${singleDate} 23:59:59`;

      const txnResult = await client.execute({
        sql: "SELECT * FROM transactions WHERE created_at >= ? AND created_at <= ? AND transaction_type = ? ORDER BY created_at ASC",
        args: [start, end, "SALE"],
      });

      const sheet = workbook.addWorksheet(`Daily ${singleDate}`);
      sheet.columns = [
        { header: "Txn ID", key: "id", width: 30 },
        { header: "Bill #", key: "daily_bill_no", width: 10 },
        { header: "Time", key: "time", width: 18 },
        { header: "Items", key: "items", width: 8 },
        { header: "Subtotal", key: "total_amount", width: 12 },
        { header: "Discount", key: "discount", width: 12 },
        { header: "Net Total", key: "net", width: 12 },
        { header: "Cash", key: "cash_paid", width: 12 },
        { header: "UPI", key: "upi_paid", width: 12 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B3A2A" } };

      let totalSales = 0;
      let totalCash = 0;
      let totalUpi = 0;

      for (const txn of txnResult.rows) {
        const itemsResult = await client.execute({
          sql: "SELECT COUNT(*) as cnt FROM transaction_items WHERE transaction_id = ?",
          args: [txn.id],
        });
        const itemCount = Number(itemsResult.rows[0]?.cnt || 0);
        const totalAmt = Number(txn.total_amount) || 0;
        const disc = Number(txn.discount) || 0;

        const row = sheet.addRow({
          id: txn.id,
          daily_bill_no: txn.daily_bill_no,
          time: String(txn.created_at).slice(11, 19),
          items: itemCount,
          total_amount: totalAmt,
          discount: disc,
          net: totalAmt - disc,
          cash_paid: Number(txn.cash_paid) || 0,
          upi_paid: Number(txn.upi_paid) || 0,
        });
        row.alignment = { vertical: "middle" };

        totalSales += totalAmt - disc;
        totalCash += Number(txn.cash_paid) || 0;
        totalUpi += Number(txn.upi_paid) || 0;
      }

      const summaryRow = sheet.addRow({});
      sheet.addRow({ id: "TOTAL", net: totalSales, cash_paid: totalCash, upi_paid: totalUpi });
      const lastRow = sheet.getRow(sheet.rowCount);
      lastRow.font = { bold: true, size: 12 };
      lastRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4A017" } };

    } else {
      let txnResult;
      if (dateRangeStart && dateRangeEnd) {
        const start = dateRangeStart.replace("T", " ") + " 00:00:00";
        const end = dateRangeEnd.replace("T", " ") + " 23:59:59";
        txnResult = await client.execute({
          sql: "SELECT * FROM transactions WHERE created_at >= ? AND created_at <= ? AND transaction_type = ? ORDER BY created_at ASC",
          args: [start, end, "SALE"],
        });
      } else {
        txnResult = await client.execute({
          sql: "SELECT * FROM transactions WHERE transaction_type = ? ORDER BY created_at ASC",
          args: ["SALE"],
        });
      }

      const label = dateRangeStart && dateRangeEnd
        ? `${dateRangeStart} to ${dateRangeEnd}`
        : "All Time";
      const sheet = workbook.addWorksheet(`Monthly ${label}`);
      sheet.columns = [
        { header: "Date", key: "date", width: 14 },
        { header: "Bill #", key: "daily_bill_no", width: 10 },
        { header: "Items", key: "items", width: 8 },
        { header: "Subtotal", key: "total_amount", width: 12 },
        { header: "Discount", key: "discount", width: 12 },
        { header: "Net Total", key: "net", width: 12 },
        { header: "Cash", key: "cash_paid", width: 12 },
        { header: "UPI", key: "upi_paid", width: 12 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B3A2A" } };

      let totalSales = 0;
      let totalCash = 0;
      let totalUpi = 0;

      for (const txn of txnResult.rows) {
        const itemsResult = await client.execute({
          sql: "SELECT COUNT(*) as cnt FROM transaction_items WHERE transaction_id = ?",
          args: [txn.id],
        });
        const itemCount = Number(itemsResult.rows[0]?.cnt || 0);
        const totalAmt = Number(txn.total_amount) || 0;
        const disc = Number(txn.discount) || 0;

        sheet.addRow({
          date: String(txn.created_at).slice(0, 10),
          daily_bill_no: txn.daily_bill_no,
          items: itemCount,
          total_amount: totalAmt,
          discount: disc,
          net: totalAmt - disc,
          cash_paid: Number(txn.cash_paid) || 0,
          upi_paid: Number(txn.upi_paid) || 0,
        });

        totalSales += totalAmt - disc;
        totalCash += Number(txn.cash_paid) || 0;
        totalUpi += Number(txn.upi_paid) || 0;
      }

      sheet.addRow({});
      sheet.addRow({ date: "TOTAL", net: totalSales, cash_paid: totalCash, upi_paid: totalUpi });
      const lastRow = sheet.getRow(sheet.rowCount);
      lastRow.font = { bold: true, size: 12 };
      lastRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD4A017" } };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="babuji-chaay-report.xlsx"`,
      },
    });
  } catch (err: unknown) {
    console.error("Export error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
