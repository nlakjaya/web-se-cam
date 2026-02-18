import { loadModule } from "./klesun/ts-browser/src/ts-browser.js";
import { Logger } from "./logger.js";
loadModule("ts/main");

const logger = new Logger("script.js");

async function registerServiceWorker() {
  try {
    await navigator.serviceWorker.register("./service-worker.js", {
      type: "module",
    });
    logger.debug("Service Worker registered");
  } catch (error) {
    logger.debug("Service Worker registration failed:", error);
  }
}

if (navigator.serviceWorker) {
  registerServiceWorker();
}

window.addEventListener("appinstalled", () => {
  logger.debug("app was installed");
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  logger.debug("app not installed yet");
  window.beforeInstallPromptEvent = event;
});
