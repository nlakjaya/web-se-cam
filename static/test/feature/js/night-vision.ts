import { VideoPipeline } from "../../../js/service/video-pipeline";
import { DeviceAccess } from "../../../js/service/device-access";
import { NightVision } from "../../../js/service/night-vision";
import { sleep } from "../../js/base";
import { LOGGER } from "../../../js/util/logger";

async function happyPath() {
  const app = document.getElementById("app");

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
      }
    }
    LOGGER.debug("cycle options: ", JSON.stringify(optionsCycle[idx]));
    nightVision.updateOptions(optionsCycle[idx++]);
  }, 2000);
}

happyPath();
