// @ts-expect-error
import { DeviceAccess } from "../../../ts/service/device-access";
// @ts-expect-error
import { Storage } from "../../../ts/service/storage";
// @ts-expect-error
import { MediaRecorder } from "../../../ts/service/media-recorder";
// @ts-expect-error
import { ContinuousRecorder } from "../../../ts/service/continuous-recorder";
import { sleep } from "../../ts/base";

const app = document.getElementById("app");

async function happyPath() {
  const videoElement = document.createElement("video");

  const devices = new DeviceAccess();
  const storage = new Storage();
  const recorder = new ContinuousRecorder();

  const mediaStream = await devices.start();
  videoElement.srcObject = mediaStream;
  videoElement.muted = true;
  videoElement.play();
  storage.init();

  recorder.updateOptions({
    interval: 3000,
    onSave: (filename: string, blob: Blob) =>
      storage.save(`continuous-recorder-test-${filename}`, blob),
  });
  recorder.start(new MediaRecorder({}, ...mediaStream.getTracks()));

  if (app) {
    app.appendChild(videoElement);
  }

  await sleep(6000);

  recorder.stop();
  videoElement.srcObject = null;
  devices.stop();
  if (app) {
    app.removeChild(videoElement);
  }
}

happyPath();
