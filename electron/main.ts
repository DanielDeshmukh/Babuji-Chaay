import { app, BrowserWindow, shell } from "electron";
import { fork, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const APP_PROTOCOL = "babujichaay";
const DEBUG_DEVTOOLS = true;

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let pendingDeepLink: string | null = null;

function registerProtocol() {
  if (process.defaultApp && process.argv[1]) {
    app.setAsDefaultProtocolClient(APP_PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
    return;
  }

  app.setAsDefaultProtocolClient(APP_PROTOCOL);
}

function getBackendDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "Backend")
    : path.resolve(process.cwd(), "Backend");
}

function getBackendEntry() {
  return path.join(getBackendDir(), "script.js");
}

function getRendererEntryUrl() {
  if (process.env.VITE_DEV_SERVER_URL) {
    return process.env.VITE_DEV_SERVER_URL;
  }

  return pathToFileURL(path.join(app.getAppPath(), "dist", "index.html")).toString();
}

function getWindowIcon() {
  return path.resolve(process.cwd(), "Frontend", "src", "assets", "Logo.png");
}

function extractDeepLink(argv: string[]) {
  return argv.find((arg) => arg.startsWith(`${APP_PROTOCOL}://`)) ?? null;
}

function buildRendererUrl(deepLink?: string) {
  const rendererUrl = new URL(getRendererEntryUrl());

  if (deepLink) {
    rendererUrl.searchParams.set("deep_link", deepLink);
    rendererUrl.hash = "/splashscreen";
  }

  return rendererUrl.toString();
}

function isAppUrl(url: string) {
  const rendererEntryUrl = getRendererEntryUrl();

  if (process.env.VITE_DEV_SERVER_URL) {
    return url.startsWith(rendererEntryUrl);
  }

  return url.startsWith("file://");
}

function isSupabaseRedirect(url: string) {
  try {
    const parsedUrl = new URL(url);
    const hashParams = new URLSearchParams(
      parsedUrl.hash.startsWith("#") ? parsedUrl.hash.slice(1) : parsedUrl.hash
    );

    return (
      parsedUrl.protocol === `${APP_PROTOCOL}:` ||
      parsedUrl.searchParams.has("code") ||
      parsedUrl.searchParams.has("access_token") ||
      parsedUrl.searchParams.has("refresh_token") ||
      hashParams.has("access_token") ||
      hashParams.has("refresh_token") ||
      hashParams.has("type")
    );
  } catch {
    return false;
  }
}

async function loadRenderer(deepLink?: string) {
  if (!mainWindow) {
    return;
  }

  await mainWindow.loadURL(buildRendererUrl(deepLink));
}

function startBackend() {
  if (backendProcess) {
    return;
  }

  const backendEntry = getBackendEntry();
  if (!existsSync(backendEntry)) {
    console.error(`Backend entry not found: ${backendEntry}`);
    return;
  }

  backendProcess = fork(backendEntry, [], {
    cwd: getBackendDir(),
    env: {
      ...process.env,
      NODE_ENV: app.isPackaged ? "production" : "development",
    },
    stdio: "inherit",
  });

  backendProcess.on("exit", () => {
    backendProcess = null;
  });
}

function stopBackend() {
  if (!backendProcess) {
    return;
  }

  backendProcess.kill();
  backendProcess = null;
}

function handleDeepLink(url: string) {
  pendingDeepLink = url;

  if (mainWindow) {
    void loadRenderer(url);
    mainWindow.focus();
  }
}

function registerNavigationGuards(window: BrowserWindow) {
  window.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url)) {
      return;
    }

    event.preventDefault();

    if (isSupabaseRedirect(url)) {
      handleDeepLink(url);
      return;
    }

    void shell.openExternal(url);
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isSupabaseRedirect(url)) {
      handleDeepLink(url);
      return { action: "deny" };
    }

    void shell.openExternal(url);
    return { action: "deny" };
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    icon: getWindowIcon(),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      webSecurity: false,
      allowRunningInsecureContent: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  registerNavigationGuards(mainWindow);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  if (DEBUG_DEVTOOLS && app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  await loadRenderer(pendingDeepLink ?? undefined);
  pendingDeepLink = null;
}

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const deepLink = extractDeepLink(argv);
    if (deepLink) {
      handleDeepLink(deepLink);
    }

    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  app.whenReady().then(async () => {
    registerProtocol();
    const initialDeepLink = extractDeepLink(process.argv);
    if (initialDeepLink) {
      pendingDeepLink = initialDeepLink;
    }
    startBackend();
    await createWindow();

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
      }
    });
  });
}

app.on("before-quit", () => {
  stopBackend();
});
