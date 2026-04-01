"use client";

import React, { useEffect, useState, useCallback } from "react";
import supabase from "@/lib/supabaseClient";

export default function SpecialNumber() {
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionUserId, setSessionUserId] = useState(null);

  const [specialNumber, setSpecialNumber] = useState("");
  const [todayNumber, setTodayNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingToday, setFetchingToday] = useState(false);
  const [error, setError] = useState(null);

  const getTodayDate = () => new Date().toLocaleDateString('en-GB').replace(/\//g, ' / ');

  // 1) Session Management
  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user?.id) {
          setSessionUserId(session.user.id);
          setSessionReady(true);
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
      listener.subscription.unsubscribe();
    };
  }, []);

  // 2) Data Loading
  const loadTodayNumber = useCallback(async () => {
    if (!sessionReady || !sessionUserId) return;
    setFetchingToday(true);
    setError(null);

    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: todayData, error: todayErr } = await supabase
        .from("special_numbers")
        .select("number")
        .eq("user_id", sessionUserId)
        .eq("date", today)
        .maybeSingle();

      if (todayErr) throw todayErr;

      if (todayData?.number != null) {
        setTodayNumber(todayData.number);
      } else {
        const { data: lastData } = await supabase
          .from("special_numbers")
          .select("number")
          .eq("user_id", sessionUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setTodayNumber(lastData?.number ?? null);
      }
    } catch (err) {
      setError("Failed to sync data.");
    } finally {
      setFetchingToday(false);
    }
  }, [sessionReady, sessionUserId]);

  useEffect(() => { loadTodayNumber(); }, [loadTodayNumber]);

  // 3) Interactions
  const handleGenerate = useCallback(() => {
    setSpecialNumber(Math.floor(Math.random() * 100) + 1);
  }, []);

  const handleSave = useCallback(async () => {
    if (!sessionReady || !sessionUserId) return;
    const num = Number(specialNumber);
    if (!num || num < 1 || num > 100) return;

    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split("T")[0];
      const payload = { number: num, date: today, user_id: sessionUserId };
      const { data, error: upsertErr } = await supabase
        .from("special_numbers")
        .upsert([payload], { onConflict: "date,user_id" })
        .select()
        .maybeSingle();

      if (upsertErr) throw upsertErr;
      setTodayNumber(data?.number ?? num);
      setSpecialNumber("");
    } catch (err) {
      setError("Update failed.");
    } finally {
      setLoading(false);
    }
  }, [specialNumber, sessionReady, sessionUserId]);

  if (!sessionReady) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="bg-card border-2 border-dashed border-border p-8 rounded-3xl text-center">
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Access Denied</p>
          <h2 className="text-xl font-black mt-2">Authentication Required</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="bg-card border-2 border-border rounded-[2.5rem] shadow-2xl overflow-hidden">
        
        {/* TOP SECTION: DISPLAY */}
        <div className="p-8 text-center bg-primary text-primary-foreground relative overflow-hidden">
           {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-2">
            {getTodayDate()}
          </p>
          
          <h2 className="text-xs font-bold uppercase mb-6 opacity-90">Today's Special Number</h2>
          
          <div className="flex flex-col items-center justify-center">
            {fetchingToday ? (
              <div className="h-24 w-24 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <div className="text-8xl font-black tracking-tighter drop-shadow-lg">
                {todayNumber ?? "--"}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM SECTION: ACTIONS */}
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="relative group">
              <label className="absolute -top-2 left-4 px-2 bg-card text-[10px] font-black uppercase text-primary transition-all group-focus-within:text-primary">
                Custom Entry
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={specialNumber}
                onChange={(e) => setSpecialNumber(e.target.value)}
                placeholder="1 - 100"
                className="w-full bg-background border-2 border-border p-4 rounded-2xl text-center text-2xl font-black outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleGenerate} 
                className="flex-1 bg-muted hover:bg-border text-foreground font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all active:scale-95"
              >
                Randomize
              </button>
              
              <button 
                onClick={handleSave} 
                disabled={loading || !specialNumber}
                className="flex-[2] bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl transition-all active:scale-95 disabled:grayscale disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? "Saving..." : "Lock In Number"}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center border border-red-100">
              ⚠️ {error}
            </div>
          )}

          {!todayNumber && !fetchingToday && (
            <p className="text-[10px] text-center text-muted-foreground font-bold uppercase italic tracking-tighter">
              No number recorded for this session yet.
            </p>
          )}
        </div>
      </div>
      
      <p className="mt-6 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
        Secured by Supabase Single-Source-Auth
      </p>
    </div>
  );
}