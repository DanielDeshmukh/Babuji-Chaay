// app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import reportRoutes from "./routes/reportRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// --- MIDDLEWARES --- //

// ✅ Always enable CORS *before* defining routes
app.use(
  cors({
    origin: "http://localhost:5173", // React app
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ✅ Handle preflight requests globally
app.options(/.*/, cors());


// ✅ Parse JSON bodies
app.use(express.json());

// --- ROUTES --- //
app.get("/", (req, res) => {
  res.send("Hello World! 🚀 Server is up and running.");
});

app.use("/api/reports", reportRoutes);

// --- 404 HANDLER --- //
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// --- START SERVER --- //
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
