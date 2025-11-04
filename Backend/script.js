// app.js
import express from "express"
import dotenv from "dotenv"
import reportRoutes from "./routes/reportRoutes.js"

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

// Middleware
app.use(express.json())

// Routes
app.get("/", (req, res) => {
  res.send("Hello World! 🚀 Server is up and running.")
})

// Mount your report routes
app.use("/api/reports", reportRoutes)

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" })
})

// Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`)
})
