import { loadModule } from "./ts-browser/ts-browser.js";
loadModule("ts/main");

const logger = {
  debug: (
    ...messages //:any[]
  ) => console.log("DEBUG script.js", ...messages),
};

async function registerServiceWorker() {
  try {
    await navigator.serviceWorker.register("js/service-worker.js");
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
