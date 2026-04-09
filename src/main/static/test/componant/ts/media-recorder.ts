import { DeviceAccess } from "../../../ts/service/device-access";
import { Storage } from "../../../ts/service/storage";
import { MediaRecorder } from "../../../ts/service/media-recorder";
import { sleep } from "../../ts/base";
import { Logger } from "../../../ts/util/logger";

const app = document.getElementById("app");
const logger = new Logger("Test");

async function happyPath() {
  const videoElement = document.createElement("video");

  const devices = new DeviceAccess();
  const storage = new Storage();

  const mediaStream = await devices.start({
    video: { facingMode: "environment" },
    audio: {},
  });
  videoElement.srcObject = mediaStream;
  videoElement.muted = true;
  videoElement.play();
  storage.init();

  logger.info("Recording... (without pre-roll)");
  const recorder = new MediaRecorder({}, ...mediaStream.getTracks());
  recorder.start();
  if (app) {
    app.append(videoElement);
  }

  await sleep(3000);

  logger.info("Saving... (without pre-roll)");
  let blob = await recorder.stop();
  storage.save("wsc-media-recorder-test.webm", blob);

  logger.info("Pre-Rolling...");
  recorder.start(1000, 2000);

  await sleep(5000);

  logger.info("Recording... (with pre-roll)");
  recorder.start();

  await sleep(3000);

  logger.info("Saving... (with pre-roll)");
  blob = await recorder.stop();
  storage.save("wsc-pre-roll-media-recorder-test.webm", blob);

  videoElement.srcObject = null;
  devices.stop();
  if (app) {
    videoElement.remove();
    app.append(document.createTextNode("Test Completed"));
  }
}

happyPath();
