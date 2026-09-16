import puppeteer from "puppeteer-core";

async function run() {
  const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const outputPricing = "/Users/apple/.gemini/antigravity-ide/brain/279901b6-d3fe-4830-8d28-61b4238f9a45/phase1_pricing_screenshot.png";
  const outputCourses = "/Users/apple/.gemini/antigravity-ide/brain/279901b6-d3fe-4830-8d28-61b4238f9a45/phase1_courses_screenshot.png";
  const outputSettings = "/Users/apple/.gemini/antigravity-ide/brain/279901b6-d3fe-4830-8d28-61b4238f9a45/phase1_settings_screenshot.png";

  console.log("Launching headless Chrome...");
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--window-size=1440,950"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  console.log("Navigating to login...");
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 1000));

  console.log("Logging in...");
  await page.type('input[type="email"]', "verify_user_b@chartcoach.com");
  await page.type('input[type="password"]', "Password123!");
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => window.location.pathname === "/dashboard", { timeout: 15000 });
  console.log("Logged in!");

  // 1. Capture Pricing Page
  console.log("Navigating to /pricing...");
  await page.goto("http://localhost:3000/pricing", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: outputPricing, fullPage: false });
  console.log("Saved pricing screenshot to", outputPricing);

  // 2. Capture Courses Page
  console.log("Navigating to /learn/courses...");
  await page.goto("http://localhost:3000/learn/courses", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: outputCourses, fullPage: false });
  console.log("Saved courses screenshot to", outputCourses);

  // 3. Capture Settings Page
  console.log("Navigating to /settings...");
  await page.goto("http://localhost:3000/settings", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: outputSettings, fullPage: false });
  console.log("Saved settings screenshot to", outputSettings);

  await browser.close();
  console.log("All screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Screenshot run failed:", err);
  process.exit(1);
});
