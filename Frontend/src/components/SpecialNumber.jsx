"use client";

import React, { useEffect, useState, useCallback } from "react";
import supabase from "@/lib/supabaseClient";

/**
 * Refactored SpecialNumber component.
 * - Waits for session restoration before any REST calls (prevents 406)
 * - Uses a single auth listener + sessionReady flag
 * - Defensive error handling and loading UX
 * - Uses maybeSingle() to avoid throwing when row missing
 * - Ensures user_id sent on upsert matches session user id
 */

export default function SpecialNumber() {
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionUserId, setSessionUserId] = useState(null);

  const [specialNumber, setSpecialNumber] = useState("");
  const [todayNumber, setTodayNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingToday, setFetchingToday] = useState(false);
  const [error, setError] = useState(null);

  const getTodayDate = () => new Date().toISOString().split("T")[0];

  // --------------------------------------------------------------------
  // 1) Restore session once and listen to changes
  // --------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const start = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user?.id) {
          setSessionUserId(session.user.id);
          setSessionReady(true);
        } else {
          setSessionUserId(null);
          setSessionReady(false);
        }
      } catch (err) {
        console.error("session restore failed", err);
      }
    };

    start();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        setSessionUserId(session.user.id);
        setSessionReady(true);
      } else {
        setSessionUserId(null);
        setSessionReady(false);
        setTodayNumber(null);
      }
    });

    return () => {
      mounted = false;
      try {
        listener.subscription.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  // --------------------------------------------------------------------
  // 2) Fetch today's number WHEN session is ready
  // --------------------------------------------------------------------
  const loadTodayNumber = useCallback(async () => {
    if (!sessionReady || !sessionUserId) return;

    setFetchingToday(true);
    setError(null);

    try {
      const today = getTodayDate();

      const { data, error: fetchErr } = await supabase
        .from("special_numbers")
        .select("number")
        .eq("date", today)
        .eq("user_id", sessionUserId)
        .maybeSingle();

      if (fetchErr) {
        console.error("Failed to fetch today's special number", fetchErr);
        setError(fetchErr.message || "Fetch failed");
        setTodayNumber(null);
      } else {
        setTodayNumber(data?.number ?? null);
      }
    } catch (err) {
      console.error("Unexpected error fetching today's number", err);
      setError(err.message || String(err));
      setTodayNumber(null);
    } finally {
      setFetchingToday(false);
    }
  }, [sessionReady, sessionUserId]);

  useEffect(() => {
    // load when session becomes ready
    loadTodayNumber();
  }, [loadTodayNumber]);

  // --------------------------------------------------------------------
  // 3) Generate random number (1–100)
  // --------------------------------------------------------------------
  const handleGenerate = useCallback(() => {
    setSpecialNumber(Math.floor(Math.random() * 100) + 1);
  }, []);

  // --------------------------------------------------------------------
  // 4) Save today's number (upsert)
  // --------------------------------------------------------------------
  const handleSave = useCallback(async () => {
    if (!sessionReady || !sessionUserId) {
      alert("Please log in before saving a special number.");
      return;
    }

    const num = Number(specialNumber);

    if (!num || num < 1 || num > 100) {
      alert("Please enter or generate a valid number (1–100).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const today = getTodayDate();

      // Make sure we send user_id from the session (single source of truth)
      const payload = { number: num, date: today, user_id: sessionUserId };

      const { data, error: upsertErr } = await supabase
        .from("special_numbers")
        .upsert([payload], { onConflict: "date,user_id" })
        .select()
        .maybeSingle();

      if (upsertErr) {
        console.error("Upsert failed", upsertErr);
        setError(upsertErr.message || "Save failed");
        alert("Failed to save number.");
        return;
      }

      // update UI
      setTodayNumber(data?.number ?? num);
      setSpecialNumber("");
      alert(`Special number set to ${data?.number ?? num} for ${today}.`);
    } catch (err) {
      console.error("Unexpected save error", err);
      setError(err.message || String(err));
      alert("Failed to save number.");
    } finally {
      setLoading(false);
    }
  }, [specialNumber, sessionReady, sessionUserId]);

  // --------------------------------------------------------------------
  // UI
  // --------------------------------------------------------------------
  if (!sessionReady) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-foreground text-lg font-medium">Please log in to set your special number.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5 bg-background rounded-2xl text-foreground transition-colors duration-300">
      <h2 className="text-xl font-bold">Set Today’s Special Number</h2>

      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
        <input
          type="number"
          min="1"
          max="100"
          value={specialNumber}
          onChange={(e) => {
            const val = e.target.value;
            setSpecialNumber(val === "" ? "" : Number(val));
          }}
          className="w-full sm:w-32 border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
          placeholder="Number"
        />

        <button onClick={handleGenerate} className="w-full sm:w-auto bg-secondary text-secondary-foreground font-medium px-4 py-2 rounded-lg hover:bg-secondary/90 transition">
          Random Number
        </button>

        <button onClick={handleSave} disabled={loading} className="w-full sm:w-auto bg-primary text-primary-foreground font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition disabled:opacity-50">
          {loading ? "Saving..." : "Save Number"}
        </button>
      </div>

      {fetchingToday ? (
        <p className="text-sm text-muted-foreground">Loading today's number...</p>
      ) : todayNumber !== null ? (
        <p className="text-foreground font-semibold">Today's Special Number: <span className="text-lg font-bold text-accent">{todayNumber}</span></p>
      ) : (
        <p className="text-sm text-muted-foreground">You haven't set a special number for today yet.</p>
      )}

      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
