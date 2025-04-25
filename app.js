import puppeteer from "puppeteer-core";
import { readFile } from "fs/promises";

// Funzione di attesa random breve (1–3 secondi)
function waitRandomShortDelay() {
  const delayMs = Math.floor(Math.random() * 3 + 1) * 1000;
  console.log(`⏳ Pausa breve di ${delayMs / 1000} secondi...`);
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

// Funzione di attesa lunga
function waitRandomMinutes() {
  const delayMs = Math.floor(Math.random() * 8 + 2) * 60 * 1000;
  console.log(`🕒 Aspetto ${delayMs / 1000 / 60} minuti...`);
  return new Promise((resolve) => setTimeout(resolve, delayMs));
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
    console.log(`📝 Prompt corrente: "${currentPrompt}"`);

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

    // Seleziona tutto e cancella il contenuto precedente (Cmd+A + Backspace su Mac/Linux)
    // await page.keyboard.down("Meta"); // 'Control' se sei su Windows
    // await page.keyboard.press("KeyA");
    // await page.keyboard.up("Meta");
    // await page.keyboard.press("Backspace");

    await page.keyboard.press("Tab");
    await page.keyboard.down("Control");
    await page.keyboard.press("KeyA");
    await page.keyboard.up("Control");
    // await page.keyboard.press("Backspace");

    // for (let i = 0; i < 1000; i++) {
    //   await page.keyboard.press("Backspace");
    // }

    // Attendi un attimo prima di digitare
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Digita il prompt come un umano
    await page.keyboard.type(currentPrompt, { delay: 2 });

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

    index++;
  } catch (err) {
    console.error("❌ Errore nel ciclo:", err.message);
    await new Promise((resolve) => setTimeout(resolve, 60000));
  }
}
