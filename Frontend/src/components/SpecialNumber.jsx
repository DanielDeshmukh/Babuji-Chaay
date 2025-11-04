import React, { useState, useEffect } from "react";
import supabase from "../lib/supabaseClient";

const SpecialNumber = () => {
  const [specialNumber, setSpecialNumber] = useState(null);
  const [todayNumber, setTodayNumber] = useState(null);
  const [loading, setLoading] = useState(false);

  const getTodayDate = () => new Date().toISOString().split("T")[0];

  useEffect(() => {
    const fetchTodayNumber = async () => {
      const today = getTodayDate();

      const { data, error } = await supabase
        .from("special_numbers")
        .select("number")
        .eq("date", today)
        .maybeSingle();

      if (!error && data) {
        setTodayNumber(data.number);
      }
    };

    fetchTodayNumber();
  }, []);

  const handleGenerate = () => {
    setSpecialNumber(Math.floor(Math.random() * 100) + 1);
  };

  const handleSave = async () => {
    if (!specialNumber) {
      alert("Please enter or generate a number first.");
      return;
    }

    setLoading(true);
    const today = getTodayDate();

    const { data, error } = await supabase
      .from("special_numbers")
      .upsert([{ number: specialNumber, date: today }], {
        onConflict: "date",
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.error("Error saving special number:", error.message);
      alert("Failed to save special number");
    } else {
      setTodayNumber(data.number);
      alert(`Special number set to ${data.number} for ${today}`);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4 bg-background rounded-2xl text-foreground transition-colors duration-300">
      <h2 className="text-xl font-bold  text-foreground">
        Set Special Number for today
      </h2>

      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
        <input
          type="number"
          min="1"
          max="100"
          value={specialNumber ?? ""}
          onChange={(e) => setSpecialNumber(Number(e.target.value))}
          className="w-full sm:w-32 border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
          placeholder="Number"
        />

        <button
          onClick={handleGenerate}
          className="w-full sm:w-auto bg-secondary text-secondary-foreground font-medium px-4 py-2 rounded-lg hover:bg-secondary/90 transition"
        >
          Get Special Number
        </button>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full sm:w-auto bg-primary text-primary-foreground font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
        >
          {loading ? "Saving..." : "Set Special Number"}
        </button>
      </div>

      {todayNumber && (
        <p className="text-foreground font-semibold">
          Today’s Special Number:{" "}
          <span className="text-lg font-bold text-accent">
            {todayNumber}
          </span>
        </p>
      )}
    </div>
  );
};

export default SpecialNumber;
