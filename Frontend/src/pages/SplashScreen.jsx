import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/Logo.png";
import supabase from "../lib/supabaseClient";
import { syncBackendSession } from "../lib/apiClient";

const FALLBACK_REDIRECT_MS = 2000;
const LOGIN_REDIRECT_DELAY_MS = 800;
const AUTH_CALLBACK_STORAGE_KEY = "supabase-auth-callback";
const HASH_CLEAR_DEADLINE_MS = 100;

const parseCallbackPayload = ({ hash = "", search = "", pathname = "/" } = {}) => {
  const normalizedHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(normalizedHash);
  const normalizedSearch = search
    ? search.startsWith("?")
      ? search.slice(1)
      : search
    : "";
  const searchParams = new URLSearchParams(normalizedSearch);

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

const logSplashDebug = (step, details = {}) => {
  console.info("[SplashScreen]", step, details);
};

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
  const fallbackTimerRef = useRef(null);
  const loginRedirectTimerRef = useRef(null);

  logSplashDebug("mount:init", {
    pathname: typeof window !== "undefined" ? window.location.pathname : "",
    hasAccessToken: Boolean(initialCallbackPayload?.accessToken),
    hasRefreshToken: Boolean(initialCallbackPayload?.refreshToken),
    hasAuthCode: Boolean(initialCallbackPayload?.authCode),
  });

  useLayoutEffect(() => {
    mountedAtRef.current = Date.now();
    callbackPayloadRef.current = callbackPayloadRef.current ?? getCallbackPayload();
    clearAuthHashImmediately(callbackPayloadRef.current, mountedAtRef.current);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let authEventReceived = false;
    const callbackPayload = callbackPayloadRef.current ?? getCallbackPayload();

    const clearTimers = () => {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }

      if (loginRedirectTimerRef.current) {
        window.clearTimeout(loginRedirectTimerRef.current);
        loginRedirectTimerRef.current = null;
      }
    };

    const forceRedirectHome = (reason, session) => {
      if (!session || hasResolvedRef.current || !isMounted) {
        return;
      }

      hasResolvedRef.current = true;
      clearTimers();
      setStatus("Opening your dashboard...");

      logSplashDebug("redirect:home", {
        reason,
        userId: session?.user?.id ?? null,
        hasAccessToken: Boolean(session?.access_token),
        elapsedMs: Date.now() - mountedAtRef.current,
      });

      navigate("/home", { replace: true });

      void syncBackendSession().catch((error) => {
        console.error("Backend session sync failed:", error);
        logSplashDebug("syncBackendSession:error", {
          message: error?.message ?? "Unknown backend sync error",
        });
      });
    };

    const failToLogin = (message) => {
      if (hasResolvedRef.current || !isMounted) {
        return;
      }

      hasResolvedRef.current = true;
      clearTimers();
      setErrorMessage(message);
      setStatus("Redirecting to login...");

      logSplashDebug("redirect:login", {
        message,
        elapsedMs: Date.now() - mountedAtRef.current,
      });

      loginRedirectTimerRef.current = window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, LOGIN_REDIRECT_DELAY_MS);
    };

    const applyManualHashSession = async (reason) => {
      if (
        !callbackPayload.accessToken ||
        !callbackPayload.refreshToken ||
        hasResolvedRef.current
      ) {
        return null;
      }

      setStatus("Restoring secure sign-in...");
      logSplashDebug("manualHashCapture:start", {
        reason,
        hasAccessToken: true,
        hasRefreshToken: true,
      });

      const { data, error } = await supabase.auth.setSession({
        access_token: callbackPayload.accessToken,
        refresh_token: callbackPayload.refreshToken,
      });

      if (error) {
        logSplashDebug("manualHashCapture:error", {
          reason,
          message: error.message,
        });
        throw error;
      }

      logSplashDebug("manualHashCapture:success", {
        reason,
        hasSession: Boolean(data.session),
        userId: data.session?.user?.id ?? null,
      });

      return data.session ?? null;
    };

    const resolveSession = async (session, reason = "unknown") => {
      if (!session || hasResolvedRef.current) {
        return;
      }

      logSplashDebug("session:detected", {
        reason,
        userId: session?.user?.id ?? null,
        hasAccessToken: Boolean(session?.access_token),
      });

      forceRedirectHome(reason, session);
    };

    fallbackTimerRef.current = window.setTimeout(() => {
      failToLogin("Login timed out. Please try again.");
    }, FALLBACK_REDIRECT_MS);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        authEventReceived = true;
        logSplashDebug("onAuthStateChange", {
          event,
          hasSession: Boolean(session),
          userId: session?.user?.id ?? null,
          hasAccessToken: Boolean(session?.access_token),
        });

        await resolveSession(session, `auth-listener:${event}`);
      }
    );

    const bootstrapSession = async () => {
      try {
        logSplashDebug("bootstrap:start", {
          hasSensitiveCallbackData: hasSensitiveCallbackData(callbackPayload),
          hasAccessToken: Boolean(callbackPayload.accessToken),
          hasRefreshToken: Boolean(callbackPayload.refreshToken),
          hasAuthCode: Boolean(callbackPayload.authCode),
          anonKeyPresent: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
          supabaseUrlPresent: Boolean(import.meta.env.VITE_SUPABASE_URL),
        });

        if (callbackPayload.accessToken && callbackPayload.refreshToken) {
          const sessionFromHash = await applyManualHashSession("initial-hash");
          if (sessionFromHash) {
            forceRedirectHome("manual-hash-session", sessionFromHash);
            return;
          }
        } else if (callbackPayload.authCode) {
          setStatus("Validating secure login...");

          const { data, error } = await supabase.auth.exchangeCodeForSession(
            callbackPayload.authCode
          );

          if (error) {
            logSplashDebug("exchangeCodeForSession:error", {
              message: error.message,
            });
            throw error;
          }

          logSplashDebug("exchangeCodeForSession:success", {
            hasSession: Boolean(data.session),
            userId: data.session?.user?.id ?? null,
          });

          if (data.session) {
            forceRedirectHome("auth-code-session", data.session);
            return;
          }
        }

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          logSplashDebug("getSession:error", {
            message: error.message,
          });
          throw error;
        }

        logSplashDebug("getSession:result", {
          hasSession: Boolean(session),
          userId: session?.user?.id ?? null,
          hasAccessToken: Boolean(session?.access_token),
          anonKeyPresent: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
          supabaseUrlPresent: Boolean(import.meta.env.VITE_SUPABASE_URL),
        });

        if (session) {
          forceRedirectHome("get-session", session);
          return;
        }

        if (callbackPayload.accessToken && callbackPayload.refreshToken) {
          const recoveredSession = await applyManualHashSession(
            authEventReceived ? "post-getSession-retry" : "listener-race-recovery"
          );

          if (recoveredSession) {
            forceRedirectHome("manual-hash-recovery", recoveredSession);
            return;
          }
        }

        logSplashDebug("session:missing", {
          authEventReceived,
          message: "Supabase did not surface a valid session before timeout.",
        });
      } catch (error) {
        console.error("Splash screen auth handling failed:", error);
        logSplashDebug("bootstrap:error", {
          name: error?.name ?? "UnknownError",
          message: error?.message ?? "Unknown auth error",
        });
        failToLogin(
          error?.message || "Sign-in could not be completed. Please try again."
        );
      }
    };

    bootstrapSession();

    return () => {
      isMounted = false;
      clearTimers();
      authListener.subscription.unsubscribe();
      logSplashDebug("cleanup", {
        resolved: hasResolvedRef.current,
        authEventReceived,
      });
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
