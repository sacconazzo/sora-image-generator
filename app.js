import puppeteer from "puppeteer-core";

// Funzione di attesa random tra 2 e 4 minuti
function waitRandomMinutes() {
  const delayMs = Math.floor(Math.random() * (4 - 2 + 1) + 2) * 60 * 1000;
  console.log(`🕒 Aspetto ${delayMs / 1000 / 60} minuti...`);
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

(async () => {
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
    return;
  }

  console.log("✅ Collegato alla pagina:", page.url());

  while (true) {
    try {
      console.log("👉 Clic sul pulsante 'Edit prompt'...");

      await page.evaluate(() => {
        const buttons = [...document.querySelectorAll("button")];
        const target = buttons.find((btn) => {
          const div = btn.querySelector("div");
          return div && div.textContent.trim().toLowerCase() === "edit prompt";
        });
        if (target) target.click();
      });

      // Attendi un paio di secondi per dare tempo all'interfaccia di aggiornarsi
      const delayMs = Math.floor(Math.random() * (3 - 1 + 1) + 1) * 1000;
      console.log(
        `⏳ Attendo ${delayMs / 1000} secondi prima del prossimo click...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      console.log("⏳ Aspetto che 'Create image' sia cliccabile...");

      // Aspetta che il bottone "Create image" appaia e sia abilitato
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

      console.log("👉 Clic sul pulsante 'Create image'...");

      // Clicca sul bottone "Create image"
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

      console.log("✅ Fatto. Ora attesa casuale...");
      await waitRandomMinutes();
    } catch (err) {
      console.error("❌ Errore nel ciclo:", err.message);
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  }
})();
