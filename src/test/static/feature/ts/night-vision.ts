import { VideoPipeline } from "../../../ts/service/video-pipeline";
import { DeviceAccess } from "../../../ts/service/device-access";
import { NightVision } from "../../../ts/service/night-vision";
import { LOGGER } from "../../../ts/util/logger";
import { sleep } from "../../ts/base";

const app = document.getElementById("app");

async function happyPath() {
  const video = new VideoPipeline();
  const nightVision = new NightVision();
  const devices = new DeviceAccess();

  video.addLayer(nightVision);
  const optionsCycle = [
    {
      subPixelMultiplier: undefined,
      mixFrames: undefined,
      mixSubPixels: undefined,
    },
    {
      subPixelMultiplier: 2,
      mixFrames: undefined,
      mixSubPixels: undefined,
    },
    {
      subPixelMultiplier: undefined,
      mixFrames: 1,
      mixSubPixels: undefined,
    },
    {
      subPixelMultiplier: undefined,
      mixFrames: undefined,
      mixSubPixels: true,
    },
    {
      subPixelMultiplier: undefined,
      mixFrames: 1,
      mixSubPixels: true,
    },
    {
      subPixelMultiplier: 2,
      mixFrames: undefined,
      mixSubPixels: true,
    },
    {
      subPixelMultiplier: 2,
      mixFrames: 1,
      mixSubPixels: undefined,
    },
    {
      subPixelMultiplier: 2,
      mixFrames: 1,
      mixSubPixels: true,
    },
  ];

  if (app) {
    app.appendChild(video.getCanvasElement());
  }

  const mediaStream = await devices.start();
  video.setMediaStream(mediaStream);

  let idx = 0;
  const intervalId = setInterval(() => {
    if (idx >= optionsCycle.length) {
      clearInterval(intervalId);
      devices.stop();
      if (app) {
        app.removeChild(video.getCanvasElement());
        app.textContent = "Test Completed" as string;
      }
    }
    LOGGER.debug("cycle options: ", JSON.stringify(optionsCycle[idx]));
    nightVision.updateOptions(optionsCycle[idx++]);
  }, 2000);
}

happyPath();
