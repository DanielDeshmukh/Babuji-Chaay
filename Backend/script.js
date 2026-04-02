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

const normalizeOrigin = (value) => value.trim().replace(/\/$/, "");

const envOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set(
  [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost",
    "capacitor://localhost",
    "https://babujichaay.netlify.app",
    ...envOrigins,
  ].map(normalizeOrigin)
);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);
    if (allowedOrigins.has(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.options(/.*/, cors(corsOptions));

app.post("/auth/session", (req, res) => {
  const { access_token } = req.body;
  if (!access_token) {
    return res.status(400).json({ error: "Missing access_token" });
  }

  res.cookie("sb-access-token", access_token, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 1000,
  });

  res.json({ ok: true });
});

app.get("/", (req, res) => {
  res.send("Hello World! Server is up and running.");
});

app.use("/api/reports", requireAuth, reportRoutes);
app.use("/api/transactions", requireAuth, transactionRoutes);
app.use("/api/exports", requireAuth, exportRoutes);
app.use("/api/refund", refundRoutes);

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ connected: true, time: result.rows[0].now });
  } catch (err) {
    console.error("Database connection error:", err.message);
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
