import puppeteer from "puppeteer-core";
import { readFile, appendFile } from "fs/promises";

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
  process.stdout.write(`${label}: ✅ Completato\n`);
}

// Funzione per salvare i log su file
async function logToFile(message) {
  const logFilePath = "logs.log"; // Nome del file di log
  try {
    await appendFile(logFilePath, message + "\n", "utf-8");
  } catch (err) {
    console.error("❌ Errore durante il salvataggio del log:", err.message);
  }
}

// Funzione di attesa random breve (1–3 secondi)
async function waitRandomShortDelay() {
  const delayMs = Math.random() * (3000 - 1000) + 1000; // da 1000ms a 3000ms
  const msg = `⏳ Pausa breve di ${(delayMs / 1000).toFixed(2)} sec`;
  await waitWithProgress(msg, delayMs);
}

// Funzione di attesa lunga
async function waitRandomMinutes() {
  const delayMs = (7 + Math.random() * 3) * 60 * 1000; // da 7 a 10 minuti
  const msg = `🕒 Attesa lunga di ${(delayMs / 60000).toFixed(2)} min`;
  await waitWithProgress(msg, delayMs);
}

// Funzione per sostituire le variabili nei prompt
function replaceVariables(prompt, vars) {
  return prompt.replace(/{{(.*?)}}/g, (_, varName) => {
    const values = vars[varName];
    if (!values || values.length === 0) {
      throw new Error(`Variabile "${varName}" non trovata o vuota.`);
    }
    const randomIndex = Math.floor(Math.random() * values.length);
    return values[randomIndex];
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
  console.log('❌ Pagina "My Media" di Sora non trovata.');
  process.exit(1);
}

console.log("✅ Collegato alla pagina:", page.url());

let index = 0;

while (true) {
  try {
    // Carica i prompt e le variabili dal file JSON
    const { prompts, vars } = JSON.parse(
      await readFile("prompts.json", "utf-8")
    );

    const currentPromptTemplate = prompts[index % prompts.length];
    const currentPromptText = currentPromptTemplate.text;
    const retries = currentPromptTemplate.retries || 3; // Default a 3 retry se non specificato
    const currentPrompt = replaceVariables(currentPromptText, vars);

    for (let repeat = 1; repeat <= retries; repeat++) {
      const timestamp = new Date().toLocaleString();
      const logMessage = `\n${timestamp}\n📝 Prompt ${
        (index % prompts.length) + 1
      }/${prompts.length} (retry ${repeat}/${retries}): "${currentPrompt}"`;
      console.log(logMessage);
      if (repeat > 1) {
        await logToFile(logMessage);
      } else {
        await logToFile(`${timestamp} - Retry ${repeat}/${retries}`);
      }

      // Clic su "Edit prompt"
      await page.evaluate(() => {
        const buttons = [...document.querySelectorAll("button")];
        const target = buttons.find((btn) => {
          const div = btn.querySelector("div");
          return div && div.textContent.trim().toLowerCase() === "edit prompt";
        });
        if (target) target.click();
      });

      // Aspetta un tempo breve
      await waitRandomShortDelay();

      // Focus sulla textarea
      await page.focus("textarea");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Si posiziona
      await page.keyboard.press("Tab");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Seleziona tutto e cancella
      await page.keyboard.down("Control");
      await page.keyboard.press("KeyA");
      await page.keyboard.up("Control");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Digita il prompt
      await page.keyboard.type(currentPrompt, { delay: Math.random() * 6 + 2 });

      console.log("✏️ Prompt inserito.");

      // Aspetta un tempo breve
      await waitRandomShortDelay();

      // Aspetta che "Create image" sia abilitato
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

      // Clic su "Create image"
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

      console.log("🎨 Generazione avviata.");

      // Attendi tempo casuale (2–4 minuti)
      await waitRandomMinutes();
    }

    index++;
  } catch (err) {
    console.error("❌ Errore nel ciclo:", err.message);
    await new Promise((resolve) => setTimeout(resolve, 60000));
  }
}
