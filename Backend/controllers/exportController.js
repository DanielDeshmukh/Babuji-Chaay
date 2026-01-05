
// D:/Vs Code/VS code/Babuji Chaay/Backend/controllers/exportController.js

import exceljs from 'exceljs';
import { supabase } from '../supabaseClient.js';

/**
 * Helper: Send Excel file to client
 */
const sendExcelResponse = async (res, filename, data, columns) => {
    const workbook = new exceljs.Workbook();
    const sheet = workbook.addWorksheet('Sales Export');

    sheet.columns = columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width || 15
    }));

    sheet.addRows(data);

    // Style header
    sheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBEBEB' } };
        cell.font = { bold: true, color: { argb: 'FF333333' } };
        cell.alignment = { horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thick' },
            right: { style: 'thin' }
        };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
};


/**
 * Helper: Convert flat transactions into PER-ITEM rows
 */
const expandTransactionItems = (transactions) => {
    const rows = [];

    transactions.forEach(tx => {
        const items = Array.isArray(tx.products) ? tx.products : [];

        if (items.length === 0) {
            // Still push a row if no items found
            rows.push({
                transaction_id: tx.id,
                bill_no: tx.daily_bill_no,
                datetime: tx.created_at,
                product_name: "—",
                quantity: "—",
                price: "—",
                line_total: "—",
                discount: tx.discount,
                cash_paid: tx.cash_paid,
                upi_paid: tx.upi_paid
            });
        } else {
            items.forEach(item => {
                rows.push({
                    transaction_id: tx.id,
                    bill_no: tx.daily_bill_no,
                    datetime: tx.created_at,
                    product_name: item.name || item.product_name || "Unknown",
                    quantity: item.quantity || 1,
                    price: item.price || item.rate || 0,
                    line_total: (item.quantity || 1) * (item.price || 0),
                    discount: tx.discount,
                    cash_paid: tx.cash_paid,
                    upi_paid: tx.upi_paid
                });
            });
        }
    });

    return rows;
};


/**
 * Main Export Controller (Daily or Monthly)
 */
export const exportSalesData = async (req, res) => {
    const userId = req.userId;
    console.log("[EXPORT] user:", userId);

    const { type, monthYear, dateRangeStart, dateRangeEnd } = req.query;

    const dateRange = {
        start: dateRangeStart,
        end: dateRangeEnd
    };

    console.log("EXPORT CONTROLLER TRIGGERED");
    console.log(req.query);

    let queryStart, queryEnd;
    let filename = "";

    try {
        // DAILY export uses given date range
        if (type === "daily") {
            queryStart = `${dateRange.start}T00:00:00+05:30`;
            queryEnd = `${dateRange.end}T23:59:59+05:30`;

            filename = `Daily_Transactions_${dateRange.start}_to_${dateRange.end}.xlsx`;
        }

        // MONTHLY also uses given date range (user selects start & end)
        else if (type === "monthly") {
            queryStart = `${dateRange.start}T00:00:00+05:30`;
            queryEnd = `${dateRange.end}T23:59:59+05:30`;

            filename = `Monthly_Transactions_${dateRange.start}_to_${dateRange.end}.xlsx`;
        }

        if (!type || !dateRange.start || !dateRange.end) {
            return res.status(400).json({ message: "Invalid export parameters" });
        }


        // Fetch transactions
        const { data: txs, error } = await supabase
            .from('transactions')
            .select('id, total_amount, discount, cash_paid, upi_paid, created_at, daily_bill_no, products')
            .eq('user_id', userId)   // 🔐 HARD ISOLATION
            .gte('created_at', queryStart)
            .lte('created_at', queryEnd)
            .order('created_at', { ascending: true });


        if (error) throw error;

        if (!txs || txs.length === 0) {
            return res.status(404).json({ message: "No transactions found." });
        }

        // EXPAND into per-item rows
        const expandedRows = expandTransactionItems(txs);

        const columns = [
            { header: 'Txn ID', key: 'transaction_id', width: 12 },
            { header: 'Bill No', key: 'bill_no', width: 10 },
            { header: 'Date & Time', key: 'datetime', width: 22 },
            { header: 'Product Name', key: 'product_name', width: 25 },
            { header: 'Qty', key: 'quantity', width: 8 },
            { header: 'Price', key: 'price', width: 12 },
            { header: 'Line Total', key: 'line_total', width: 15 },
            { header: 'Discount', key: 'discount', width: 12 },
            { header: 'Cash Paid', key: 'cash_paid', width: 12 },
            { header: 'UPI Paid', key: 'upi_paid', width: 12 },
        ];

        await sendExcelResponse(res, filename, expandedRows, columns);

    } catch (err) {
        console.error("EXPORT ERROR:", err);
        res.status(500).json({ message: "Failed to generate Excel export", error: err.message });
    }
};
