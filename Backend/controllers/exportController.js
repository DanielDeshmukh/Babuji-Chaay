// D:/Vs Code/VS code/Babuji Chaay/Backend/controllers/exportController.js

import exceljs from 'exceljs';
import { supabase } from '../supabaseClient.js';

const sendExcelResponse = async (res, filename, data, columns) => {
    const workbook = new exceljs.Workbook();
    const sheet = workbook.addWorksheet('Sales Export');

    sheet.columns = columns.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width || 15
    }));

    sheet.addRows(data);

    sheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBEBEB' } };
        cell.font = { bold: true, color: { argb: 'FF333333' } };
        cell.alignment = { horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thick' }, right: { style: 'thin' }
        };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
};

export const exportSalesData = async (req, res) => {
    const userId = req.userId || req.user?.id;
    const { type, dateRangeStart, dateRangeEnd, singleDate } = req.query;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let queryStart, queryEnd, filename;

    if (type === "daily") {
        queryStart = `${singleDate}T00:00:00+05:30`;
        queryEnd = `${singleDate}T23:59:59+05:30`;
        filename = `Daily_Itemized_${singleDate}.xlsx`;
    } else {
        queryStart = `${dateRangeStart}T00:00:00+05:30`;
        queryEnd = `${dateRangeEnd}T23:59:59+05:30`;
        filename = `Monthly_Summary_${dateRangeStart.substring(0, 7)}.xlsx`;
    }

    try {
        const { data: rawItems, error } = await supabase
            .from('transaction_items')
            .select(`
                quantity, unit_price, price, created_at, transaction_id, item_type,
                transactions!inner ( daily_bill_no, discount, cash_paid, upi_paid, user_id ),
                products ( name )
            `)
            .eq('transactions.user_id', userId)
            .gte('created_at', queryStart)
            .lte('created_at', queryEnd)
            .order('created_at', { ascending: true });

        if (error) throw error;
        if (!rawItems || rawItems.length === 0) return res.status(404).json({ message: "No records found." });

        let finalData = [];
        let columns = [];

        if (type === "daily") {
            columns = [
                { header: 'Txn ID', key: 'transaction_id', width: 12 },
                { header: 'Bill No', key: 'bill_no', width: 10 },
                { header: 'Type', key: 'item_type', width: 12 },
                { header: 'Date & Time', key: 'datetime', width: 22 },
                { header: 'Product Name', key: 'product_name', width: 25 },
                { header: 'Qty', key: 'quantity', width: 8 },
                { header: 'Unit Price', key: 'unit_price', width: 12 },
                { header: 'Line Total', key: 'line_total', width: 15 },
                { header: 'Discount', key: 'discount', width: 12 },
                { header: 'Cash Paid', key: 'cash_paid', width: 12 },
                { header: 'UPI Paid', key: 'upi_paid', width: 12 }
            ];

            finalData = rawItems.map(item => ({
                transaction_id: item.transaction_id,
                bill_no: item.transactions?.daily_bill_no || "—",
                item_type: item.item_type,
                datetime: new Date(item.created_at).toLocaleString('en-IN'),
                product_name: item.products?.name || "Unknown",
                quantity: item.quantity,
                unit_price: item.unit_price,
                line_total: item.price,
                discount: item.transactions?.discount || 0,
                cash_paid: item.transactions?.cash_paid || 0,
                upi_paid: item.transactions?.upi_paid || 0
            }));

        } else {
            // MONTHLY: Aggregating by both Txn ID and Type
            columns = [
                { header: 'Txn ID', key: 'transaction_id', width: 12 },
                { header: 'Bill No', key: 'bill_no', width: 12 },
                { header: 'Type', key: 'item_type', width: 12 },
                { header: 'Date & Time', key: 'datetime', width: 22 },
                { header: 'Items Sold Count', key: 'items_count', width: 15 },
                { header: 'Discount', key: 'discount', width: 12 },
                { header: 'Cash Paid', key: 'cash_paid', width: 12 },
                { header: 'UPI Paid', key: 'upi_paid', width: 12 }
            ];

            const summaryMap = new Map();

            rawItems.forEach(item => {
                // Create a unique key for each TxnID + Type combination
                const mapKey = `${item.transaction_id}_${item.item_type}`;
                
                if (!summaryMap.has(mapKey)) {
                    summaryMap.set(mapKey, {
                        transaction_id: item.transaction_id,
                        bill_no: item.transactions?.daily_bill_no || "—",
                        item_type: item.item_type,
                        datetime: new Date(item.created_at).toLocaleString('en-IN'),
                        items_count: 0,
                        discount: item.transactions?.discount || 0,
                        cash_paid: item.transactions?.cash_paid || 0,
                        upi_paid: item.transactions?.upi_paid || 0
                    });
                }
                summaryMap.get(mapKey).items_count += item.quantity;
            });

            finalData = Array.from(summaryMap.values());
        }

        await sendExcelResponse(res, filename, finalData, columns);

    } catch (err) {
        console.error("Export Error:", err);
        res.status(500).json({ message: "Export failed", error: err.message });
    }
};