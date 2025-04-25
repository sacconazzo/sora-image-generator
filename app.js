import puppeteer from "puppeteer-core";

(async () => {
  // Ottieni endpoint del browser
  const res = await fetch("http://localhost:9222/json/version");
  const { webSocketDebuggerUrl } = await res.json();

  // Collegati alla sessione
  const browser = await puppeteer.connect({
    browserWSEndpoint: webSocketDebuggerUrl,
  });
  const pages = await browser.pages();

  // Ora puoi interagire con le pagine già aperte
  const page = pages.find((p) => p.url().includes("sora.chatgpt.com"));
  if (page) {
    await page.evaluate(() => {
      console.log("Eseguito codice nella pagina già aperta");
      // Puoi anche fare click, compilare form, ecc.
    });
  } else {
    console.log("Pagina non trovata");
  }
})();
