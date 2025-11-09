import express from "express";
import {
  viewTransactions,
  viewTransactionInvoice,
} from "../controllers/transactionController.js";

const router = express.Router();

// ✅ Show all transactions
router.get("/", viewTransactions);

// ✅ Show single transaction by daily_bill_no
router.get("/daily/:billNo/invoice", viewTransactionInvoice);

export default router;
