import puppeteer from "puppeteer-core";
import { readFile, appendFile } from "fs/promises";

// Function to display a progress bar while waiting
async function waitWithProgress(label, totalMs) {
  const totalSeconds = Math.floor(totalMs / 1000);
  let elapsed = 0;

  function renderProgress() {
    const percent = Math.min((elapsed / totalSeconds) * 100, 100);
    const secondsLeft = Math.max(totalSeconds - elapsed, 0);
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`${label}: ${percent.toFixed(0)}% (${secondsLeft}s)`);
  }

  renderProgress();

  while (elapsed < totalSeconds) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    elapsed++;
    renderProgress();
  }

  const remainingMs = totalMs % 1000;
  if (remainingMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingMs));
  }

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(`${label}: ✅ Completed\n`);
}

// Function to save logs to a file
async function logToFile(message) {
  const logFilePath = "logs.log"; // Log file name
  try {
    await appendFile(logFilePath, message + "\n", "utf-8");
  } catch (err) {
    console.error("❌ Error saving log:", err.message);
  }
}

// Function for a short random delay (1–3 seconds)
async function waitRandomShortDelay() {
  const delayMs = Math.random() * (3000 - 1000) + 1000; // 1000ms to 3000ms
  const msg = `⏳ Short pause of ${(delayMs / 1000).toFixed(2)} sec`;
  await waitWithProgress(msg, delayMs);
}

// Function for a long random delay
async function waitRandomMinutes({ waitMin = 7, waitMax = 10 } = {}) {
  const delayMs = (waitMin + Math.random() * (waitMax - waitMin)) * 60000; // Wait between waitMin and waitMax mins
  const msg = `🕒 Long wait of ${(delayMs / 60000).toFixed(2)} min`;
  await waitWithProgress(msg, delayMs);
}

// Function to replace variables in prompts
function replaceVariables(prompt, vars) {
  const usedValues = {}; // Store the random value for each variable

  return prompt.replace(/{{(.*?)}}/g, (_, varName) => {
    if (!usedValues[varName]) {
      const values = vars[varName];
      if (!values || values.length === 0) {
        throw new Error(`Variable "${varName}" not found or empty.`);
      }
      const randomIndex = Math.floor(Math.random() * values.length);
      usedValues[varName] = values[randomIndex];
    }
    return usedValues[varName];
  });
}

const res = await fetch("http://localhost:9222/json/version");
const { webSocketDebuggerUrl } = await res.json();

const browser = await puppeteer.connect({
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: null,
});

const pages = await browser.pages();
const page = pages.find((p) => p.url().includes("sora"));

if (!page) {
  console.log('❌ "My Media" page on Sora not found.');
  process.exit(1);
}

console.log("✅ Connected to page:", page.url());

while (true) {
  try {
    // Load prompts and variables from the JSON file
    const { prompts, vars, params } = JSON.parse(
      await readFile("playbook.json", "utf-8")
    );

    // Prompt enabled check
    const enabledPrompts = prompts.filter((p) => p.enabled);
    if (enabledPrompts.length === 0) {
      console.log("❌ Nessun prompt abilitato.");
      await waitRandomMinutes(params);
      continue;
    }

    // Select a random prompt tra quelli abilitati
    const randomIndex = Math.floor(Math.random() * enabledPrompts.length);
    const currentPromptTemplate = enabledPrompts[randomIndex];
    const currentPromptText = currentPromptTemplate.text;
    const retries = currentPromptTemplate.retries || 3; // Default to 3 retries if not specified
    const currentPrompt = replaceVariables(currentPromptText, vars);

    for (let repeat = 1; repeat <= retries; repeat++) {
      const timestamp = new Date().toLocaleString();
      const logMessage = `\n${timestamp}\n📝 Prompt ${randomIndex + 1}/${
        prompts.length
      } (retry ${repeat}/${retries}): "${currentPrompt}"`;
      console.log(logMessage);
      if (repeat === 1) {
        await logToFile(logMessage);
      } else {
        await logToFile(`${timestamp} - Retry ${repeat}/${retries}`);
      }

      // Click "Edit prompt"
      await page.evaluate(() => {
        const buttons = [...document.querySelectorAll("button")];
        const target = buttons.find((btn) => {
          const div = btn.querySelector("div");
          return div && div.textContent.trim().toLowerCase() === "edit prompt";
        });
        if (target) target.click();
      });

      // Wait for a short time
      await waitRandomShortDelay();

      // Focus on the textarea
      await page.focus("textarea");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Position the cursor
      // await page.keyboard.press("Tab");
      // await new Promise((resolve) => setTimeout(resolve, 1000));

      // Select all and delete
      await page.keyboard.down("Control");
      await page.keyboard.press("KeyA");
      await page.keyboard.up("Control");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Type the prompt
      await page.keyboard.type(currentPrompt, { delay: Math.random() * 6 + 2 });

      console.log("✏️ Prompt entered.");

      // Wait for a short time
      await waitRandomShortDelay();

      // Wait for "Create image" to be enabled
      await page.waitForFunction(
        () => {
          return [...document.querySelectorAll("button")].some((btn) => {
            const span = btn.querySelector("span.sr-only");
            return (
              span &&
              span.innerText.toLowerCase().includes("create image") &&
              btn.getAttribute("data-disabled") === "false"
            );
          });
        },
        { timeout: 10000 }
      );

      // Click "Create image"
      await page.evaluate(() => {
        const buttons = [...document.querySelectorAll("button")];
        const target = buttons.find((btn) => {
          const span = btn.querySelector("span.sr-only");
          return (
            span &&
            span.innerText.toLowerCase().includes("create image") &&
            btn.getAttribute("data-disabled") === "false"
          );
        });
        if (target) target.click();
      });

      console.log("🎨 Image generation started.");

      // Wait for a random time
      await waitRandomMinutes(params);
    }
  } catch (err) {
    console.error("❌ Error in loop:", err.message);
    await new Promise((resolve) => setTimeout(resolve, 60000));
  }
}
