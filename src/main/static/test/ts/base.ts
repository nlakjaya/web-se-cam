import { LoggerConfig, LoggerConfigReload } from "../../ts/util/logger";

const log = document.getElementById("log");
if (log) {
  log.textContent = "";
  LoggerConfig.subscribers.push(
    (...messages: any[]) => (log.textContent += messages.join(" ") + "\n"),
  );
}
LoggerConfig.level = "DEBUG";
LoggerConfigReload();

console.clear();

const resetButton = document.createElement("button");
resetButton.onclick = () =>
  caches
    .keys()
    .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    .then(() => location.reload());
resetButton.textContent = "Clear Cache and Reload";
const app = document.getElementById("app");
if (app) {
  app.appendChild(resetButton);
  app.appendChild(document.createElement("br"));
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
