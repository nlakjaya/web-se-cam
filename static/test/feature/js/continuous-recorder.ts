import { DeviceAccess } from "../../../js/service/device-access";
import { Storage } from "../../../js/service/storage";
import { MediaRecorder } from "../../../js/service/media-recorder";
import { ContinuousRecorder } from "../../../js/service/continuous-recorder";
import { sleep } from "../../js/base";

async function happyPath() {
  const app = document.getElementById("app");
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
    onSave: (filename, blob) =>
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
