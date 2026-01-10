import { Logger, LOGGER } from "../../../js/util/logger";

const log = document.getElementById("log");
if (log) {
  log.textContent = "";
  LOGGER.subscribers.push(
    (...messages: any[]) => (log.textContent += messages.join(" ") + "\n"),
  );
}
LOGGER.level = "DEBUG";
LOGGER.reload();

function happyPath() {
  const logger = new Logger("test");
  logger.time("time");
  logger.count("count");
  logger.error("error");
  logger.warn("warn");
  logger.info("info");
  logger.debug("debug");
  logger.timeEnd("time");
}

happyPath();
