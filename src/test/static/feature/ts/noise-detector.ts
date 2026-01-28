// @ts-expect-error
import { DeviceAccess } from "../../../ts/service/device-access";
// @ts-expect-error
import { NoiseDetector } from "../../../ts/service/noise-detector";
import { sleep } from "../../ts/base";

const app = document.getElementById("app");

// class PeekDetector extends AudioWorkletProcessor { }

async function happyPath() {
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

  const devices = new DeviceAccess();
  const noise = new NoiseDetector();

  let triggerCounter = 0;
  const triggerCounterElement = document.createElement("p");
  const trigger = () => {
    triggerCounter++;
    triggerCounterElement.textContent = `Trigger Counter: ${triggerCounter} buffers`;
  };
  noise.addTrigger(trigger);

  if (app) {
    app.appendChild(levelIndicator);
    app.appendChild(triggerCounterElement);
  }

  devices.updateOptions({
    audio: {
      autoGainControl: false,
      echoCancellation: false,
      noiseSuppression: false,
    },
  });
  const mediaStream = await devices.start();
  noise.setMediaStream(mediaStream);

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

happyPath();
