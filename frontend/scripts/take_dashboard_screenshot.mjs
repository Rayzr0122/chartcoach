import puppeteer from "puppeteer-core";
import path from "path";

async function run() {
  const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const outputPath = "/Users/apple/.gemini/antigravity-ide/brain/279901b6-d3fe-4830-8d28-61b4238f9a45/ditto_dashboard_screenshot.png";

  console.log("Launching headless Chrome...");
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--window-size=1440,950"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));
  page.on("pageerror", (err) => console.log("BROWSER ERROR:", err));

  console.log("Navigating to login...");
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 1000));

  console.log("Entering credentials...");
  await page.type('input[type="email"]', "verify_user_b@chartcoach.com");
  await page.type('input[type="password"]', "Password123!");

  console.log("Submitting login form...");
  await page.click('button[type="submit"]');

  console.log("Waiting for redirect to /dashboard...");
  await page.waitForFunction(() => window.location.pathname === "/dashboard", { timeout: 15000 });

  console.log("On dashboard! Waiting for data and TradingView chart to render...");
  await new Promise((r) => setTimeout(r, 4500));

  console.log("Taking screenshot...");
  await page.screenshot({ path: outputPath, fullPage: false });
  console.log("Screenshot saved successfully to", outputPath);

  await browser.close();
}

run().catch((err) => {
  console.error("Failed to take screenshot:", err);
  process.exit(1);
});
