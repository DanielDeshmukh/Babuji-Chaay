import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/Logo.png";
import supabase from "../lib/supabaseClient";
import { syncBackendSession } from "../lib/apiClient";

const FALLBACK_REDIRECT_MS = 5000;
const AUTH_CALLBACK_STORAGE_KEY = "supabase-auth-callback";
const HASH_CLEAR_DEADLINE_MS = 100;

const parseCallbackPayload = ({ hash = "", search = "", pathname = "/" } = {}) => {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(normalizedHash);
  const searchParams = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);

  return {
    accessToken: hashParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token"),
    authCode: searchParams.get("code"),
    type: hashParams.get("type"),
    pathname,
    rawHash: hash,
    rawSearch: search,
  };
};

const getCallbackPayload = () => {
  const storedPayload = sessionStorage.getItem(AUTH_CALLBACK_STORAGE_KEY);

  if (storedPayload) {
    try {
      const parsedPayload = JSON.parse(storedPayload);
      sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
      return parseCallbackPayload(parsedPayload);
    } catch (error) {
      console.error("Failed to parse stored auth callback:", error);
      sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
    }
  }

  return parseCallbackPayload({
    hash: window.location.hash,
    search: window.location.search,
    pathname: window.location.pathname,
  });
};

const hasSensitiveCallbackData = (payload) =>
  Boolean(payload?.accessToken || payload?.refreshToken || payload?.authCode);

const clearAuthHashImmediately = (payload, mountedAt) => {
  if (!hasSensitiveCallbackData(payload)) {
    return;
  }

  const cleanUrl = `${window.location.pathname}${window.location.search}`;

  if (Date.now() - mountedAt > HASH_CLEAR_DEADLINE_MS) {
    console.warn("Auth callback hash was cleared after the preferred 100ms window.");
  }

  window.history.replaceState(
    { authCallbackHandled: true },
    document.title,
    cleanUrl
  );
};

const SplashScreen = () => {
  const initialCallbackPayload =
    typeof window !== "undefined" ? getCallbackPayload() : null;

  if (typeof window !== "undefined") {
    clearAuthHashImmediately(initialCallbackPayload, Date.now());
  }

  const navigate = useNavigate();
  const [status, setStatus] = useState("Securing your session...");
  const [errorMessage, setErrorMessage] = useState("");
  const hasResolvedRef = useRef(false);
  const mountedAtRef = useRef(Date.now());
  const callbackPayloadRef = useRef(initialCallbackPayload);

  useLayoutEffect(() => {
    mountedAtRef.current = Date.now();
    callbackPayloadRef.current = callbackPayloadRef.current ?? getCallbackPayload();
    clearAuthHashImmediately(callbackPayloadRef.current, mountedAtRef.current);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const callbackPayload = callbackPayloadRef.current ?? getCallbackPayload();
    let authEventReceived = false;

    const resolveSession = async (session) => {
      if (!session || hasResolvedRef.current) {
        return;
      }

      hasResolvedRef.current = true;
      setStatus("Connecting your dashboard...");

      try {
        await syncBackendSession();
      } catch (error) {
        console.error("Backend session sync failed:", error);
      }

      if (isMounted) {
        navigate("/home", { replace: true });
      }
    };

    const failToLogin = (message) => {
      if (hasResolvedRef.current || !isMounted) {
        return;
      }

      hasResolvedRef.current = true;
      setErrorMessage(message);
      setStatus("Redirecting to login...");

      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 800);
    };

    const fallbackTimer = window.setTimeout(() => {
      failToLogin("Login timed out. Please try again.");
    }, FALLBACK_REDIRECT_MS);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        authEventReceived = true;
        await resolveSession(session);
      }
    );

    const bootstrapSession = async () => {
      try {
        if (callbackPayload.accessToken && callbackPayload.refreshToken) {
          setStatus("Restoring secure sign-in...");
          const { error } = await supabase.auth.setSession({
            access_token: callbackPayload.accessToken,
            refresh_token: callbackPayload.refreshToken,
          });

          if (error) {
            throw error;
          }
        } else if (callbackPayload.authCode) {
          setStatus("Validating secure login...");
          const { error } = await supabase.auth.exchangeCodeForSession(
            callbackPayload.authCode
          );

          if (error) {
            throw error;
          }
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        await resolveSession(session);

        if (
          !session &&
          hasSensitiveCallbackData(callbackPayload) &&
          !authEventReceived &&
          callbackPayload.accessToken &&
          callbackPayload.refreshToken
        ) {
          setStatus("Recovering secure sign-in...");

          const { error: recoveryError } = await supabase.auth.setSession({
            access_token: callbackPayload.accessToken,
            refresh_token: callbackPayload.refreshToken,
          });

          if (recoveryError) {
            throw recoveryError;
          }

          const {
            data: { session: recoveredSession },
            error: recoveredSessionError,
          } = await supabase.auth.getSession();

          if (recoveredSessionError) {
            throw recoveredSessionError;
          }

          await resolveSession(recoveredSession);
        }
      } catch (error) {
        console.error("Splash screen auth handling failed:", error);
        failToLogin(
          error?.message || "Sign-in could not be completed. Please try again."
        );
      }
    };

    bootstrapSession();

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      authListener.subscription.unsubscribe();
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
                Processing the secure callback and clearing sensitive URL data.
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
