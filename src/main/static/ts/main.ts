import { Logger, LoggerConfig, LoggerConfigReload } from "./util/logger";
import { getDeviceId } from "./util/device-id";
import { getParameter, setParameter } from "./util/parameter";
import { App } from "./app";

const logs = document.getElementById("logsPre") as HTMLPreElement;
logs.textContent = "";
LoggerConfig.subscribers.push(
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

function initApp() {
  initStaticElements();

  let appOptions = getParameter("appOptions");
  if (!appOptions) {
    appOptions = JSON.stringify({
      videoOverlay: { showStats: true, footerText: "WebSeCam © 2026" },
    } as Parameters<App["updateOptions"]>[0]);
    setParameter("appOptions", appOptions);
  }
  let activateOptions = getParameter("activateOptions");
  if (!activateOptions) {
    activateOptions = JSON.stringify({
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
    } as Omit<Parameters<App["activate"]>[0], "deviceId">);
    setParameter("activateOptions", activateOptions);
  }

  const app = new App({
    uploadUrl: "/upload",
  });
  app.setAudioLevelListener(
    (level) => (elements.audioLevelDiv.style.width = (level * 100) / 255 + "%"),
  );
  const videoCanvas = app.getVideoCanvas();
  const motionCanvas = app.getMotionCanvas();
  elements.videoPreviewDiv.appendChild(videoCanvas);
  elements.videoPreviewDiv.appendChild(motionCanvas);
  motionCanvas.classList.add("motion");

  app.updateOptions(JSON.parse(appOptions));

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
        ...JSON.parse(activateOptions),
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
