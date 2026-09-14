import { NextResponse } from "next/server";
import { requireSession } from "@/lib/admin";
import ExcelJS from "exceljs";
import db from "@/lib/db";
import { transactions, transactionItems, products } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const dateRangeStart = searchParams.get("dateRangeStart");
    const dateRangeEnd = searchParams.get("dateRangeEnd");
    const singleDate = searchParams.get("singleDate");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Babuji Chaay";
    workbook.created = new Date();

    if (type === "monthly" && dateRangeStart && dateRangeEnd) {
      const sheet = workbook.addWorksheet("Monthly Sales Summary");

      sheet.columns = [
        { header: "Txn ID", key: "id", width: 40 },
        { header: "Date", key: "date", width: 20 },
        { header: "Bill No", key: "bill_no", width: 10 },
        { header: "Type", key: "type", width: 10 },
        { header: "Total Amount", key: "total", width: 15 },
        { header: "Discount", key: "discount", width: 15 },
        { header: "Cash Paid", key: "cash", width: 15 },
        { header: "UPI Paid", key: "upi", width: 15 },
      ];

      const start = `${dateRangeStart}T00:00:00`;
      const end = `${dateRangeEnd}T23:59:59`;

      const rows = await db.query.transactions.findMany({
        where: and(gte(transactions.createdAt, start), lte(transactions.createdAt, end)),
      });

      for (const row of rows) {
        sheet.addRow({
          id: row.id,
          date: row.createdAt,
          bill_no: row.dailyBillNo,
          type: row.transactionType,
          total: row.totalAmount,
          discount: row.discount,
          cash: row.cashPaid,
          upi: row.upiPaid,
        });
      }
    } else if (type === "daily" && singleDate) {
      const sheet = workbook.addWorksheet("Daily Itemized Sales");

      sheet.columns = [
        { header: "Bill No", key: "bill_no", width: 10 },
        { header: "Product", key: "product", width: 30 },
        { header: "Qty", key: "qty", width: 8 },
        { header: "Unit Price", key: "price", width: 12 },
        { header: "Total", key: "total", width: 12 },
        { header: "Type", key: "type", width: 10 },
      ];

      const start = `${singleDate}T00:00:00`;
      const end = `${singleDate}T23:59:59`;

      const dayTransactions = await db.query.transactions.findMany({
        where: and(gte(transactions.createdAt, start), lte(transactions.createdAt, end)),
      });

      for (const txn of dayTransactions) {
        const items = await db.query.transactionItems.findMany({
          where: eq(transactionItems.transactionId, txn.id),
        });

        for (const item of items) {
          const product = await db.query.products.findFirst({
            where: eq(products.id, item.productId),
          });

          sheet.addRow({
            bill_no: txn.dailyBillNo,
            product: product?.name || "Unknown",
            qty: item.quantity,
            price: item.unitPrice,
            total: item.price,
            type: item.itemType,
          });
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="babuji-chaay-export.xlsx"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
