import { useState, useEffect } from "react";
import supabase from "../lib/supabaseClient";

/**
 * useCurrentUser()
 * Fetches and syncs the current Supabase user + their profile info
 * Returns { user, userId, fullName, email, loading, error }
 */
export default function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [fullName, setFullName] = useState(null);
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      setLoading(true);
      try {
        // 1️⃣ Get currently logged-in Supabase user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const currentUser = userData?.user || null;
        if (!currentUser) {
          if (isMounted) {
            setUser(null);
            setUserId(null);
            setFullName(null);
            setEmail(null);
          }
          return;
        }

        if (isMounted) {
          setUser(currentUser);
          setUserId(currentUser.id);
          setEmail(currentUser.email);
        }

        // 2️⃣ Fetch from public.profiles (linked via auth.users.id)
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", currentUser.id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          throw profileError;
        }

        if (isMounted) {
          setFullName(profileData?.full_name || currentUser.email || "Unnamed User");
        }
      } catch (err) {
        console.error("useCurrentUser error:", err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUserData();

    // 3️⃣ Subscribe to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const u = session?.user || null;
      setUser(u);
      setUserId(u?.id || null);
      setEmail(u?.email || null);
      setFullName(null);

      if (u) {
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", u.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data?.full_name) setFullName(data.full_name);
          });
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  return { user, userId, fullName, email, loading, error };
}
