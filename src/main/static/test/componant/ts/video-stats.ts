import { VideoPipeline } from "../../../ts/service/video-pipeline";
import { VideoStats } from "../../../ts/service/video-stats";
import { DeviceAccess } from "../../../ts/service/device-access";
import { sleep } from "../../ts/base";

const app = document.getElementById("app");

async function happyPath() {
  const video = new VideoPipeline();
  const stats = new VideoStats();
  const devices = new DeviceAccess();

  video.addLayer(stats);

  const mediaStream = await devices.start({
    video: { facingMode: "environment" },
    audio: {},
  });
  video.setMediaStream(mediaStream);

  const statsElement = document.createElement("pre");
  const updateStatus = () => {
    statsElement.textContent = `${stats.getFps(2)} fps\n${stats.getFrameCount()} frames`;
  };
  setInterval(updateStatus, 100);

  if (app) {
    app.append(video.getCanvasElement(), statsElement);
  }
}

happyPath();
