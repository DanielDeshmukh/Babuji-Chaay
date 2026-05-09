import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import supabase from "./supabaseClient";
import { getAuthRedirectUrl, MOBILE_AUTH_REDIRECT_URL } from "./authRedirect";

const AUTH_CALLBACK_PREFIX = `${MOBILE_AUTH_REDIRECT_URL}`;

const isNativeApp = () => Capacitor.isNativePlatform();

const extractParamsFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    const hash = parsed.hash?.startsWith("#")
      ? new URLSearchParams(parsed.hash.slice(1))
      : new URLSearchParams();

    return {
      code: parsed.searchParams.get("code") || hash.get("code"),
      accessToken:
        parsed.searchParams.get("access_token") || hash.get("access_token"),
      refreshToken:
        parsed.searchParams.get("refresh_token") || hash.get("refresh_token"),
    };
  } catch (error) {
    console.error("Failed to parse auth callback URL:", error);
    return {};
  }
};

const consumeAuthCallback = async (url, onSessionEstablished) => {
  if (!url || !url.startsWith(AUTH_CALLBACK_PREFIX)) {
    return false;
  }

  const { code, accessToken, refreshToken } = extractParamsFromUrl(url);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
  } else {
    return false;
  }

  if (isNativeApp()) {
    await Browser.close().catch(() => undefined);
  }

  await onSessionEstablished?.();
  return true;
};

export const getOAuthRedirectTo = () =>
  isNativeApp() ? MOBILE_AUTH_REDIRECT_URL : getAuthRedirectUrl("/splashscreen");

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getOAuthRedirectTo(),
      skipBrowserRedirect: isNativeApp(),
    },
  });

  if (error) throw error;

  if (isNativeApp() && data?.url) {
    await Browser.open({
      url: data.url,
      windowName: "_self",
    });
  }

  return data;
};

export const initializeMobileAuth = async ({ onSessionEstablished } = {}) => {
  if (!isNativeApp()) {
    return () => {};
  }

  const launchData = await CapacitorApp.getLaunchUrl();
  if (launchData?.url) {
    await consumeAuthCallback(launchData.url, onSessionEstablished);
  }

  const listener = await CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
    try {
      await consumeAuthCallback(url, onSessionEstablished);
    } catch (error) {
      console.error("Failed to complete mobile auth session:", error);
    }
  });

  return () => {
    listener.remove();
  };
};
