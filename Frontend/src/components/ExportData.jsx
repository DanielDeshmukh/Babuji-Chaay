"use client";

import { useState, useEffect } from "react"; // Added useEffect
import { FiDownloadCloud, FiCalendar, FiDollarSign } from "react-icons/fi";
import supabase from "../lib/supabaseClient"; // Import Supabase client

// --- Constants for Export Types ---
const EXPORT_TYPES = {
    MONTHLY: { 
        key: 'monthly', 
        name: 'Monthly Summary', 
        description: 'Aggregate sales data by month.' 
    },
    DAILY: { 
        key: 'daily', 
        name: 'Daily Summary', 
        description: 'Detailed sales data for each day.' 
    }
};

// --- Backend Configuration ---
const API_BASE = import.meta.env.VITE_API_BASE;
const BACKEND_URL = `${API_BASE}/api/exports/sales`; 

const ExportData = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [selectedType, setSelectedType] = useState(EXPORT_TYPES.MONTHLY.key);
    const [monthYear, setMonthYear] = useState(''); // For Monthly Export
    const [dateRange, setDateRange] = useState({ start: '', end: '' }); // For Daily Export
    const [userId, setUserId] = useState(null); // NEW: State to hold the authenticated user's ID

    // Helper to check if the current type is monthly
    const isMonthly = selectedType === EXPORT_TYPES.MONTHLY.key;

    // NEW: Fetch User ID on component mount
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
            } else {
                setMessage("❌ Authentication required to export data.");
            }
        };
        fetchUser();
    }, []);

    /**
     * Handles validation, builds the GET request URL with query parameters, 
     * and downloads the Excel file streamed from the backend.
     */
    const handleExport = async () => {
        if (loading || !userId) {
            if (!userId) setMessage("❌ Cannot export. User not authenticated.");
            return;
        }

        setMessage("");
        setLoading(true);

        // --- 1. Validation and Payload Preparation ---
        // CRITICAL CHANGE: Start payload with the user ID
        let payload = { 
            type: selectedType,
            user_id: userId, 
        };
        let exportName = "";
        let validationError = "";

        if (selectedType === EXPORT_TYPES.MONTHLY.key) {
            if (!monthYear) validationError = "⚠️ Please select a month and year.";
            payload.monthYear = monthYear;
            exportName = `Monthly_Sales_Summary_${monthYear}.xlsx`;
        } else if (selectedType === EXPORT_TYPES.DAILY.key) {
             if (!dateRange.start || !dateRange.end) {
                 validationError = "⚠️ Please select both start and end dates.";
             } else if (new Date(dateRange.start) > new Date(dateRange.end)) {
                 validationError = "⚠️ Start date cannot be after end date.";
             }
             // CRITICAL: Flatten dateRange into individual keys for the URL query parameters
             payload.dateRangeStart = dateRange.start;
             payload.dateRangeEnd = dateRange.end;
             exportName = `Daily_Sales_Summary_${dateRange.start}_to_${dateRange.end}.xlsx`;
        }
        
        if (validationError) {
            setMessage(validationError);
            setLoading(false);
            return;
        }
        
        // --- 2. Build Query String (e.g., ?type=daily&user_id=UUID&dateRangeStart=X...) ---
        // The backend server will use this `user_id` to query the RLS-secured tables.
        const queryString = new URLSearchParams(payload).toString();
        const API_URL = `${BACKEND_URL}?${queryString}`; 

        // --- 3. Actual Backend Call for File Download (Using GET) ---
        try {
            const response = await fetch(API_URL, {
                method: 'GET', // CRITICAL: Now using GET method
                // Note: The JWT token isn't typically sent with the backend request 
                // unless the backend explicitly requires it for auth (which is good practice).
                // If your backend uses the JWT, you'd add:
                // headers: { 'Authorization': `Bearer ${await supabase.auth.getSession().access_token}` }
            });

            // Handle non-2xx HTTP responses (including the custom 404 message)
            if (!response.ok) {
                // Since the backend sends JSON error messages, we read them
                const errorData = await response.json(); 
                throw new Error(errorData.message || `Server error (Status: ${response.status})`);
            }

            // --- SUCCESS: Download the File ---
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = exportName; 
            
            document.body.appendChild(a); 
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            setMessage(`Export ${exportName} downloaded successfully!`);

        } catch (error) {
            console.error('Export Error:', error);
            setMessage(`Export failed: ${error.message}`); 
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="space-y-4">
            
            {/* Header Section */}
            <div className="pb-2 border-b border-border">
                <h3 className="text-xl font-semibold text-foreground flex items-center space-x-2">
                    <FiDownloadCloud size={24} className="text-primary"/>
                    <span>Sales Data Export</span>
                </h3>
            </div>
            
            {/* 1. Export Type Selection Section */}
            <div className="pt-2">
                <label className="text-lg font-medium block mb-3">
                    Select Summary Type
                </label>
                <div className="flex space-x-4">
                    {Object.values(EXPORT_TYPES).map((type) => {
                        const isSelected = selectedType === type.key;
                        return (
                            <div 
                                key={type.key}
                                onClick={() => !loading && setSelectedType(type.key)}
                                className={`flex-1 p-3 rounded-md border cursor-pointer transition-all duration-200 
                                    ${isSelected 
                                        ? "border-primary bg-primary/10 text-primary shadow-sm" 
                                        : "border-border hover:border-accent text-muted-foreground bg-card"
                                    }
                                    ${loading ? "opacity-60 cursor-not-allowed" : ""}
                                `}
                            >
                                <span className="text-base font-semibold block">
                                    {type.name}
                                </span>
                                <p className="text-xs mt-1">{type.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            <hr className="border-border" />

            {/* 2. Specify Period Section */}
            <div className="pt-2">
                <label className="text-lg font-medium block mb-3">
                    Specify Export Period
                </label>
                
                {isMonthly ? (
                    // Monthly Input (Month/Year Picker)
                    <div className="flex items-center space-x-4">
                        <FiCalendar size={20} className="text-muted-foreground" />
                        <input
                            type="month"
                            value={monthYear}
                            onChange={(e) => setMonthYear(e.target.value)}
                            className="flex-1 p-3 rounded-md bg-card border border-border text-foreground 
                                focus:ring-2 focus:ring-accent focus:outline-none transition-colors cursor-pointer"
                            disabled={loading}
                        />
                    </div>
                ) : (
                    // Daily Input (Date Range)
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm text-muted-foreground block">Start Date</label>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="w-full p-3 rounded-md bg-card border border-border text-foreground 
                                    focus:ring-2 focus:ring-accent focus:outline-none transition-colors cursor-pointer"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm text-muted-foreground block">End Date</label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="w-full p-3 rounded-md bg-card border border-border text-foreground 
                                    focus:ring-2 focus:ring-accent focus:outline-none transition-colors cursor-pointer"
                                disabled={loading}
                            />
                        </div>
                    </div>
                )}
            </div>

            <hr className="border-border" />
            
            {/* 3. Run Export Button Section */}
            <div className="pt-2">
                <button
                    onClick={handleExport}
                    disabled={loading || !userId} // Disable if loading OR not authenticated
                    className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                    {loading ? (
                        <>
                            <span className="animate-spin text-xl">...</span>
                            <span>Preparing Export...</span>
                        </>
                    ) : (
                        <>
                            <FiDownloadCloud size={20} />
                            <span>Run Export</span>
                        </>
                    )}
                </button>
            </div>

            {/* Message Display */}
            {message && (
                <p className={`text-center text-sm p-3 rounded-lg ${message.startsWith('❌') || message.startsWith('⚠️') ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300'}`}>
                    {message}
                </p>
            )}
        </div>
    );
};

export default ExportData;