import { Logger, LoggerConfig, LoggerConfigReload } from "./util/logger";
import { getDeviceId } from "./util/device-id";
import { getParameter, setParameter } from "./util/parameter";
import { App } from "./app";
import { defaultOptions as defaultVideoOverlayOptions } from "./service/video-overlay";
import { defaultOptions as defaultMotionDetectorOptions } from "./service/motion-detector";
import { defaultOptions as defaultNoiseDetectorOptions } from "./service/noise-detector";
import { defaultOptions as defaultNightVisionOptions } from "./service/night-vision";
import { defaultOptions as defaultDeviceAccessOptions } from "./service/device-access";

const MAX_LOG_LINES = 500;

const logs = document.getElementById("logsPre") as HTMLPreElement;
logs.textContent = "";
LoggerConfig.subscribers.push((...messages: any[]) => {
  logs.textContent += messages.join(" ") + "\n";
  const lines = logs.textContent.split("\n");
  if (lines.length > MAX_LOG_LINES + 1) {
    logs.textContent = lines.slice(-MAX_LOG_LINES - 1).join("\n");
  }
});
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
                inputElement.value = getParameter(
                  parameterKey,
                  defaultValue,
                ) as string;
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
            selectElement.value = getParameter(
              parameterKey,
              defaultValue,
            ) as string;
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
      LoggerConfig.level = (element as HTMLSelectElement).value;
      LoggerConfigReload();
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

function getParameterOrSet<T>(key: string, t: T): T {
  let param = getParameter(key);
  if (!param) {
    param = JSON.stringify(t);
    setParameter(key, param);
  }
  return JSON.parse(param) as T;
}

function initApp() {
  initStaticElements();

  let appOptions = getParameterOrSet<Parameters<App["updateOptions"]>[0]>(
    "appOptions",
    {
      videoOverlay: { ...defaultVideoOverlayOptions, showStats: true },
      motionDetector: defaultMotionDetectorOptions,
      noiseDetector: defaultNoiseDetectorOptions,
      nightVision: defaultNightVisionOptions,
    },
  );
  let activateOptions = getParameterOrSet<
    Omit<Parameters<App["activate"]>[0], "deviceId">
  >("activateOptions", {
    deviceAccess: defaultDeviceAccessOptions,
    continuousRecording: {
      videoBitsPerSecond: 128000,
      audioBitsPerSecond: 64000,
      interval: 60000,
    },
    triggerRecording: {
      videoBitsPerSecond: 512000,
      audioBitsPerSecond: 64000,
      preRollMs: 2000,
      interval: 60000,
      releaseMs: 3000,
      triggers: ["MOTION", "NOISE"],
    },
  });

  const app = new App();
  app.setAudioLevelListener(
    (level) => (elements.audioLevelDiv.style.width = (level * 100) / 255 + "%"),
  );
  elements.audioThresholdDiv.style.width =
    ((appOptions.noiseDetector?.detectionThreshold ??
      defaultNoiseDetectorOptions.detectionThreshold) *
      100) /
      255 +
    "%";
  const videoCanvas = app.getVideoCanvas();
  const motionCanvas = app.getMotionCanvas();
  elements.videoPreviewDiv.appendChild(videoCanvas);
  elements.videoPreviewDiv.appendChild(motionCanvas);
  motionCanvas.classList.add("motion");

  app.updateOptions(appOptions);

  let activated = false;
  initElement("activateButton", async (element) => {
    const buttonElement = element as HTMLButtonElement;
    buttonElement.disabled = true;
    if (activated) {
      logger.info("Deactivating...");
      app.deactivate();
      buttonElement.textContent = "Activate";
      activated = false;
    } else {
      logger.info("Activating...");
      await app.activate({
        deviceId: getDeviceId(),
        ...activateOptions,
      });
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
  (elements.showMotionInput as HTMLInputElement).disabled = !(
    elements.showPreviewInput as HTMLInputElement
  ).checked;

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
