import { Storage } from "../../../js/service/storage";
// import { Uploader } from "../../js/service/uploader";
import { DeviceAccess } from "../../../js/service/device-access";
import { VideoPipeline } from "../../../js/service/video-pipeline";
// import { NightVision } from "../../js/service/night-vision";
import { NoiseDetector } from "../../../js/service/noise-detector";
import { VideoOverlay } from "../../../js/service/video-overlay";
import { MediaRecorder } from "../../../js/service/media-recorder";
import { ContinuousRecorder } from "../../../js/service/continuous-recorder";
import { sleep } from "../../js/base";

async function happyPath() {
  const app = document.getElementById("app");
  const levelIndicator = document.createElement("div");
  levelIndicator.innerHTML =
    '<div style="position:relative; border:1px solid black; aspect-ratio:25; width:400px;">\
<div style="position:absolute; top:2px; left:2px; bottom:2px; background:gray;"></div>\
<div style="position:absolute; top:0px; left:2px; bottom:0px; border-right:2px dotted black;"></div> \
</div>';
  const levelStyle = (levelIndicator.firstChild?.firstChild as HTMLDivElement)
    ?.style;
  const thresholdStyle = (
    levelIndicator.firstChild?.childNodes[1] as HTMLDivElement
  )?.style;

  const storage = new Storage();
  // const uploader = new Uploader("/upload");
  const devices = new DeviceAccess();
  const video = new VideoPipeline();
  // const night = new NightVision();
  const noise = new NoiseDetector();
  const overlay = new VideoOverlay();

  storage.init();
  // uploader.updateOptions({ fallbackStorage: storage });
  // video.addLayer(night);
  video.addLayer(overlay);
  overlay.updateOptions({ showStats: true });

  const mediaStream = await devices.start();
  video.setMediaStream(mediaStream);
  noise.setMediaStream(mediaStream);

  if (app) {
    app.appendChild(video.getCanvasElement());

    app.appendChild(levelIndicator);
    thresholdStyle.width = (20 * 100) / 255 + "%";
    function levelIndicatorAnimator() {
      levelStyle.width = (noise.peakLevel * 100) / 255 + "%";
      if (!mediaStream.active) {
        console.log("level indicator: stopped");
        levelStyle.width = "0%";
        return;
      }
      requestAnimationFrame(levelIndicatorAnimator);
    }
    levelIndicatorAnimator();
  }

  const spRecorder = new MediaRecorder(
    { videoBitsPerSecond: 512000, audioBitsPerSecond: 64000 },
    ...video.getCanvasElement().captureStream().getVideoTracks(),
    ...mediaStream.getAudioTracks()
  );

  const spContinuous = new ContinuousRecorder();
  spContinuous.updateOptions({
    fileNaming: "%YYYY%MM%DD%hh%mm%ss-trigger%n",
    interval: 10000,
    onSave: (filename, blob) => storage.save(filename, blob),
  });

  spRecorder.start(undefined, 2000);

  let triggerTimeoutId: any;
  const trigger = (instance: any) => {
    if (triggerTimeoutId) {
      clearTimeout(triggerTimeoutId);
    } else {
      spContinuous.updateOptions({
        fileNaming:
          instance instanceof NoiseDetector
            ? "%YYYY%MM%DD%hh%mm%ss-noise%n"
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
  noise.addTrigger(trigger);
}

happyPath();
