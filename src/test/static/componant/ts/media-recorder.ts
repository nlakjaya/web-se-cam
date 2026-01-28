// @ts-expect-error
import { DeviceAccess } from "../../../ts/service/device-access";
// @ts-expect-error
import { Storage } from "../../../ts/service/storage";
// @ts-expect-error
import { MediaRecorder } from "../../../ts/service/media-recorder";
// @ts-expect-error
import { LOGGER } from "../../../ts/util/logger";
import { sleep } from "../../ts/base";

const app = document.getElementById("app");

async function happyPath() {
  const videoElement = document.createElement("video");

  const devices = new DeviceAccess();
  const storage = new Storage();

  const mediaStream = await devices.start();
  videoElement.srcObject = mediaStream;
  videoElement.muted = true;
  videoElement.play();
  storage.init();

  LOGGER.info("Recording... (without pre-roll)");
  const recorder = new MediaRecorder({}, ...mediaStream.getTracks());
  recorder.start();
  if (app) {
    app.appendChild(videoElement);
  }

  await sleep(3000);

  LOGGER.info("Saving... (without pre-roll)");
  let blob = await recorder.stop();
  storage.save("wsc-media-recorder-test.webm", blob);

  LOGGER.info("Pre-Rolling...");
  recorder.start(1000, 2000);

  await sleep(5000);

  LOGGER.info("Recording... (with pre-roll)");
  recorder.start();

  await sleep(3000);

  LOGGER.info("Saving... (with pre-roll)");
  blob = await recorder.stop();
  storage.save("wsc-pre-roll-media-recorder-test.webm", blob);

  videoElement.srcObject = null;
  devices.stop();
  if (app) {
    app.removeChild(videoElement);
    app.textContent = "Test Completed" as string;
  }
}

happyPath();
