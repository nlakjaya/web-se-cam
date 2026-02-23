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

window.addEventListener("appinstalled", () => {
  logger.debug("app was installed");
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  logger.debug("app not installed yet");
  window.beforeInstallPromptEvent = event;
});

window.backupConfigs = () => JSON.stringify(Object.entries(localStorage));
window.restoreConfigs = (configs) => {
  localStorage.clear();
  JSON.parse(configs).forEach(([k, v]) => localStorage.setItem(k, v));

  caches
    .keys()
    .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    .then(() => location.reload());
};
