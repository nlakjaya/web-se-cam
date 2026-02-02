import { Storage } from "../../../ts/service/storage";
// import { Uploader } from "../../ts/service/uploader";
import { DeviceAccess } from "../../../ts/service/device-access";
import { VideoPipeline } from "../../../ts/service/video-pipeline";
// import { NightVision } from "../../ts/service/night-vision";
import { MotionDetector } from "../../../ts/service/motion-detector";
import { VideoOverlay } from "../../../ts/service/video-overlay";
import { MediaRecorder } from "../../../ts/service/media-recorder";
import { ContinuousRecorder } from "../../../ts/service/continuous-recorder";
import { sleep } from "../../ts/base";

const app = document.getElementById("app");

async function happyPath() {
  const storage = new Storage();
  // const uploader = new Uploader("/upload");
  const devices = new DeviceAccess();
  const video = new VideoPipeline();
  // const night = new NightVision();
  const motion = new MotionDetector();
  const overlay = new VideoOverlay();

  storage.init();
  // uploader.updateOptions({ fallbackStorage: storage });
  // video.addLayer(night);
  video.addLayer(motion);
  video.addLayer(overlay);
  overlay.updateOptions({ showStats: true });

  const mediaStream = await devices.start();
  video.setMediaStream(mediaStream);

  if (app) {
    const motionCanvas = motion.getCanvasElement();
    motionCanvas.style.position = "absolute";
    motionCanvas.style.top = "0";
    motionCanvas.style.left = "0";
    motionCanvas.style.width = "100%";
    motionCanvas.style.imageRendering = "pixelated";

    app.appendChild(video.getCanvasElement());
    app.appendChild(motionCanvas);
  }

  const spRecorder = new MediaRecorder(
    { videoBitsPerSecond: 512000, audioBitsPerSecond: 64000 },
    ...video.getCanvasElement().captureStream().getVideoTracks(),
    ...mediaStream.getAudioTracks(),
  );

  const spContinuous = new ContinuousRecorder();
  spContinuous.updateOptions({
    fileNaming: "%YYYY%MM%DD%hh%mm%ss-trigger%n",
    interval: 10000,
    onSave: (filename: string, blob: Blob) => storage.save(filename, blob),
  });

  spRecorder.start(undefined, 2000);

  let triggerTimeoutId: any;
  const trigger = (instance: any) => {
    if (triggerTimeoutId) {
      clearTimeout(triggerTimeoutId);
    } else {
      spContinuous.updateOptions({
        fileNaming:
          instance instanceof MotionDetector
            ? "%YYYY%MM%DD%hh%mm%ss-motion%n"
            : "%YYYY%MM%DD%hh%mm%ss-trigger%n",
      });
      console.log("trigger recording started", triggerTimeoutId);
      spContinuous.start(spRecorder);
    }
    triggerTimeoutId = setTimeout(() => {
      console.log("trigger recording ended");
      spContinuous.stop();
      spRecorder.start(undefined, 2000);
      triggerTimeoutId = undefined;
    }, 3000);
  };
  motion.addTrigger(trigger);
}

happyPath();
