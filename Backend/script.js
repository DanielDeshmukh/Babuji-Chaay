// script.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { requireAuth } from "./middleware/auth.js";

import reportRoutes from "./routes/reportRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import refundRoutes from "./routes/refundRoutes.js";

import { pool } from "./db/neonClient.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ------------------------------------------------------------------
// ✅ GLOBAL MIDDLEWARES
// ------------------------------------------------------------------

// CORS (MUST be first)
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost",
  "capacitor://localhost",
  "https://babuji-chaay-backend.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// JSON body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Preflight handling
app.options(/.*/, cors());

// ------------------------------------------------------------------
// 🔐 AUTH SESSION BRIDGE (Supabase → Cookie)
// ------------------------------------------------------------------

app.post("/auth/session", (req, res) => {
  const { access_token } = req.body;
  if (!access_token) {
    return res.status(400).json({ error: "Missing access_token" });
  }

  res.cookie("sb-access-token", access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // ⚠️ true in production HTTPS
    path: "/",
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  res.json({ ok: true });
});

// ------------------------------------------------------------------
// 🧪 HEALTH CHECK
// ------------------------------------------------------------------

app.get("/", (req, res) => {
  res.send("Hello World! 🚀 Server is up and running.");
});

// ------------------------------------------------------------------
// 📦 API ROUTES
// ------------------------------------------------------------------

app.use("/api/reports", requireAuth, reportRoutes);
app.use("/api/transactions", requireAuth, transactionRoutes);
app.use("/api/exports", requireAuth, exportRoutes);
app.use("/api/refund", refundRoutes);


// ------------------------------------------------------------------
// 🧪 DATABASE CONNECTIVITY TEST
// ------------------------------------------------------------------

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
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
  res.status(404).json({ error: "Route not found" });
});

// ------------------------------------------------------------------
// 🚀 START SERVER
// ------------------------------------------------------------------

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
