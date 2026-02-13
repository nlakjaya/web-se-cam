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

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
