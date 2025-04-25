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
      console.log("👉 Clic sul primo pulsante (class truncate)...");

      // Clicca sul primo bottone con class truncate
      await page.evaluate(() => {
        const btn = document.querySelector("button.truncate");
        if (btn) btn.click();
      });

      // Aspetta che il modale si apra (cerchiamo per span "Create image")
      await page.waitForFunction(
        () => {
          return [...document.querySelectorAll("button")].some((btn) => {
            const span = btn.querySelector("span.sr-only");
            return (
              span && span.innerText.toLowerCase().includes("create image")
            );
          });
        },
        { timeout: 5000 }
      );

      console.log("👉 Clic sul pulsante 'Create image'...");

      // Clicca sul bottone identificato dal contenuto del suo span
      await page.evaluate(() => {
        const buttons = [...document.querySelectorAll("button")];
        const target = buttons.find((btn) => {
          const span = btn.querySelector("span.sr-only");
          return span && span.innerText.toLowerCase().includes("create image");
        });
        if (target) target.click();
      });

      console.log("✅ Fatto. Ora attesa casuale...");

      await waitRandomMinutes();
    } catch (err) {
      console.error("❌ Errore nel ciclo:", err.message);
      await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
  }
})();
