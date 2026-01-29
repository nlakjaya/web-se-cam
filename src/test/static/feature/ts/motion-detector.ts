import { MotionDetector } from "../../../ts/service/motion-detector";
import { VideoPipeline } from "../../../ts/service/video-pipeline";
import { DeviceAccess } from "../../../ts/service/device-access";
import { sleep } from "../../ts/base";

const app = document.getElementById("app");

async function happyPath() {
  const video = new VideoPipeline();
  const motion = new MotionDetector();
  const devices = new DeviceAccess();

  video.addLayer(motion);

  const motionCanvas = motion.getCanvasElement();
  motionCanvas.style.position = "absolute";
  motionCanvas.style.top = "0";
  motionCanvas.style.left = "0";
  motionCanvas.style.width = "100%";
  motionCanvas.style.imageRendering = "pixelated";
  motion.updateOptions({
    previewMotionBlur: true,
    // previewMask: true,
  });

  let triggerCounter = 0;
  const triggerCounterElement = document.createElement("p");
  const trigger = () => {
    triggerCounter++;
    triggerCounterElement.textContent = `Trigger Counter: ${triggerCounter} frames`;
  };
  motion.addTrigger(trigger);

  if (app) {
    app.appendChild(video.getCanvasElement());
    app.appendChild(motionCanvas);
    app.appendChild(triggerCounterElement);
  }

  const mediaStream = await devices.start();
  video.setMediaStream(mediaStream);
}

happyPath();
