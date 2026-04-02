import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/Logo.png";
import supabase from "../lib/supabaseClient";
import { syncBackendSession } from "../lib/apiClient";

const SplashScreen = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Completing sign-in...");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const clearAuthParamsFromUrl = () => {
      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState({}, document.title, cleanUrl);
    };

    const finishSignIn = async () => {
      try {
        const callbackUrl = new URL(window.location.href);
        const hashParams = new URLSearchParams(callbackUrl.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const authCode = callbackUrl.searchParams.get("code");

        if (accessToken && refreshToken) {
          setStatus("Restoring your session...");
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }
        } else if (authCode) {
          setStatus("Validating secure login...");
          const { error } = await supabase.auth.exchangeCodeForSession(authCode);

          if (error) {
            throw error;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("No active session was created from the sign-in callback.");
        }

        clearAuthParamsFromUrl();
        setStatus("Connecting your dashboard...");
        await syncBackendSession().catch(() => null);

        if (isMounted) {
          navigate("/home", { replace: true });
        }
      } catch (error) {
        console.error("Splash screen auth handling failed:", error);

        if (!isMounted) {
          return;
        }

        clearAuthParamsFromUrl();
        setErrorMessage(
          error?.message || "Sign-in could not be completed. Please try again."
        );
        setStatus("Redirecting to login...");

        window.setTimeout(() => {
          navigate("/login", { replace: true });
        }, 1800);
      }
    };

    finishSignIn();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(248,113,113,0.14),_transparent_28%)]" />
      <div className="relative flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-amber-200/20 bg-slate-900/80 shadow-[0_0_50px_rgba(251,191,36,0.12)]">
            <img
              src={Logo}
              alt="Babuji Chaay"
              className="h-20 w-20 rounded-full object-cover"
            />
          </div>

          <div className="space-y-3 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">
              Babuji Chaay
            </p>
            <h1 className="text-3xl font-semibold text-white">Loading</h1>
            <p className="text-sm text-slate-300">{status}</p>
            {errorMessage ? (
              <p className="text-sm text-rose-300">{errorMessage}</p>
            ) : (
              <p className="text-xs text-slate-400">
                Finalizing your secure session and clearing the callback URL.
              </p>
            )}
          </div>

          <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/3 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
