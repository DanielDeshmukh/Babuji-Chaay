// routes/reportRoutes.js
import express from "express"
import { generateSalesReport } from "../controllers/reportController.js"

const router = express.Router()

router.get("/generate", generateSalesReport)

export default router
