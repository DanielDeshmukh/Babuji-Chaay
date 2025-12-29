import express from "express";
import {
  recordRefund,
  getRefundReceipt,
  listRefunds
} from "../controllers/refundController.js";

const router = express.Router();

/**
 * STATIC ROUTES FIRST
 */
router.post("/record", recordRefund);
router.get("/list", listRefunds);

/**
 * DYNAMIC ROUTE LAST
 */
router.get("/:transaction_id/receipt", getRefundReceipt);

export default router;
