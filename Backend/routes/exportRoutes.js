// backend/routes/exportRoutes.js (MUST BE CHANGED TO GET)

import express from 'express';
import {exportSalesData} from '../controllers/exportController.js'; 

const router = express.Router();

// FIX: Change to router.get() to match your browser testing method
router.get('/sales', (req, res, next) => {
    console.log("🚀 HITTING /api/exports/sales GET ENDPOINT");
    exportSalesData(req, res, next);
});

export default router;