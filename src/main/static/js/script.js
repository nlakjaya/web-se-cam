import { loadModule } from "./klesun/ts-browser/src/ts-browser.js";
import { Logger } from "./logger.js";
loadModule("ts/main");

const logger = new Logger("script.js");

if (navigator.serviceWorker) {
  navigator.serviceWorker
    .register("./service-worker.js")
    .then(() => logger.debug("Service Worker registered"))
    .catch(() => logger.debug("Service Worker registration failed:", error));
}

globalThis.addEventListener("appinstalled", () => {
  logger.debug("app was installed");
});

globalThis.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  logger.debug("app not installed yet");
  globalThis.beforeInstallPromptEvent = event;
});

globalThis.backupConfigs = () => JSON.stringify(Object.entries(localStorage));
globalThis.restoreConfigs = (configs) => {
  localStorage.clear();
  JSON.parse(configs).forEach(([k, v]) => localStorage.setItem(k, v));

  caches
    .keys()
    .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    .then(() => location.reload());
};
