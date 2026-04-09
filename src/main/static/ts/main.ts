import { Logger, LoggerConfig, LoggerConfigReload } from "./util/logger";
import { getDeviceId } from "./util/device-id";
import { getParameter, setParameter } from "./util/parameter";
import { ActivateOptions, App, AppOptions, Stats } from "./app";
import { defaultOptions as defaultVideoOverlayOptions } from "./service/video-overlay";
import { defaultOptions as defaultMotionDetectorOptions } from "./service/motion-detector";
import { defaultOptions as defaultNoiseDetectorOptions } from "./service/noise-detector";
import { defaultOptions as defaultNightVisionOptions } from "./service/night-vision";
import { defaultOptions as defaultDeviceAccessOptions } from "./service/device-access";
import { GoogleClient } from "./service/google/client";
import { GoogleDrive } from "./service/google/drive";
import { GoogleSheet } from "./service/google/sheet";
import { Storage } from "./service/storage";
import { Uploader } from "./service/uploader";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

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
  initElement("screenLockButton", () => lockScreen());
  initElement("screenLockDiv");
  initElement("screenLockThumbDiv");

  const screenLockStates = {
    isDragging: false,
    startX: 0,
    currentX: 0,
  };
  elements.screenLockThumbDiv.addEventListener("pointerdown", (event) => {
    screenLockStates.isDragging = true;
    screenLockStates.startX = event.clientX;
    elements.screenLockThumbDiv.setPointerCapture(event.pointerId);
  });
  elements.screenLockThumbDiv.addEventListener("pointermove", (event) => {
    if (!screenLockStates.isDragging) return;
    const dX = event.clientX - screenLockStates.startX;
    const dOffset =
      (elements.screenLockThumbDiv.parentElement as HTMLElement).offsetWidth -
      elements.screenLockThumbDiv.offsetWidth;
    screenLockStates.currentX = Math.max(0, Math.min(dX, dOffset));
    elements.screenLockThumbDiv.style.transform = `translateX(${screenLockStates.currentX}px)`;
  });
  elements.screenLockThumbDiv.addEventListener("pointerup", () => {
    screenLockStates.isDragging = false;
    const dOffset =
      (elements.screenLockThumbDiv.parentElement as HTMLElement).offsetWidth -
      elements.screenLockThumbDiv.offsetWidth;
    if (screenLockStates.currentX >= dOffset * 0.95) {
      unlockScreen();
    } else {
      const animationMs = 300;
      elements.screenLockThumbDiv.style.transition = `transform ${animationMs}ms ease`;
      setTimeout(() => {
        elements.screenLockThumbDiv.style.transition = "";
      }, animationMs);
    }
    elements.screenLockThumbDiv.style.transform = "translateX(0)";
  });

  if ("beforeInstallPromptEvent" in window) {
    setupAppInstall((window as any).beforeInstallPromptEvent);
    window.addEventListener("beforeinstallprompt", (event) =>
      setupAppInstall(event as BeforeInstallPromptEvent),
    );
  }
}

function lockScreen() {
  elements.screenLockDiv.style.display = "flex";
  elements.screenLockDiv.style.opacity = "1";
}

function unlockScreen() {
  const animationMs = 400;
  setTimeout(() => {
    elements.screenLockDiv.style.display = "none";
  }, animationMs);
  elements.screenLockDiv.style.transition = `opacity ${animationMs}ms ease`;
  elements.screenLockDiv.style.opacity = "0";
}

function getParameterOrSet<T>(key: string, t: T): T {
  let param = getParameter(key);
  if (!param) {
    param = JSON.stringify(t);
    setParameter(key, param);
  }
  return JSON.parse(param) as T;
}

export type GoogleSettings = Omit<
  Parameters<GoogleClient["updateOptions"]>[0],
  "renewTokenEvent" | "scopes" | "token"
> & { configSheetId: string; configSheetRange: string };

async function getConfigsFromGoogle(): Promise<{
  googleClient?: GoogleClient;
  appOptions?: AppOptions;
  activateOptions?: ActivateOptions;
  googleDriveUploadFolder?: string;
  googleSheetStats?: { id: string; range: string };
}> {
  const configs: any = {};
  const googleSettings = getParameterOrSet<GoogleSettings>(
    "googleSettings",
    {} as GoogleSettings,
  );
  if (googleSettings.clientId) {
    const googleClient = new GoogleClient(googleSettings.clientId, [
      "drive",
      "spreadsheets",
    ]);
    configs.googleClient = googleClient;
    googleClient.updateOptions({
      login_hint: googleSettings.login_hint,
      renewTokenEvent: (token) => {
        setParameter("googleClientToken", JSON.stringify(token));
      },
      token: getParameterOrSet("googleClientToken", { bearer: "", expiry: 0 }),
    });

    const googleSheetConfigs = new GoogleSheet(
      googleClient,
      googleSettings.configSheetId,
    );
    const configsSheetData = await googleSheetConfigs.read(
      googleSettings.configSheetRange,
    );

    configsSheetData.forEach(([k, v]) => {
      const ks = k.split(".");
      let obj = configs;
      ks.forEach((k, idx) => {
        if (idx == ks.length - 1) {
          obj[k] = JSON.parse(v);
        } else {
          if (!obj[k]) {
            obj[k] = {};
          }
          obj = obj[k];
        }
      });
    });
  }
  return configs;
}

async function initApp() {
  initStaticElements();

  const storage = new Storage();
  storage.init({
    // TODO: background sync
    // browserStorage: {
    //   appName: "web-se-cam",
    //   storeName: "recordings"
    // }
  });

  let onSave = (filename: string, blob: Blob) => storage.save(filename, blob);
  let onStats = async (stats: Stats) => {
    logger.error("stats:", stats);
  };

  const uploadUrl = getParameter("uploadUrl");
  if (uploadUrl) {
    const uploader = new Uploader(uploadUrl);
    uploader.updateOptions({ fallback: onSave });
    onSave = (filename: string, blob: Blob) => uploader.post(filename, blob);
  }

  const configs = await getConfigsFromGoogle();
  if (configs.appOptions) {
    setParameter("appOptions", JSON.stringify(configs.appOptions));
  }
  if (configs.activateOptions) {
    setParameter("activateOptions", JSON.stringify(configs.activateOptions));
  }

  let googleDrive: GoogleDrive | null = null;
  let googleSheetStats: GoogleSheet | null = null;
  if (configs.googleClient) {
    googleDrive = new GoogleDrive(configs.googleClient);
    if (configs.googleDriveUploadFolder) {
      googleDrive.updateOptions({ parents: [configs.googleDriveUploadFolder] });
    }
    googleDrive.updateOptions({ fallback: onSave });
    onSave = (filename: string, blob: Blob) =>
      (googleDrive as GoogleDrive).upload(filename, blob);
    if (configs.googleSheetStats) {
      googleSheetStats = new GoogleSheet(
        configs.googleClient,
        configs.googleSheetStats.id,
      );
      const range = configs.googleSheetStats.range;
      onStats = async (stats: Stats) => {
        (googleSheetStats as GoogleSheet).append(range, [
          [
            stats.deviceTimestamp,
            stats.status,
            stats.batteryLevel,
            stats.batteryCharging,
            stats.batteryEta,
            stats.frameCount,
            stats.locationTimestamp,
            stats.latitude,
            stats.longitude,
            stats.altitude,
          ],
        ]);
      };
    }
  }

  let appOptions = getParameterOrSet<AppOptions>("appOptions", {
    videoOverlay: { ...defaultVideoOverlayOptions, showStats: true },
    motionDetector: defaultMotionDetectorOptions,
    noiseDetector: defaultNoiseDetectorOptions,
    nightVision: defaultNightVisionOptions,
  });
  let activateOptions = getParameterOrSet<ActivateOptions>("activateOptions", {
    deviceId: getDeviceId(),
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
      triggers: ["motion", "noise"],
    },
  });

  const audioLevelListener = (level: number) =>
    (elements.audioLevelDiv.style.width = (level * 100) / 255 + "%");
  elements.audioThresholdDiv.style.width =
    ((appOptions.noiseDetector?.detectionThreshold ??
      defaultNoiseDetectorOptions.detectionThreshold) *
      100) /
      255 +
    "%";

  const app = new App(onSave, onStats, audioLevelListener);
  const videoCanvas = app.getVideoCanvas();
  const motionCanvas = app.getMotionCanvas();
  elements.videoPreviewDiv.append(videoCanvas, motionCanvas);
  motionCanvas.classList.add("motion");
  if (motionCanvas.checkVisibility === undefined) {
    // polyfill
    motionCanvas.checkVisibility = () =>
      (elements.showMotionInput as HTMLInputElement).checked;
  }

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
      await app.activate(activateOptions);
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

initApp();
