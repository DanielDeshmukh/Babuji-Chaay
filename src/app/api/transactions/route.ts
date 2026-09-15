import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { requireSession } from "@/lib/admin";

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
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const client = getClient();

    let result;
    if (start && end) {
      const s = start.replace("T", " ");
      const e = end.replace("T", " ");
      result = await client.execute({
        sql: "SELECT * FROM transactions WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC",
        args: [s, e],
      });
    } else {
      result = await client.execute({
        sql: "SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100",
        args: [],
      });
    }

    return NextResponse.json({ transactions: result.rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const client = getClient();

    const today = new Date().toISOString().split("T")[0];
    const todayStart = `${today} 00:00:00`;
    const todayEnd = `${today} 23:59:59`;

    const countResult = await client.execute({
      sql: "SELECT count(*) as count FROM transactions WHERE created_at >= ? AND created_at <= ? AND transaction_type = ?",
      args: [todayStart, todayEnd, "SALE"],
    });

    const dailyBillNo = Number(countResult.rows[0]?.count || 0) + 1;
    const transactionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    await client.execute({
      sql: "INSERT INTO transactions (id, user_id, transaction_type, daily_bill_no, total_amount, discount, cash_paid, upi_paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [
        transactionId,
        "admin",
        "SALE",
        dailyBillNo,
        body.total_amount || 0,
        body.discount || 0,
        body.cash_paid || 0,
        body.upi_paid || 0,
      ],
    });

    if (body.items?.length) {
      for (const item of body.items) {
        await client.execute({
          sql: "INSERT INTO transaction_items (transaction_id, product_id, user_id, quantity, unit_price, price, item_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [
            transactionId,
            item.product_id,
            "admin",
            item.quantity,
            item.unit_price,
            item.unit_price * item.quantity,
            "SALE",
          ],
        });

        await client.execute({
          sql: "UPDATE products SET quantity = MAX(0, quantity - ?) WHERE id = ?",
          args: [item.quantity, item.product_id],
        });

        await client.execute({
          sql: "UPDATE todays_menu SET quantity = MAX(0, quantity - ?) WHERE product_id = ?",
          args: [item.quantity, item.product_id],
        });
      }
    }

    return NextResponse.json({ sale: { id: transactionId, daily_bill_no: dailyBillNo } });
  } catch (err: unknown) {
    console.error("Transaction POST error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireSession();
    const body = await req.json();
    const client = getClient();
    const { id, ...fields } = body;

    const sets = Object.keys(fields)
      .map((k) => `${k} = ?`)
      .join(", ");
    const vals = Object.values(fields);

    await client.execute({
      sql: `UPDATE transactions SET ${sets} WHERE id = ?`,
      args: [...vals, id],
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
