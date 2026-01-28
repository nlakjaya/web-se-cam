import { Logger } from "./logger";
import { getParameter, setParameter } from "./parameter";

const logger = new Logger("DeviceID");

export function getDeviceId(): string {
  return getParameter("deviceId", () => {
    logger.info("Generating...");
    const buffer = new Uint32Array(2);
    window.crypto.getRandomValues(buffer);
    const deviceId = buffer
      .reduce((str, word) => str + word.toString(32).substring(0, 6), "")
      .substring(0, 6)
      .toUpperCase();
    setParameter("deviceId", deviceId);
    return deviceId;
  });
}
