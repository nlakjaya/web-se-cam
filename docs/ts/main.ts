import { getDeviceId } from "./util/device-id";
import { LOGGER, Logger } from "./util/logger";
import { getParameter, setParameter } from "./util/parameter";

import { DeviceAccess } from "./service/device-access";
import { VideoOverlay } from "./service/video-overlay";
import { VideoPipeline } from "./service/video-pipeline";
import { MotionDetector } from "./service/motion-detector";
import { NoiseDetector } from "./service/noise-detector";

const logs = document.getElementById("logsPre") as HTMLPreElement;
logs.textContent = "";
LOGGER.subscribers.push(
  (...messages: any[]) => (logs.textContent += messages.join(" ") + "\n"),
);
const logger = new Logger("App");

const elements: { [elementId: string]: HTMLElement } = {};
function initElement(
  elementId: string,
  action?: (element: HTMLElement, event: Event) => void,
  parameterKey?: string,
  defaultValue?: string,
): HTMLElement | undefined {
  const element = document.getElementById(elementId);
  if (element) {
    elements[elementId] = element;
    switch (element.nodeName) {
      case "BUTTON": {
        const buttonElement = element as HTMLButtonElement;
        buttonElement.disabled = false;
        if (action) {
          element.addEventListener("click", (event) => {
            action(element, event);
          });
        }
        return element;
      }
      case "INPUT": {
        const inputElement = element as HTMLInputElement;
        inputElement.disabled = false;
        if (parameterKey) {
          element.addEventListener("change", (event) => {
            setParameter(parameterKey, `${inputElement.checked}`);
          });
          if (defaultValue) {
            switch (inputElement.type) {
              case "checkbox":
                inputElement.checked =
                  getParameter(parameterKey, defaultValue) == "true";
                break;
              default:
                inputElement.value = getParameter(parameterKey, defaultValue);
            }
          }
        }
        if (action) {
          action(element, new Event("change"));
          element.addEventListener("change", (event) => {
            action(element, event);
          });
        }
        return element;
      }
      case "SELECT": {
        const selectElement = element as HTMLSelectElement;
        selectElement.disabled = false;
        if (parameterKey) {
          element.addEventListener("change", (event) => {
            setParameter(parameterKey, `${selectElement.value}`);
          });
          if (defaultValue) {
            selectElement.value = getParameter(parameterKey, defaultValue);
          }
        }
        if (action) {
          action(element, new Event("change"));
          element.addEventListener("change", (event) => {
            action(element, event);
          });
        }
        return element;
      }
    }
    return element;
  }
  return;
}

function initStaticElements() {
  initElement("logs");
  initElement(
    "logsLevelSelect",
    (element) => {
      LOGGER.level = (element as HTMLSelectElement).value;
      LOGGER.reload();
    },
    "logsLevel",
    "INFO",
  );
  initElement("videoPreviewDiv");
  initElement("audioPreviewDiv");
  initElement("audioThresholdDiv");
  initElement("audioLevelDiv");
  initElement("deviceIdInput", undefined, "deviceId", getDeviceId());
  initElement(
    "showPreviewInput",
    (element) => {
      [elements.videoPreviewDiv, elements.audioPreviewDiv].forEach(
        (previewDiv) =>
          (previewDiv.style.display = (element as HTMLInputElement).checked
            ? "inherit"
            : "none"),
      );
      if (elements.showMotionInput) {
        (elements.showMotionInput as HTMLInputElement).disabled = !(
          element as HTMLInputElement
        ).checked;
      }
    },
    "showPreview",
    "true",
  );
  initElement(
    "showLogsInput",
    (element) =>
      (elements.logs.style.display = (element as HTMLInputElement).checked
        ? "inherit"
        : "none"),
    "showLogs",
    "true",
  );
  initElement("installButton");
}

function initApp() {
  initStaticElements();

  const deviceAccess = new DeviceAccess();
  const videoPipeline = new VideoPipeline();
  const videoOverlay = new VideoOverlay();
  const motionDetector = new MotionDetector();
  const noiseDetector = new NoiseDetector();

  videoPipeline.addLayer(motionDetector);
  videoPipeline.addLayer(videoOverlay);

  const videoCanvas = videoPipeline.getCanvasElement();
  videoCanvas.classList.add("video");
  const motionCanvas = motionDetector.getCanvasElement();
  motionCanvas.classList.add("motion");
  elements.videoPreviewDiv.appendChild(videoCanvas);
  elements.videoPreviewDiv.appendChild(motionCanvas);

  let activated = false;

  initElement("activateButton", async (element) => {
    const buttonElement = element as HTMLButtonElement;
    buttonElement.disabled = true;
    if (activated) {
      logger.info("Deactivating...");

      deviceAccess.stop();
      videoPipeline.clearCanvas();
      motionDetector.clearHistory();

      buttonElement.textContent = "Activate";
      activated = false;
    } else {
      logger.info("Activating...");

      const mediaStream = await deviceAccess.start();
      videoPipeline.setMediaStream(mediaStream);
      noiseDetector.setMediaStream(mediaStream);

      function levelIndicatorAnimator() {
        elements.audioLevelDiv.style.width =
          (noiseDetector.peakLevel * 100) / 255 + "%";
        if (!mediaStream.active) {
          logger.debug("level indicator: stopped");
          elements.audioLevelDiv.style.width = "0%";
          return;
        }
        requestAnimationFrame(levelIndicatorAnimator);
      }
      levelIndicatorAnimator();

      buttonElement.textContent = "Deactivate";
      activated = true;
    }
    buttonElement.disabled = false;
  });

  initElement(
    "showMotionInput",
    (element) =>
      (motionCanvas.style.display = (element as HTMLInputElement).checked
        ? "inherit"
        : "none"),
    "showMotion",
    "true",
  );

  initElement(
    "autoActivateInput",
    (element) => {
      if ((element as HTMLInputElement).checked && !activated) {
        elements.activateButton.click();
      }
    },
    "autoActivate",
    "false",
  );

  logger.info("initialized");
}

initApp();

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

function setupAppInstall(event: BeforeInstallPromptEvent) {
  logger.debug("not installed yet");
  elements.installButton.style.display = "inline-block";
  elements.installButton.addEventListener("click", async () => {
    logger.info("Installing...");
    event.prompt();
    const userChoice = await event.userChoice;
    elements.installButton.style.display = "none";
    logger.debug("install prompt:", userChoice);
    logger.info("Install:", userChoice.outcome);
  });
}

if ("beforeInstallPromptEvent" in window) {
  setupAppInstall((window as any).beforeInstallPromptEvent);
  window.addEventListener("beforeinstallprompt", (event) =>
    setupAppInstall(event as BeforeInstallPromptEvent),
  );
}
