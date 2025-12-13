import puppeteer from "puppeteer-core";
import { readFile, appendFile, writeFile, readdir, mkdir } from "fs/promises";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { EventEmitter } from "events";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PLAYBOOKS_DIR = join(__dirname, "playbooks");

// Ensure playbooks directory exists
async function ensurePlaybooksDir() {
  if (!existsSync(PLAYBOOKS_DIR)) {
    await mkdir(PLAYBOOKS_DIR, { recursive: true });
  }
}

// Event emitter for logs
const logEmitter = new EventEmitter();
let recentLogs = [];
const MAX_LOGS = 100;

// Generator state
let isGeneratorRunning = false;
let shouldStopGenerator = false;
let browser = null;
let page = null;

// Function to log and emit
function log(message, type = "info") {
  const timestamp = new Date().toLocaleString();
  const logEntry = { timestamp, message, type };
  console.log(message);
  recentLogs.push(logEntry);
  if (recentLogs.length > MAX_LOGS) {
    recentLogs.shift();
  }
  logEmitter.emit("log", logEntry);
}

// Function to display a progress bar while waiting
async function waitWithProgress(label, totalMs) {
  const totalSeconds = Math.floor(totalMs / 1000);
  let elapsed = 0;

  function renderProgress() {
    const percent = Math.min((elapsed / totalSeconds) * 100, 100);
    const secondsLeft = Math.max(totalSeconds - elapsed, 0);
    const msg = `${label}: ${percent.toFixed(0)}% (${secondsLeft}s)`;
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(msg);
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
  const completeMsg = `${label}: ✅ Completed`;
  console.log(completeMsg);
  log(completeMsg);
}

// Function to save logs to a file
async function logToFile(message) {
  const logFilePath = "logs.log";
  try {
    await appendFile(logFilePath, message + "\n", "utf-8");
  } catch (err) {
    console.error("❌ Error saving log:", err.message);
  }
}

// Function for a short random delay (1–3 seconds)
async function waitRandomShortDelay() {
  const delayMs = Math.random() * (3000 - 1000) + 1000;
  const msg = `⏳ Short pause of ${(delayMs / 1000).toFixed(2)} sec`;
  await waitWithProgress(msg, delayMs);
}

// Function for a long random delay
async function waitRandomMinutes({ waitMin = 7, waitMax = 10 } = {}) {
  const delayMs = (waitMin + Math.random() * (waitMax - waitMin)) * 60000;
  const msg = `🕒 Long wait of ${(delayMs / 60000).toFixed(2)} min`;
  await waitWithProgress(msg, delayMs);
}

// Function to replace variables in prompts
function replaceVariables(prompt, vars) {
  const usedValues = {};
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

// Validation function for playbook
function validatePlaybook(data) {
  const errors = [];

  if (!Array.isArray(data.prompts)) {
    errors.push("prompts must be an array");
  } else {
    data.prompts.forEach((prompt, index) => {
      if (typeof prompt.text !== "string") {
        errors.push(`prompts[${index}].text must be a string`);
      }
      if (
        typeof prompt.retries !== "number" ||
        prompt.retries < 0 ||
        !Number.isInteger(prompt.retries)
      ) {
        errors.push(`prompts[${index}].retries must be a positive integer`);
      }
      if (prompt.enabled !== undefined && typeof prompt.enabled !== "boolean") {
        errors.push(`prompts[${index}].enabled must be a boolean`);
      }
    });
  }

  if (typeof data.vars !== "object" || Array.isArray(data.vars)) {
    errors.push("vars must be an object");
  } else {
    Object.entries(data.vars).forEach(([key, value]) => {
      if (!Array.isArray(value)) {
        errors.push(`vars.${key} must be an array`);
      } else if (value.length === 0) {
        errors.push(`vars.${key} must contain at least one value`);
      } else {
        value.forEach((item, index) => {
          if (typeof item !== "string") {
            errors.push(`vars.${key}[${index}] must be a string`);
          }
        });
      }
    });
  }

  if (typeof data.params !== "object" || Array.isArray(data.params)) {
    errors.push("params must be an object");
  } else {
    if (typeof data.params.waitMin !== "number" || data.params.waitMin < 0) {
      errors.push("params.waitMin must be a positive number");
    }
    if (typeof data.params.waitMax !== "number" || data.params.waitMax < 0) {
      errors.push("params.waitMax must be a positive number");
    }
    if (data.params.waitMin > data.params.waitMax) {
      errors.push("params.waitMin cannot be greater than params.waitMax");
    }
  }

  return errors;
}

// Main generator loop
async function runGenerator() {
  try {
    log("🔌 Connecting to browser...");
    const browserHost = process.env.BROWSER_HOST || "localhost";
    const browserPort = process.env.BROWSER_PORT || "9222";
    const res = await fetch(
      `http://${browserHost}:${browserPort}/json/version`
    );
    const { webSocketDebuggerUrl } = await res.json();

    browser = await puppeteer.connect({
      browserWSEndpoint: webSocketDebuggerUrl,
      defaultViewport: null,
    });

    const pages = await browser.pages();
    page = pages.find((p) => p.url().includes("sora"));

    if (!page) {
      log('❌ "My Media" page on Sora not found.', "error");
      isGeneratorRunning = false;
      return;
    }

    log("✅ Connected to page: " + page.url(), "success");
    isGeneratorRunning = true;

    while (!shouldStopGenerator) {
      try {
        const { prompts, vars, params } = JSON.parse(
          await readFile("playbook.json", "utf-8")
        );

        const enabledPrompts = prompts.filter((p) => p.enabled !== false);
        if (enabledPrompts.length === 0) {
          log("❌ No enabled prompts.", "warning");
          await waitRandomMinutes(params);
          continue;
        }

        const randomIndex = Math.floor(Math.random() * enabledPrompts.length);
        const currentPromptTemplate = enabledPrompts[randomIndex];
        const currentPromptText = currentPromptTemplate.text;
        const retries = currentPromptTemplate.retries || 3;
        const currentPrompt = replaceVariables(currentPromptText, vars);

        for (let repeat = 1; repeat <= retries; repeat++) {
          if (shouldStopGenerator) break;

          const timestamp = new Date().toLocaleString();
          const logMessage = `📝 Prompt ${randomIndex + 1}/${
            prompts.length
          } (retry ${repeat}/${retries}): "${currentPrompt}"`;
          log(logMessage);

          if (repeat === 1) {
            await logToFile(`\n${timestamp}\n${logMessage}`);
          } else {
            await logToFile(`${timestamp} - Retry ${repeat}/${retries}`);
          }

          await page.evaluate(() => {
            const buttons = [...document.querySelectorAll("button")];
            const target = buttons.find((btn) => {
              const div = btn.querySelector("div");
              return (
                div && div.textContent.trim().toLowerCase() === "edit prompt"
              );
            });
            if (target) target.click();
          });

          await waitRandomShortDelay();

          await page.focus("textarea");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          await page.keyboard.down("Control");
          await page.keyboard.press("KeyA");
          await page.keyboard.up("Control");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          await page.keyboard.type(currentPrompt, {
            delay: Math.random() * 6 + 2,
          });

          log("✏️ Prompt entered.");

          await waitRandomShortDelay();

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

          log("🎨 Image generation started.");

          await waitRandomMinutes(params);
        }
      } catch (err) {
        log(`❌ Error in loop: ${err.message}`, "error");
        await new Promise((resolve) => setTimeout(resolve, 60000));
      }
    }

    log("🛑 Generator stopped by user.", "info");
  } catch (err) {
    log(`❌ Fatal error: ${err.message}`, "error");
  } finally {
    isGeneratorRunning = false;
    shouldStopGenerator = false;
    if (browser) {
      await browser.disconnect();
    }
  }
}

// Express server setup
const app = express();
const PORT = 6699;
const HOST = process.env.HOST || "0.0.0.0"; // Listen on all network interfaces

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// GET playbook
app.get("/api/playbook", async (req, res) => {
  try {
    const data = await readFile("playbook.json", "utf-8");
    const playbook = JSON.parse(data);
    res.json(playbook);
  } catch (error) {
    console.error("Error reading playbook:", error);
    res.status(500).json({ error: "Failed to read playbook" });
  }
});

// POST playbook with validation
app.post("/api/playbook", async (req, res) => {
  try {
    const newPlaybook = req.body;

    const validationErrors = validatePlaybook(newPlaybook);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationErrors,
      });
    }

    await writeFile(
      "playbook.json",
      JSON.stringify(newPlaybook, null, 2),
      "utf-8"
    );

    log("✅ Playbook updated successfully", "success");
    res.json({ success: true, message: "Playbook updated successfully" });
  } catch (error) {
    console.error("Error updating playbook:", error);
    res.status(500).json({ error: "Failed to update playbook" });
  }
});

// Generator status
app.get("/api/generator/status", (req, res) => {
  res.json({ running: isGeneratorRunning });
});

// Start generator
app.post("/api/generator/start", async (req, res) => {
  if (isGeneratorRunning) {
    return res.status(400).json({ error: "Generator already running" });
  }

  shouldStopGenerator = false;
  runGenerator();

  res.json({ success: true, message: "Generator started" });
});

// Stop generator
app.post("/api/generator/stop", (req, res) => {
  if (!isGeneratorRunning) {
    return res.status(400).json({ error: "Generator not running" });
  }

  shouldStopGenerator = true;
  res.json({ success: true, message: "Generator stopping..." });
});

// SSE endpoint for logs
app.get("/api/logs/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const logListener = (logEntry) => {
    res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  };

  logEmitter.on("log", logListener);

  req.on("close", () => {
    logEmitter.removeListener("log", logListener);
  });
});

// Get recent logs
app.get("/api/logs", (req, res) => {
  res.json(recentLogs);
});

// List all playbooks in the playbooks folder
app.get("/api/playbooks", async (req, res) => {
  try {
    await ensurePlaybooksDir();
    const files = await readdir(PLAYBOOKS_DIR);
    const playbookFiles = files.filter((f) => f.endsWith(".json"));
    res.json({ playbooks: playbookFiles });
  } catch (error) {
    console.error("Error listing playbooks:", error);
    res.status(500).json({ error: "Failed to list playbooks" });
  }
});

// GET specific playbook from playbooks folder
app.get("/api/playbooks/:name", async (req, res) => {
  try {
    const { name } = req.params;
    if (!name.endsWith(".json")) {
      return res.status(400).json({ error: "Invalid playbook name" });
    }

    const playbookPath = join(PLAYBOOKS_DIR, name);
    const data = await readFile(playbookPath, "utf-8");
    const playbook = JSON.parse(data);
    res.json(playbook);
  } catch (error) {
    console.error("Error reading playbook:", error);
    res.status(404).json({ error: "Playbook not found" });
  }
});

// Save playbook with custom name to playbooks folder
app.post("/api/playbooks/:name", async (req, res) => {
  try {
    const { name } = req.params;
    if (!name.endsWith(".json")) {
      return res
        .status(400)
        .json({ error: "Playbook name must end with .json" });
    }

    const newPlaybook = req.body;
    const validationErrors = validatePlaybook(newPlaybook);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationErrors,
      });
    }

    await ensurePlaybooksDir();
    const playbookPath = join(PLAYBOOKS_DIR, name);
    await writeFile(
      playbookPath,
      JSON.stringify(newPlaybook, null, 2),
      "utf-8"
    );

    log(`✅ Playbook "${name}" saved successfully`, "success");
    res.json({
      success: true,
      message: `Playbook "${name}" saved successfully`,
    });
  } catch (error) {
    console.error("Error saving playbook:", error);
    res.status(500).json({ error: "Failed to save playbook" });
  }
});

// Delete a playbook from playbooks folder
app.delete("/api/playbooks/:name", async (req, res) => {
  try {
    const { name } = req.params;
    if (!name.endsWith(".json")) {
      return res.status(400).json({ error: "Invalid playbook name" });
    }

    const playbookPath = join(PLAYBOOKS_DIR, name);
    const fs = await import("fs/promises");
    await fs.unlink(playbookPath);

    log(`🗑️ Playbook "${name}" deleted successfully`, "success");
    res.json({
      success: true,
      message: `Playbook "${name}" deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting playbook:", error);
    res.status(500).json({ error: "Failed to delete playbook" });
  }
});

app.listen(PORT, HOST, () => {
  log(`🚀 Server running on http://${HOST}:${PORT}`, "success");
  log(`📝 API available at http://${HOST}:${PORT}/api/playbook`, "info");
  log(`🌐 Web interface at http://${HOST}:${PORT}`, "info");
});
