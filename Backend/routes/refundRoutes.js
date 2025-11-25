import express from "express";
import {
  recordRefund,
  getRefundReceipt,
  listRefunds
} from "../controllers/refundController.js";

const router = express.Router();

router.post("/record", recordRefund);
router.get("/:transaction_id/receipt", getRefundReceipt);
router.get("/list", listRefunds);

export default router;
