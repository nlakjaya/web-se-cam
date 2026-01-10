import { VideoPipeline } from "../../../js/service/video-pipeline";
import { VideoOverlay } from "../../../js/service/video-overlay";
import { DeviceAccess } from "../../../js/service/device-access";
import { sleep } from "../../js/base";

async function happyPath() {
  const app = document.getElementById("app");

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
