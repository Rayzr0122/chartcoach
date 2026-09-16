import puppeteer from "puppeteer-core";

async function run() {
  const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const outputCoursesPro = "/Users/apple/.gemini/antigravity-ide/brain/279901b6-d3fe-4830-8d28-61b4238f9a45/phase1_courses_pro_screenshot.png";
  const outputSettingsPro = "/Users/apple/.gemini/antigravity-ide/brain/279901b6-d3fe-4830-8d28-61b4238f9a45/phase1_settings_pro_screenshot.png";

  console.log("Launching headless Chrome...");
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--window-size=1440,950"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));

  console.log("Navigating to login...");
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await new Promise((r) => setTimeout(r, 1000));

  console.log("Logging in...");
  await page.type('input[type="email"]', "verify_user_b@chartcoach.com");
  await page.type('input[type="password"]', "Password123!");
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => window.location.pathname === "/dashboard", { timeout: 15000 });
  console.log("Logged in!");

  // Navigate to Pricing
  console.log("Navigating to /pricing...");
  await page.goto("http://localhost:3000/pricing", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1000));

  // Click "Choose Pro"
  console.log("Selecting Pro plan...");
  const buttons = await page.$$("button");
  let chooseProBtn = null;
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.textContent, btn);
    if (text && text.includes("Choose Pro")) {
      chooseProBtn = btn;
      break;
    }
  }

  if (chooseProBtn) {
    await chooseProBtn.click();
    console.log("Clicked Choose Pro! Waiting for checkout and verification...");
    await new Promise((r) => setTimeout(r, 3000));
  } else {
    console.log("Choose Pro button not found!");
  }

  // Navigate to Courses to verify unlocked state
  console.log("Navigating to /learn/courses to verify Pro unlocks...");
  await page.goto("http://localhost:3000/learn/courses", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: outputCoursesPro, fullPage: false });
  console.log("Saved unlocked courses screenshot to", outputCoursesPro);

  // Navigate to Settings to verify Pro membership state
  console.log("Navigating to /settings to verify Pro membership...");
  await page.goto("http://localhost:3000/settings", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: outputSettingsPro, fullPage: false });
  console.log("Saved Pro settings screenshot to", outputSettingsPro);

  await browser.close();
}

run().catch((err) => {
  console.error("Test upgrade run failed:", err);
  process.exit(1);
});
