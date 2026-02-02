import { LOGGER } from "../../ts/util/logger";

const log = document.getElementById("log");
if (log) {
  log.textContent = "";
  LOGGER.subscribers.push(
    (...messages: any[]) => (log.textContent += messages.join(" ") + "\n"),
  );
}
LOGGER.level = "DEBUG";
LOGGER.reload();

console.clear();

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
