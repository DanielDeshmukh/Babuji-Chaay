import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function migrate() {
  console.log("Connecting to Turso...");

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      full_name TEXT,
      avatar_url TEXT,
      pin TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES profiles(id),
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Uncategorized',
      quantity INTEGER NOT NULL DEFAULT 0,
      price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS todays_menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      name TEXT,
      category TEXT,
      price REAL NOT NULL,
      quantity INTEGER DEFAULT 0,
      is_available INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES profiles(id),
      transaction_type TEXT NOT NULL,
      daily_bill_no INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      cash_paid REAL NOT NULL DEFAULT 0,
      upi_paid REAL NOT NULL DEFAULT 0,
      parent_id TEXT,
      refunded_by TEXT,
      refund TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT NOT NULL REFERENCES transactions(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      user_id TEXT NOT NULL REFERENCES profiles(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      price REAL,
      item_type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES profiles(id),
      name TEXT NOT NULL,
      description TEXT,
      product_ids TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_recurring INTEGER NOT NULL DEFAULT 0,
      discount_type TEXT NOT NULL,
      discount_value REAL NOT NULL,
      day_of_week INTEGER,
      start_date TEXT,
      end_date TEXT
    );

    CREATE TABLE IF NOT EXISTS special_numbers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL,
      date TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES profiles(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS loss_dump_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      type TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES profiles(id),
      price_at_time REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_special_numbers_date_user
      ON special_numbers(date, user_id);

    CREATE INDEX IF NOT EXISTS idx_transactions_user
      ON transactions(user_id);

    CREATE INDEX IF NOT EXISTS idx_transactions_date
      ON transactions(created_at);

    CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction
      ON transaction_items(transaction_id);

    CREATE INDEX IF NOT EXISTS idx_products_user
      ON products(user_id);

    CREATE INDEX IF NOT EXISTS idx_todays_menu_product
      ON todays_menu(product_id);

    CREATE INDEX IF NOT EXISTS idx_loss_dump_logs_user
      ON loss_dump_logs(user_id);
  `);

  console.log("All tables and indexes created successfully!");

  // Verify
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log(
    "Tables:",
    tables.rows.map((r) => r.name).join(", ")
  );
}

migrate().catch(console.error);
