// script.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import reportRoutes from "./routes/reportRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import refundRoutes from "./routes/refundRoutes.js";

import { pool } from "./db/neonClient.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

console.log("🚀 Starting server bootstrap...");
console.log("🔐 ENV CHECK:", {
  PORT: port,
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
});

// ------------------------------------------------------------------
// ✅ GLOBAL MIDDLEWARES
// ------------------------------------------------------------------

// CORS (MUST be first)
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
console.log("✅ CORS middleware loaded");

// JSON body parser
app.use(express.json());
console.log("✅ express.json() middleware loaded");

// Cookie parser
app.use(cookieParser());
console.log("✅ cookie-parser middleware loaded");

// Preflight handling
app.options(/.*/, cors());
console.log("✅ OPTIONS preflight enabled");

// ------------------------------------------------------------------
// 🔐 AUTH SESSION BRIDGE (Supabase → Cookie)
// ------------------------------------------------------------------

app.post("/auth/session", (req, res) => {
  console.log("🔐 [/auth/session] Incoming request");
  console.log("📦 Request body:", req.body);

  const { access_token } = req.body;
  if (!access_token) {
    console.warn("⚠️ Missing access_token");
    return res.status(400).json({ error: "Missing access_token" });
  }

  res.cookie("sb-access-token", access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // ⚠️ true in production HTTPS
    path: "/",
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  console.log("🍪 sb-access-token cookie SET");
  res.json({ ok: true });
});

// ------------------------------------------------------------------
// 🧪 HEALTH CHECK
// ------------------------------------------------------------------

app.get("/", (req, res) => {
  console.log("📡 Health check hit");
  res.send("Hello World! 🚀 Server is up and running.");
});

// ------------------------------------------------------------------
// 📦 API ROUTES
// ------------------------------------------------------------------

console.log("📦 Registering API routes...");

app.use(
  "/api/reports",
  (req, res, next) => {
    console.log("➡️ /api/reports hit");
    next();
  },
  reportRoutes
);

app.use(
  "/api/transactions",
  (req, res, next) => {
    console.log("➡️ /api/transactions hit");
    console.log("🍪 Cookies received:", req.cookies);
    console.log(
      "🔐 Authorization header:",
      req.headers.authorization || "NONE"
    );
    next();
  },
  transactionRoutes
);

app.use("/api/exports", (req, res, next) => {
  console.log("➡️ /api/exports hit");
  exportRoutes(req, res, next);
});

app.use("/api/refund", (req, res, next) => {
  console.log("➡️ /api/refund hit");
  refundRoutes(req, res, next);
});

// ------------------------------------------------------------------
// 🧪 DATABASE CONNECTIVITY TEST
// ------------------------------------------------------------------

app.get("/api/db-test", async (req, res) => {
  console.log("🧪 DB test endpoint hit");
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ DB connected at", result.rows[0].now);
    res.json({ connected: true, time: result.rows[0].now });
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
    res.status(500).json({ connected: false, error: err.message });
  }
});

// ------------------------------------------------------------------
// ❌ 404 HANDLER
// ------------------------------------------------------------------

app.use((req, res) => {
  console.warn("❌ 404 Route not found:", req.method, req.originalUrl);
  res.status(404).json({ error: "Route not found" });
});

// ------------------------------------------------------------------
// 🚀 START SERVER
// ------------------------------------------------------------------

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
