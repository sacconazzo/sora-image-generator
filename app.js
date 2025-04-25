import puppeteer from "puppeteer-core";
import { readFile } from "fs/promises";

async function waitWithProgress(label, totalMs) {
  console.log('')
  
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
    await new Promise(resolve => setTimeout(resolve, 1000));
    elapsed++;
    renderProgress();
  }

  const remainingMs = totalMs % 1000;
  if (remainingMs > 0) {
    await new Promise(resolve => setTimeout(resolve, remainingMs));
  }

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(`${label}: 100% (0s) ✅ Completato\n`);
}

// Funzione di attesa random breve (1–3 secondi)
async function waitRandomShortDelay() {
  const delayMs = Math.random() * (3000 - 1000) + 1000; // da 1000ms a 3000ms
  await waitWithProgress(`⏳ Pausa breve di ${(delayMs / 1000).toFixed(2)} sec`, delayMs);
}

// Funzione di attesa lunga
async function waitRandomMinutes() {
  const delayMs = Math.random() * (4 - 2) * 60 * 1000 + 2 * 60 * 1000; // da 120000ms a 240000ms
  await waitWithProgress(`🕒 Attesa lunga di ${(delayMs / 60000).toFixed(2)} min`, delayMs);
}

// Carica i prompt dal file JSON
const { prompts } = JSON.parse(await readFile("prompts.json", "utf-8"));

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
    const currentPrompt = prompts[index % prompts.length];

    for (let repeat = 1; repeat <= 3; repeat++) {
      console.log(
        `📝 Prompt corrente (ripetizione ${repeat}/3): "${currentPrompt}"`
      );

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

      // Seleziona tutto e cancella
      await page.keyboard.press("Tab");
      await page.keyboard.down("Control");
      await page.keyboard.press("KeyA");
      await page.keyboard.up("Control");

      // Aspetta un attimo prima di digitare
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Digita il prompt
      await page.keyboard.type(currentPrompt, { delay: Math.random() * 6 + 6 });

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
