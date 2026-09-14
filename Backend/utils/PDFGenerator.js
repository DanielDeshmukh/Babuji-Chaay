import puppeteer from "puppeteer";

const PDF_RENDER_TIMEOUT_MS = Number(process.env.PDF_RENDER_TIMEOUT_MS || 30000);
const PDF_MAX_CONCURRENT = Math.max(1, Number(process.env.PDF_MAX_CONCURRENT || 2));

class Semaphore {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.current < this.maxConcurrency) {
      this.current += 1;
      return () => this.release();
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.current += 1;
        resolve(() => this.release());
      });
    });
  }

  release() {
    this.current = Math.max(0, this.current - 1);
    const next = this.queue.shift();
    if (next) next();
  }
}

const semaphore = new Semaphore(PDF_MAX_CONCURRENT);

let browserInstance = null;
let browserLaunchPromise = null;

async function withTimeout(promise, timeoutMs, message) {
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function getBrowser() {
  if (browserInstance && browserInstance.connected) return browserInstance;
  if (browserLaunchPromise) return browserLaunchPromise;

  browserLaunchPromise = puppeteer
    .launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
    .then((browser) => {
      browserInstance = browser;
      browser.on("disconnected", () => {
        browserInstance = null;
      });
      return browser;
    })
    .finally(() => {
      browserLaunchPromise = null;
    });

  return browserLaunchPromise;
}

function configureAssetPolicy(page) {
  page.on("request", (request) => {
    const url = request.url();
    const allowLocalAsset =
      url.startsWith("about:") ||
      url.startsWith("data:") ||
      url.startsWith("file:") ||
      url.startsWith("blob:");

    if (allowLocalAsset) {
      request.continue();
      return;
    }

    request.abort();
  });
}

export async function renderPdfFromHtml(html, options = {}) {
  const timeoutMs = options.timeoutMs || PDF_RENDER_TIMEOUT_MS;
  const waitUntil = options.waitUntil || "networkidle0";
  const pdfOptions = options.pdfOptions || {};

  const release = await semaphore.acquire();
  let page = null;

  try {
    const browser = await withTimeout(
      getBrowser(),
      timeoutMs,
      "Timed out while starting PDF browser"
    );

    page = await withTimeout(
      browser.newPage(),
      timeoutMs,
      "Timed out while creating PDF page"
    );

    page.setDefaultTimeout(timeoutMs);
    page.setDefaultNavigationTimeout(timeoutMs);

    await page.setRequestInterception(true);
    configureAssetPolicy(page);

    await withTimeout(
      page.setContent(html, { waitUntil }),
      timeoutMs,
      "Timed out while rendering invoice HTML"
    );

    return await withTimeout(
      page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
        ...pdfOptions,
      }),
      timeoutMs,
      "Timed out while generating invoice PDF"
    );
  } catch (error) {
    throw new Error(`PDF render failed: ${error.message}`);
  } finally {
    if (page) {
      try {
        await page.close({ runBeforeUnload: false });
      } catch {
        // Ignore cleanup errors.
      }
    }
    release();
  }
}

export async function closePdfBrowser() {
  if (!browserInstance) return;
  await browserInstance.close();
  browserInstance = null;
}

process.once("SIGINT", () => {
  closePdfBrowser().finally(() => process.exit(0));
});

process.once("SIGTERM", () => {
  closePdfBrowser().finally(() => process.exit(0));
});
