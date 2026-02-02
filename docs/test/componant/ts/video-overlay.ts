import { VideoPipeline } from "../../../ts/service/video-pipeline";
import { VideoOverlay } from "../../../ts/service/video-overlay";
import { DeviceAccess } from "../../../ts/service/device-access";
import { sleep } from "../../ts/base";

const app = document.getElementById("app");

async function happyPath() {
  const video = new VideoPipeline();
  const overlay = new VideoOverlay();
  const devices = new DeviceAccess();

  video.addLayer(overlay);
  overlay.updateOptions({ showStats: true });

  if (app) {
    app.appendChild(video.getCanvasElement());
  }

  const mediaStream = await devices.start();
  video.setMediaStream(mediaStream);
}

happyPath();
