import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── profiles ──────────────────────────────────────────────
export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(), // UUID, matches auth user id
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  pin: text("pin"), // 4-digit PIN stored as text
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ─── products ──────────────────────────────────────────────
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => profiles.id),
  name: text("name").notNull(),
  category: text("category").default("Uncategorized"),
  quantity: integer("quantity").notNull().default(0),
  price: real("price").notNull().default(0),
});

// ─── todays_menu ───────────────────────────────────────────
export const todaysMenu = sqliteTable("todays_menu", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id),
  name: text("name"),
  category: text("category"),
  price: real("price").notNull(),
  quantity: integer("quantity").default(0),
  isAvailable: integer("is_available", { mode: "boolean" }).notNull().default(true),
});

// ─── transactions ──────────────────────────────────────────
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull().references(() => profiles.id),
  transactionType: text("transaction_type").notNull(), // "SALE" or "REFUND"
  dailyBillNo: integer("daily_bill_no").notNull(),
  totalAmount: real("total_amount").notNull(),
  discount: real("discount").notNull().default(0),
  cashPaid: real("cash_paid").notNull().default(0),
  upiPaid: real("upi_paid").notNull().default(0),
  parentId: text("parent_id"), // for refunds: links to original sale
  refundedBy: text("refunded_by"),
  refund: text("refund"), // JSON string: [{ product_id, qty, value }]
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ─── transaction_items ─────────────────────────────────────
export const transactionItems = sqliteTable("transaction_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: text("transaction_id").notNull().references(() => transactions.id),
  productId: integer("product_id").notNull().references(() => products.id),
  userId: text("user_id").notNull().references(() => profiles.id),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  price: real("price"),
  itemType: text("item_type").notNull(), // "SALE" or "REFUND"
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ─── offers ────────────────────────────────────────────────
export const offers = sqliteTable("offers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => profiles.id),
  name: text("name").notNull(),
  description: text("description"),
  productIds: text("product_ids").notNull(), // JSON array of product IDs
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  discountType: text("discount_type").notNull(), // "percentage", "fixed", "bogo"
  discountValue: real("discount_value").notNull(),
  dayOfWeek: integer("day_of_week"), // 0-6, only when is_recurring
  startDate: text("start_date"), // YYYY-MM-DD, only when !is_recurring
  endDate: text("end_date"), // YYYY-MM-DD, only when !is_recurring
});

// ─── special_numbers ───────────────────────────────────────
export const specialNumbers = sqliteTable("special_numbers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: integer("number").notNull(), // 1-100
  date: text("date").notNull(), // YYYY-MM-DD
  userId: text("user_id").notNull().references(() => profiles.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ─── loss_dump_logs ────────────────────────────────────────
export const lossDumpLogs = sqliteTable("loss_dump_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  type: text("type").notNull(), // "loss" or "dump"
  userId: text("user_id").notNull().references(() => profiles.id),
  priceAtTime: real("price_at_time").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});
